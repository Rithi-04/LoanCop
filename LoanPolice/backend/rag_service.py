import os
from typing import Dict, Any, List
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Chroma
from openai import OpenAI

import config

def get_vectorstore():
    # Verify vector db exists
    if not os.path.exists(config.CHROMA_DB_DIR) or not os.listdir(config.CHROMA_DB_DIR):
        raise ValueError("ChromaDB vector store is empty. Please run the ingestion script 'ingest_policies.py' first.")
        
    embeddings = config.get_embeddings()
    return Chroma(
        persist_directory=str(config.CHROMA_DB_DIR),
        embedding_function=embeddings,
        collection_name="loan_policies"
    )

def query_rag_knowledgebase(query: str, role: str) -> Dict[str, Any]:
    """
    Query the knowledge base using RAG.
    Customer: restricted to public documents (Customer_General_Faqs, Fair_Lending_Practices_Rbi, KYC_Documentation_Rules).
    Loan Officer / Manager: allowed access to all documents.
    """
    if not config.LLM_API_KEY or config.LLM_API_KEY == "your_openai_api_key_here":
        return {
            "answer": "Error: LLM API Key is not configured. Please add it to the .env file.",
            "sources": []
        }

    try:
        db = get_vectorstore()
    except Exception as e:
        return {
            "answer": f"Error: Vector database not initialized. Details: {e}",
            "sources": []
        }

    # Determine metadata filters based on Role
    customer_safe_docs = [
        "Customer_General_Faqs.pdf",
        "Fair_Lending_Practices_Rbi.pdf",
        "KYC_Documentation_Rules.pdf",
        "Indus_Pride_Bank_Loan_Policy_Manual.docx"
    ]
    
    search_kwargs = {"k": 6}
    if role == "Customer":
        # Filter: only customer safe documents
        search_kwargs["filter"] = {"source": {"$in": customer_safe_docs}}

    # Perform similarity search
    try:
        docs = db.similarity_search(query, **search_kwargs)
    except Exception as e:
        return {
            "answer": f"Error searching vector store: {e}",
            "sources": []
        }

    if not docs:
        return {
            "answer": "I could not find any information in the policy database matching your request.",
            "sources": []
        }

    # Format context and track unique sources
    context_parts = []
    sources = set()
    for doc in docs:
        src = doc.metadata.get("source", "Unknown Policy File")
        sources.add(src)
        context_parts.append(f"Source: {src}\nContent: {doc.page_content}\n")
        
    context_text = "\n---\n".join(context_parts)

    # Call OpenAI API to generate response
    client = OpenAI(
        api_key=config.LLM_API_KEY,
        base_url=config.LLM_API_BASE
    )
    
    system_prompt = (
        "You are Lend.AI, an AI Loan Approval Assistant. Answer the user's questions about loan policies.\n"
        "For general greetings, system introduction, or polite conversational queries (like 'hello', 'how are you', or 'who are you'), "
        "reply politely and introduce yourself as Lend.AI assistant.\n"
        "For specific policy queries, answer the user's question accurately using ONLY the provided "
        "policy context below. If the context does not contain the answer, politely state that you cannot find the "
        "information in the policy database.\n\n"
        f"User Role: {role}\n\n"
        f"Policy Context:\n{context_text}"
    )

    try:
        response = client.chat.completions.create(
            model=config.LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            temperature=0.2
        )
        answer = response.choices[0].message.content
        return {
            "answer": answer,
            "sources": list(sources)
        }
    except Exception as e:
        return {
            "answer": f"Error invoking LLM: {e}",
            "sources": list(sources)
        }
