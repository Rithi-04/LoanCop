from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "Customer", "LoanOfficer", "Manager"
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False)

    # Relationships
    applications = relationship("LoanApplication", back_populates="customer", foreign_keys="[LoanApplication.customer_id]")
    reviewed_applications = relationship("LoanApplication", back_populates="officer", foreign_keys="[LoanApplication.officer_id]")
    audit_logs = relationship("AuditLog", back_populates="user")


class LoanApplication(Base):
    __tablename__ = "loan_applications"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    purpose = Column(String, nullable=False)
    annual_income = Column(Float, nullable=False)
    credit_score = Column(Integer, nullable=False)
    employment_status = Column(String, nullable=False)
    
    # Decisions & AI Outputs
    status = Column(String, default="Pending")  # "Pending", "Approved", "Rejected"
    ai_eligibility_status = Column(String, nullable=True)  # "Eligible", "Ineligible"
    ai_credit_risk_rating = Column(String, nullable=True)  # "Low", "Medium", "High"
    ai_decision = Column(String, nullable=True)  # "Approve", "Reject", "Refer"
    ai_summary = Column(Text, nullable=True)
    
    # Officer Review info
    officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    decision_reason = Column(Text, nullable=True)
    override_reason = Column(Text, nullable=True)

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    customer = relationship("User", back_populates="applications", foreign_keys=[customer_id])
    officer = relationship("User", back_populates="reviewed_applications", foreign_keys=[officer_id])
    documents = relationship("Document", back_populates="application", cascade="all, delete-orphan")
    ai_logs = relationship("AIEvaluationLog", back_populates="application", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="application", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("loan_applications.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    doc_type = Column(String, nullable=False)  # "KYC", "IncomeProof", "Other"
    uploaded_at = Column(DateTime, default=func.now())

    # Relationships
    application = relationship("LoanApplication", back_populates="documents")


class AIEvaluationLog(Base):
    __tablename__ = "ai_evaluation_logs"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("loan_applications.id"), nullable=False)
    agent_name = Column(String, nullable=False)  # "Document Processing", "Eligibility", "Credit Risk", etc.
    status = Column(String, nullable=False)  # "Success", "Failed"
    log_details = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    application = relationship("LoanApplication", back_populates="ai_logs")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("loan_applications.id"), nullable=False)
    action = Column(String, nullable=False)  # "SUBMITTED", "AI_EVALUATED", "OFFICER_APPROVED", "OFFICER_REJECTED", "OFFICER_OVERRIDDEN"
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    application = relationship("LoanApplication", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")
