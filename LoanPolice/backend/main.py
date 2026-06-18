import os
import sys
from pathlib import Path

# Add backend directory to sys.path to resolve local imports when run from root
backend_dir = str(Path(__file__).resolve().parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from typing import List
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func

import config
import models
import schemas
import security
import rag_service
import workflow
from database import engine, Base, get_db

app = FastAPI(
    title="AI Loan Approval Assistant Backend",
    description="Production-style backend with RAG policy retrieval, LangGraph agents, and RBAC.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Startup Event: Create DB tables and Seed Users
@app.on_event("startup")
def startup_db():
    print("Initializing Database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Seed default users
    db = next(get_db())
    try:
        # Check if users already exist
        default_users = [
            ("customer", "customer123", "Customer", "Alice Customer", "customer@example.com"),
            ("officer", "officer123", "LoanOfficer", "Bob Officer", "officer@example.com"),
            ("manager", "manager123", "Manager", "Charlie Manager", "manager@example.com")
        ]
        for username, password, role, full_name, email in default_users:
            exists = db.query(models.User).filter(models.User.username == username).first()
            if not exists:
                hashed = security.get_password_hash(password)
                user = models.User(
                    username=username,
                    password_hash=hashed,
                    role=role,
                    full_name=full_name,
                    email=email
                )
                db.add(user)
                print(f"Seeded user: {username} ({role})")
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()


# ==========================================
# AUTHENTICATION ROUTERS
# ==========================================

@app.post("/api/auth/register", response_model=schemas.UserResponse, tags=["Authentication"])
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # Validate role
    if user_in.role not in ["Customer", "LoanOfficer", "Manager"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'Customer', 'LoanOfficer', or 'Manager'."
        )
        
    # Check if username exists
    existing = db.query(models.User).filter(models.User.username == user_in.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered."
        )

    hashed_pw = security.get_password_hash(user_in.password)
    db_user = models.User(
        username=user_in.username,
        password_hash=hashed_pw,
        role=user_in.role,
        full_name=user_in.full_name,
        email=user_in.email
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/api/auth/login", response_model=schemas.Token, tags=["Authentication"])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = security.create_access_token(
        data={"sub": user.username, "role": user.role, "user_id": user.id}
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/auth/me", response_model=schemas.UserResponse, tags=["Authentication"])
def get_current_user_profile(current_user: models.User = Depends(security.get_current_user)):
    return current_user


# ==========================================
# CUSTOMER ROUTERS
# ==========================================

@app.post("/api/customer/loans", response_model=schemas.CustomerLoanApplicationResponse, tags=["Customer Features"])
def submit_loan_application(
    loan_in: schemas.LoanApplicationCreate,
    current_user: models.User = Depends(security.require_customer),
    db: Session = Depends(get_db)
):
    # Create new loan application
    app_db = models.LoanApplication(
        customer_id=current_user.id,
        amount=loan_in.amount,
        purpose=loan_in.purpose,
        annual_income=loan_in.annual_income,
        credit_score=loan_in.credit_score,
        employment_status=loan_in.employment_status,
        status="Pending"
    )
    db.add(app_db)
    db.commit()
    db.refresh(app_db)

    # Log action
    db.add(models.AuditLog(
        application_id=app_db.id,
        action="SUBMITTED",
        performed_by=current_user.id,
        comments="Loan application submitted by customer."
    ))
    db.commit()

    # Trigger LangGraph Workflow evaluation
    app_db = workflow.run_loan_evaluation_workflow(db, app_db)
    return app_db


@app.post("/api/customer/loans/{loan_id}/documents", response_model=schemas.DocumentResponse, tags=["Customer Features"])
def upload_loan_document(
    loan_id: int,
    doc_type: str = Form(..., description="E.g., KYC, IncomeProof, CollateralProof"),
    file: UploadFile = File(...),
    current_user: models.User = Depends(security.require_customer),
    db: Session = Depends(get_db)
):
    # Verify loan belongs to customer
    loan = db.query(models.LoanApplication).filter(
        models.LoanApplication.id == loan_id,
        models.LoanApplication.customer_id == current_user.id
    ).first()
    
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan application not found or unauthorized access."
        )

    # Create local filename and save
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    clean_filename = f"{loan_id}_{timestamp}_{file.filename}"
    file_path = config.UPLOAD_DIR / clean_filename

    try:
        with open(file_path, "wb") as f:
            f.write(file.file.read())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded document: {e}"
        )

    # Add to database
    doc_db = models.Document(
        application_id=loan_id,
        filename=file.filename,
        file_path=str(file_path),
        doc_type=doc_type
    )
    db.add(doc_db)
    db.commit()
    db.refresh(doc_db)

    # Log document upload audit
    db.add(models.AuditLog(
        application_id=loan_id,
        action="DOCUMENT_UPLOADED",
        performed_by=current_user.id,
        comments=f"Document {file.filename} uploaded ({doc_type})."
    ))
    db.commit()

    # Re-run AI LangGraph Workflow evaluation now that new documents are available
    workflow.run_loan_evaluation_workflow(db, loan)
    
    return doc_db


@app.get("/api/customer/loans", response_model=List[schemas.CustomerLoanApplicationResponse], tags=["Customer Features"])
def list_customer_loans(
    current_user: models.User = Depends(security.require_customer),
    db: Session = Depends(get_db)
):
    loans = db.query(models.LoanApplication).filter(models.LoanApplication.customer_id == current_user.id).all()
    return loans


@app.post("/api/customer/chat", response_model=schemas.ChatResponse, tags=["Customer Features"])
def customer_rag_chat(
    payload: schemas.ChatRequest,
    current_user: models.User = Depends(security.require_customer)
):
    # Enforce RAG query restricted only to customer-safe docs
    res = rag_service.query_rag_knowledgebase(payload.message, role="Customer")
    return res


# ==========================================
# LOAN OFFICER ROUTERS
# ==========================================

@app.get("/api/officer/loans", response_model=List[schemas.LoanApplicationResponse], tags=["Loan Officer Features"])
def list_officer_loans(
    current_user: models.User = Depends(security.require_officer),
    db: Session = Depends(get_db)
):
    loans = db.query(models.LoanApplication).all()
    return loans


@app.get("/api/officer/loans/{loan_id}", response_model=schemas.LoanApplicationDetailResponse, tags=["Loan Officer Features"])
def get_loan_application_details(
    loan_id: int,
    current_user: models.User = Depends(security.require_officer),
    db: Session = Depends(get_db)
):
    loan = db.query(models.LoanApplication).filter(models.LoanApplication.id == loan_id).first()
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan application not found."
        )
        
    # Hydrate intermediate logs and audits
    ai_logs = db.query(models.AIEvaluationLog).filter(models.AIEvaluationLog.application_id == loan_id).all()
    audit_logs = db.query(models.AuditLog).filter(models.AuditLog.application_id == loan_id).all()
    
    # We populate the fields manually since pydantic schema will read from model
    loan.ai_logs = ai_logs
    loan.audit_logs = audit_logs
    return loan


@app.post("/api/officer/loans/{loan_id}/decision", response_model=schemas.LoanApplicationResponse, tags=["Loan Officer Features"])
def submit_officer_decision(
    loan_id: int,
    payload: schemas.DecisionSubmit,
    current_user: models.User = Depends(security.require_officer),
    db: Session = Depends(get_db)
):
    loan = db.query(models.LoanApplication).filter(models.LoanApplication.id == loan_id).first()
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan application not found."
        )

    # Check override conditions: If officer final status disagrees with AI recommendation
    is_override = False
    ai_recomm = loan.ai_decision  # "Approve", "Reject", "Refer"
    
    if ai_recomm == "Approve" and payload.status == "Rejected":
        is_override = True
    elif ai_recomm == "Reject" and payload.status == "Approved":
        is_override = True
    # If AI said "Refer" and Officer decides, it's not strictly an override, but standard review.
    
    if is_override and not payload.override_reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An override reason must be provided when your decision opposes the AI recommendation."
        )

    loan.status = payload.status
    loan.officer_id = current_user.id
    loan.decision_reason = payload.reason
    
    action_type = "OFFICER_APPROVED" if payload.status == "Approved" else "OFFICER_REJECTED"
    audit_msg = f"Application set to {payload.status} by officer {current_user.username}. Reason: {payload.reason}"

    if is_override:
        loan.override_reason = payload.override_reason
        action_type = "OFFICER_OVERRIDDEN"
        audit_msg += f" (AI recommendation overridden. Reason: {payload.override_reason})"

    db.add(models.AuditLog(
        application_id=loan.id,
        action=action_type,
        performed_by=current_user.id,
        comments=audit_msg
    ))
    db.commit()
    db.refresh(loan)
    return loan


@app.post("/api/officer/chat", response_model=schemas.ChatResponse, tags=["Loan Officer Features"])
def officer_rag_chat(
    payload: schemas.ChatRequest,
    current_user: models.User = Depends(security.require_officer)
):
    # Unrestricted query: allowed search across all internal policies
    res = rag_service.query_rag_knowledgebase(payload.message, role="LoanOfficer")
    return res


# ==========================================
# MANAGER ROUTERS
# ==========================================

@app.get("/api/manager/analytics/stats", response_model=schemas.LoanStatsResponse, tags=["Manager Features"])
def get_approval_statistics(
    current_user: models.User = Depends(security.require_manager),
    db: Session = Depends(get_db)
):
    total = db.query(models.LoanApplication).count()
    pending = db.query(models.LoanApplication).filter(models.LoanApplication.status == "Pending").count()
    approved = db.query(models.LoanApplication).filter(models.LoanApplication.status == "Approved").count()
    rejected = db.query(models.LoanApplication).filter(models.LoanApplication.status == "Rejected").count()
    
    total_approved = db.query(func.sum(models.LoanApplication.amount)).filter(models.LoanApplication.status == "Approved").scalar() or 0.0
    avg_loan = db.query(func.avg(models.LoanApplication.amount)).scalar() or 0.0
    
    return {
        "total_applications": total,
        "pending_applications": pending,
        "approved_applications": approved,
        "rejected_applications": rejected,
        "total_approved_amount": float(total_approved),
        "average_loan_amount": float(avg_loan)
    }


@app.get("/api/manager/analytics/ai-performance", response_model=schemas.AIPerformanceResponse, tags=["Manager Features"])
def get_ai_performance_metrics(
    current_user: models.User = Depends(security.require_manager),
    db: Session = Depends(get_db)
):
    # Total evaluated by AI (where ai_decision is set)
    total_ai = db.query(models.LoanApplication).filter(models.LoanApplication.ai_decision.isnot(None)).count()
    
    # Overrides (where override_reason is populated)
    overrides = db.query(models.LoanApplication).filter(
        models.LoanApplication.ai_decision.isnot(None),
        models.LoanApplication.override_reason.isnot(None),
        models.LoanApplication.override_reason != ""
    ).count()
    
    # Agreements: Decisions where final status matches AI's decision (Approve -> Approved, Reject -> Rejected)
    agreements = db.query(models.LoanApplication).filter(
        (models.LoanApplication.ai_decision == "Approve") & (models.LoanApplication.status == "Approved") |
        (models.LoanApplication.ai_decision == "Reject") & (models.LoanApplication.status == "Rejected")
    ).count()
    
    # Calculate agreement rate (excluding pending review status if desired, or simple agreement / total resolved cases)
    total_resolved = db.query(models.LoanApplication).filter(
        models.LoanApplication.ai_decision.isnot(None),
        models.LoanApplication.status.in_(["Approved", "Rejected"])
    ).count()
    
    agreement_rate = (agreements / total_resolved) if total_resolved > 0 else 1.0
    
    # Average processing time (using difference between created_at and updated_at for resolved applications)
    # Since SQLite doesn't directly support average timestamp difference easily in SQLAlchemy queries, we fetch and calculate in python
    resolved_loans = db.query(models.LoanApplication).filter(
        models.LoanApplication.status.in_(["Approved", "Rejected"])
    ).all()
    
    total_time = 0.0
    for loan in resolved_loans:
        diff = loan.updated_at - loan.created_at
        total_time += diff.total_seconds()
        
    avg_processing_time = (total_time / len(resolved_loans)) if resolved_loans else 2.5  # default baseline
    
    return {
        "total_evaluated_by_ai": total_ai,
        "override_count": overrides,
        "agreement_count": agreements,
        "agreement_rate": float(agreement_rate),
        "average_processing_time_seconds": float(avg_processing_time)
    }


@app.get("/api/manager/audit-logs", response_model=List[schemas.AuditLogResponse], tags=["Manager Features"])
def audit_application_history(
    current_user: models.User = Depends(security.require_manager),
    db: Session = Depends(get_db)
):
    # Fetch all system audit logs sorted by newest
    logs = db.query(models.AuditLog).order_by(models.AuditLog.created_at.desc()).all()
    return logs
