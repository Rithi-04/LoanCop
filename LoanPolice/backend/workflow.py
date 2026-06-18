import json
import os
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, START, END
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from sqlalchemy.orm import Session
from pypdf import PdfReader

import config
import models
import database

# 1. State Definition
class LoanWorkflowState(TypedDict):
    application_id: int
    application_data: Dict[str, Any]
    document_paths: List[str]
    extracted_doc_info: Dict[str, Any]
    eligibility_results: Dict[str, Any]
    credit_risk_results: Dict[str, Any]
    policy_citations: List[Dict[str, Any]]
    final_decision: Dict[str, Any]
    errors: List[str]


# 2. Node Implementations

def document_processing_node(state: LoanWorkflowState) -> Dict[str, Any]:
    """
    Document Processing Agent:
    Validates uploaded files and uses LLM to parse/extract information from documents.
    """
    app_id = state["application_id"]
    paths = state["document_paths"]
    app_data = state["application_data"]
    extracted = {"verified_documents": [], "warnings": [], "extracted_details": {}}
    errors = []

    print(f"[Agent: Document Processing] Checking docs for app {app_id}...")

    if not paths:
        extracted["warnings"].append("No documents uploaded by the applicant.")
    else:
        # Simple extraction logic: Read text from documents and ask LLM to extract names/incomes/IDs
        text_content = ""
        for path in paths:
            if not os.path.exists(path):
                continue
            filename = os.path.basename(path)
            extracted["verified_documents"].append(filename)
            
            try:
                # If PDF, read first 2 pages
                if path.lower().endswith(".pdf"):
                    reader = PdfReader(path)
                    for i in range(min(2, len(reader.pages))):
                        text_content += f"\n--- Document: {filename} Page {i+1} ---\n"
                        text_content += reader.pages[i].extract_text()
                else:
                    # Treat as text
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        text_content += f"\n--- Document: {filename} ---\n"
                        text_content += f.read(2000)
            except Exception as e:
                extracted["warnings"].append(f"Failed to read file {filename}: {e}")

        # If text content was successfully extracted, use LLM to summarize/verify key details
        if text_content and config.LLM_API_KEY and config.LLM_API_KEY != "your_openai_api_key_here":
            try:
                llm = ChatOpenAI(
                    model=config.LLM_MODEL,
                    temperature=0,
                    openai_api_key=config.LLM_API_KEY,
                    openai_api_base=config.LLM_API_BASE
                )
                prompt = (
                    "You are a document verification expert. Analyze the following document text extracts and extract:\n"
                    "1. Candidate Name (if present)\n"
                    "2. Document IDs (KYC details: PAN, Aadhaar, Passport, etc.)\n"
                    "3. Monthly or annual income statements (if present)\n"
                    "4. Compare these with the self-reported application details: "
                    f"Annual Income: {app_data.get('annual_income')}, Purpose: {app_data.get('purpose')}.\n"
                    "State if there is any mismatch.\n\n"
                    f"Document Text:\n{text_content}"
                )
                response = llm.invoke(prompt)
                extracted["extracted_details"] = {"llm_summary": response.content}
            except Exception as e:
                extracted["warnings"].append(f"LLM verification failed: {e}")
                errors.append(f"LLM verification failed: {e}")
        else:
            extracted["extracted_details"] = {"summary": "Manual review recommended. OpenAI key missing or no text extracted."}

    return {"extracted_doc_info": extracted, "errors": errors}


def eligibility_node(state: LoanWorkflowState) -> Dict[str, Any]:
    """
    Eligibility Agent:
    Validates basic application parameters against standard lending rules.
    """
    app_data = state["application_data"]
    results = {"status": "Eligible", "reasons": []}
    
    print(f"[Agent: Eligibility] Running eligibility checks...")
    
    # 1. Credit Score Threshold
    credit_score = app_data.get("credit_score", 0)
    if credit_score < 600:
        results["status"] = "Ineligible"
        results["reasons"].append(f"Credit score {credit_score} is below the absolute minimum requirement of 600.")
        
    # 2. Income Check
    income = app_data.get("annual_income", 0.0)
    if income < 12000:  # e.g., $12k or INR 12k/month minimum
        results["status"] = "Ineligible"
        results["reasons"].append(f"Annual income of {income} is below the minimum required limit.")
        
    # 3. Employment status check
    emp_status = app_data.get("employment_status", "").lower()
    if emp_status not in ["employed", "self-employed", "salaried", "business owner"]:
        results["status"] = "Ineligible"
        results["reasons"].append(f"Employment status '{app_data.get('employment_status')}' does not meet standard eligibility.")

    if not results["reasons"]:
        results["reasons"].append("Applicant meets all basic credit score, income, and employment requirements.")

    return {"eligibility_results": results}


def credit_risk_node(state: LoanWorkflowState) -> Dict[str, Any]:
    """
    Credit Risk Agent:
    Evaluates creditworthiness, debt parameters, and sets a risk tier.
    """
    app_data = state["application_data"]
    credit_score = app_data.get("credit_score", 0)
    amount = app_data.get("amount", 0.0)
    income = app_data.get("annual_income", 1.0)
    
    print(f"[Agent: Credit Risk] Assessing credit risk...")
    
    # Calculate loan-to-income ratio (LTI)
    lti = amount / income
    
    # Determine risk tier based on credit score
    if credit_score >= 750:
        risk_tier = "Low"
    elif credit_score >= 650:
        risk_tier = "Medium"
    else:
        risk_tier = "High"
        
    # Escalation: If LTI is high (> 5.0), risk increases by one level
    reasons = []
    if lti > 5.0:
        reasons.append(f"High Loan-to-Income ratio of {lti:.2f} (exceeds threshold of 5.0).")
        if risk_tier == "Low":
            risk_tier = "Medium"
        elif risk_tier == "Medium":
            risk_tier = "High"
            
    reasons.append(f"Credit score of {credit_score} places applicant in the {risk_tier} risk bracket.")
    reasons.append(f"Loan-to-Income ratio is {lti:.2f}.")

    risk_results = {
        "risk_tier": risk_tier,
        "lti_ratio": lti,
        "reasons": reasons
    }
    
    return {"credit_risk_results": risk_results}


def policy_retrieval_node(state: LoanWorkflowState) -> Dict[str, Any]:
    """
    Policy Retrieval Agent:
    Retrieves internal documents from ChromaDB matching application criteria.
    """
    app_data = state["application_data"]
    citations = []
    
    print(f"[Agent: Policy Retrieval] Querying ChromaDB policies...")
    
    query = (
        f"Loan amount of {app_data.get('amount')} for purpose '{app_data.get('purpose')}' "
        f"with credit score of {app_data.get('credit_score')} and employment status {app_data.get('employment_status')}."
    )
    
    if config.OPENAI_API_KEY and config.OPENAI_API_KEY != "your_openai_api_key_here":
        try:
            # Connect to ChromaDB
            if os.path.exists(config.CHROMA_DB_DIR) and os.listdir(config.CHROMA_DB_DIR):
                embeddings = config.get_embeddings()
                db = Chroma(
                    persist_directory=str(config.CHROMA_DB_DIR),
                    embedding_function=embeddings,
                    collection_name="loan_policies"
                )
                
                # Query documents (including internal documents since this is backend processing)
                docs = db.similarity_search(query, k=3)
                for doc in docs:
                    citations.append({
                        "source": doc.metadata.get("source", "Unknown Policy Document"),
                        "content": doc.page_content[:500] + "..."  # Truncate content for graph state brevity
                    })
            else:
                citations.append({
                    "source": "System Warning",
                    "content": "ChromaDB vector store is empty. Please run 'ingest_policies.py'."
                })
        except Exception as e:
            citations.append({
                "source": "Error",
                "content": f"ChromaDB retrieval failed: {e}"
            })
    else:
        citations.append({
            "source": "System Warning",
            "content": "OpenAI API Key is missing. Skipping policy vector retrieval."
        })
        
    return {"policy_citations": citations}


def decision_node(state: LoanWorkflowState) -> Dict[str, Any]:
    """
    Decision Agent:
    Evaluates outputs of all agents and policies to determine the final decision
    (Approve, Reject, or Refer to Officer) and builds a detailed AI summary.
    """
    app_data = state["application_data"]
    eligibility = state["eligibility_results"]
    risk = state["credit_risk_results"]
    policies = state["policy_citations"]
    
    print(f"[Agent: Decision] Synthesizing recommendation...")
    
    # 1. Rules-based baseline decision
    if eligibility.get("status") == "Ineligible":
        suggested_decision = "Reject"
        summary_intro = "The AI model recommends Rejecting this loan application due to failure in meeting basic eligibility criteria."
    elif risk.get("risk_tier") == "High":
        suggested_decision = "Reject"
        summary_intro = "The AI model recommends Rejecting this loan application due to a High-risk credit profile."
    elif risk.get("risk_tier") == "Medium":
        suggested_decision = "Refer"
        summary_intro = "The AI model recommends Referring this loan application to an officer for manual review due to a Medium-risk credit profile."
    else:
        suggested_decision = "Approve"
        summary_intro = "The AI model recommends Approving this loan application. The customer has a Low-risk profile and meets all eligibility rules."

    # 2. Call LLM to synthesize final professional summary
    ai_summary = ""
    if config.LLM_API_KEY and config.LLM_API_KEY != "your_openai_api_key_here":
        try:
            llm = ChatOpenAI(
                model=config.LLM_MODEL,
                temperature=0.2,
                openai_api_key=config.LLM_API_KEY,
                openai_api_base=config.LLM_API_BASE
            )
            
            prompt = (
                "You are an expert Credit Committee Director. Create a professional loan assessment summary "
                "based on the following agent outputs:\n\n"
                f"Application Data: {json.dumps(app_data)}\n"
                f"Eligibility Check: {json.dumps(eligibility)}\n"
                f"Credit Risk Analysis: {json.dumps(risk)}\n"
                f"Policy Citations: {json.dumps(policies)}\n\n"
                f"Drafted Recommendation: {suggested_decision}\n\n"
                "Write a clear, structured summary containing:\n"
                "1. Executive Eligibility Summary\n"
                "2. Risk & Financial Assessment\n"
                "3. Policy Compliance Check\n"
                "4. Final AI Recommendation (Approve, Reject, or Refer) and key reasons."
            )
            response = llm.invoke(prompt)
            ai_summary = response.content
        except Exception as e:
            ai_summary = f"{summary_intro}\n\nAI Summary synthesis failed: {e}\nEligibility: {eligibility.get('reasons')}\nRisk: {risk.get('reasons')}"
    else:
        eligibility_reasons = "\n- ".join(eligibility.get("reasons", []))
        risk_reasons = "\n- ".join(risk.get("reasons", []))
        ai_summary = (
            f"### AI Evaluation Summary\n"
            f"**Recommendation**: {suggested_decision}\n\n"
            f"**Eligibility Check**:\n- {eligibility_reasons}\n\n"
            f"**Risk Check**:\n- {risk_reasons}\n\n"
            f"*Note: Detailed LLM-based summary was skipped because the OpenAI API Key is not set.*"
        )

    final_decision = {
        "decision": suggested_decision,
        "summary": ai_summary
    }

    return {"final_decision": final_decision}


# 3. Create the LangGraph Workflow
workflow = StateGraph(LoanWorkflowState)

# Add Nodes
workflow.add_node("document_processing", document_processing_node)
workflow.add_node("eligibility", eligibility_node)
workflow.add_node("credit_risk", credit_risk_node)
workflow.add_node("policy_retrieval", policy_retrieval_node)
workflow.add_node("decision", decision_node)

# Add Edges
workflow.add_edge(START, "document_processing")
workflow.add_edge("document_processing", "eligibility")
workflow.add_edge("eligibility", "credit_risk")
workflow.add_edge("credit_risk", "policy_retrieval")
workflow.add_edge("policy_retrieval", "decision")
workflow.add_edge("decision", END)

# Compile Graph
app_graph = workflow.compile()


# 4. Helper function to execute the graph and save evaluation logs in the DB
def run_loan_evaluation_workflow(db: Session, application: models.LoanApplication) -> models.LoanApplication:
    """
    Runs the LangGraph workflow on the loan application, records intermediate agent steps
    in ai_evaluation_logs, and updates the application with final values.
    """
    # 1. Fetch related documents
    documents = db.query(models.Document).filter(models.Document.application_id == application.id).all()
    doc_paths = [doc.file_path for doc in documents]

    # 2. Build initial state
    initial_state = {
        "application_id": application.id,
        "application_data": {
            "amount": application.amount,
            "purpose": application.purpose,
            "annual_income": application.annual_income,
            "credit_score": application.credit_score,
            "employment_status": application.employment_status
        },
        "document_paths": doc_paths,
        "extracted_doc_info": {},
        "eligibility_results": {},
        "credit_risk_results": {},
        "policy_citations": [],
        "final_decision": {},
        "errors": []
    }

    # 3. Run agents and save intermediate output logs
    current_state = initial_state
    
    # We can run the graph step-by-step or run it all at once and log each agent's results.
    # To log intermediate states accurately to the DB, we can run the nodes one by one 
    # or extract the execution path from the run. Let's run the nodes step by step manually or
    # run the full compiled graph, since we know each node produces updates.
    # Running the graph all at once is standard, then we inspect the final result.
    # To write logs for each agent, let's execute the graph and log the output:
    try:
        final_state = app_graph.invoke(initial_state)
        
        # Log Document Processing Agent
        db.add(models.AIEvaluationLog(
            application_id=application.id,
            agent_name="Document Processing Agent",
            status="Success" if not any("document" in e.lower() for e in final_state["errors"]) else "Failed",
            log_details=json.dumps(final_state["extracted_doc_info"])
        ))
        
        # Log Eligibility Agent
        db.add(models.AIEvaluationLog(
            application_id=application.id,
            agent_name="Eligibility Agent",
            status="Success",
            log_details=json.dumps(final_state["eligibility_results"])
        ))
        
        # Log Credit Risk Agent
        db.add(models.AIEvaluationLog(
            application_id=application.id,
            agent_name="Credit Risk Agent",
            status="Success",
            log_details=json.dumps(final_state["credit_risk_results"])
        ))
        
        # Log Policy Retrieval Agent
        db.add(models.AIEvaluationLog(
            application_id=application.id,
            agent_name="Policy Retrieval Agent",
            status="Success",
            log_details=json.dumps(final_state["policy_citations"])
        ))
        
        # Log Decision Agent
        db.add(models.AIEvaluationLog(
            application_id=application.id,
            agent_name="Decision Agent",
            status="Success",
            log_details=json.dumps(final_state["final_decision"])
        ))

        # Update loan application fields
        application.ai_eligibility_status = final_state["eligibility_results"].get("status")
        application.ai_credit_risk_rating = final_state["credit_risk_results"].get("risk_tier")
        application.ai_decision = final_state["final_decision"].get("decision")
        application.ai_summary = final_state["final_decision"].get("summary")
        
        # Log system audit event
        db.add(models.AuditLog(
            application_id=application.id,
            action="AI_EVALUATED",
            performed_by=application.customer_id,  # Run automatically on behalf of submission
            comments=f"AI workflow executed. Suggested Decision: {application.ai_decision}"
        ))
        
        db.commit()
        db.refresh(application)
        
    except Exception as e:
        db.rollback()
        print(f"Error executing LangGraph: {e}")
        # Log execution failure
        db.add(models.AIEvaluationLog(
            application_id=application.id,
            agent_name="Workflow Scheduler",
            status="Failed",
            log_details=f"LangGraph execution crashed: {e}"
        ))
        db.commit()
        
    return application
