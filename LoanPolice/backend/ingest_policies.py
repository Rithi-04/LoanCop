import os
import sys
from pathlib import Path

# Add backend directory to sys.path to resolve local imports when run from root
backend_dir = str(Path(__file__).resolve().parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

import config

def ingest_all_policies():
    print("Initializing ingestion workflow...")
    
    # 1. Verify Embedding Key
    if not config.EMBEDDING_API_KEY or config.EMBEDDING_API_KEY == "your_openai_api_key_here":
        print("Error: EMBEDDING_API_KEY is not configured in the .env file.")
        print("Please edit .env and configure the key before running the ingestion script.")
        sys.exit(1)
        
    kb_path = config.KNOWLEDGE_BASE_DIR
    if not kb_path.exists():
        print(f"Error: Knowledgebase path {kb_path} does not exist.")
        sys.exit(1)
        
    pdf_files = list(kb_path.glob("*.pdf"))
    docx_files = list(kb_path.glob("*.docx"))
    all_files = pdf_files + docx_files
    if not all_files:
        print(f"No PDF or DOCX files found in {kb_path}")
        sys.exit(0)
        
    print(f"Found {len(all_files)} documents to ingest ({len(pdf_files)} PDF, {len(docx_files)} DOCX).")
    
    # Initialize Text Splitter
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    
    all_chunks = []
    
    # 2. Load and split each document
    from langchain_core.documents import Document
    import zipfile
    import xml.etree.ElementTree as ET

    for file_path in all_files:
        filename = file_path.name
        print(f"Loading and processing {filename}...")
        try:
            if file_path.suffix.lower() == ".pdf":
                loader = PyPDFLoader(str(file_path))
                docs = loader.load()
            elif file_path.suffix.lower() == ".docx":
                with zipfile.ZipFile(file_path) as docx_zip:
                    xml_content = docx_zip.read('word/document.xml')
                root = ET.fromstring(xml_content)
                ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                
                # Extract text grouped by paragraphs
                paragraphs = []
                p_elements = root.findall('.//w:p', ns)
                for p_elem in p_elements:
                    p_text_parts = []
                    for t_elem in p_elem.findall('.//w:t', ns):
                        if t_elem.text:
                            p_text_parts.append(t_elem.text)
                    p_text = "".join(p_text_parts).strip()
                    if p_text:
                        paragraphs.append(p_text)
                
                docx_text = "\n\n".join(paragraphs)
                docs = [Document(page_content=docx_text, metadata={"source": filename})]
            else:
                continue
            
            # Split documents
            chunks = text_splitter.split_documents(docs)
            print(f"  Split into {len(chunks)} chunks.")
            
            # Normalize metadata source path to just the file name
            for chunk in chunks:
                chunk.metadata["source"] = filename
                
            all_chunks.extend(chunks)
        except Exception as e:
            print(f"Error processing {filename}: {e}")
            
    if not all_chunks:
        print("No document chunks to ingest. Exiting.")
        return
        
    print(f"Total chunks to embed and store: {len(all_chunks)}")
    
    # 3. Embed and store in ChromaDB
    print("Generating embeddings and writing to ChromaDB (this may take a moment)...")
    try:
        embeddings = config.get_embeddings()
        vectorstore = Chroma.from_documents(
            documents=all_chunks,
            embedding=embeddings,
            persist_directory=str(config.CHROMA_DB_DIR),
            collection_name="loan_policies"
        )
        print("ChromaDB vector store successfully created/updated!")
    except Exception as e:
        print(f"Failed to create/update vector store: {e}")
        sys.exit(1)

if __name__ == "__main__":
    ingest_all_policies()
