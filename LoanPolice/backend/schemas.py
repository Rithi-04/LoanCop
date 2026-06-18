from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# Auth schemas
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    full_name: str
    email: EmailStr
    role: str = Field(default="Customer", description="Must be 'Customer', 'LoanOfficer', or 'Manager'")

class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: int
    username: str
    role: str


# Document schemas
class DocumentResponse(BaseModel):
    id: int
    filename: str
    doc_type: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


# Evaluation Log schema
class AIEvaluationLogResponse(BaseModel):
    id: int
    agent_name: str
    status: str
    log_details: str
    created_at: datetime

    class Config:
        from_attributes = True


# Audit Log schema
class AuditLogResponse(BaseModel):
    id: int
    action: str
    performed_by: int
    comments: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Loan Application schemas
class LoanApplicationCreate(BaseModel):
    amount: float = Field(..., gt=0)
    purpose: str
    annual_income: float = Field(..., gt=0)
    credit_score: int = Field(..., ge=300, le=850)
    employment_status: str

class CustomerLoanApplicationResponse(BaseModel):
    id: int
    customer_id: int
    amount: float
    purpose: str
    annual_income: float
    credit_score: int
    employment_status: str
    status: str
    created_at: datetime
    updated_at: datetime
    documents: List[DocumentResponse] = []

    class Config:
        from_attributes = True

class LoanApplicationResponse(BaseModel):
    id: int
    customer_id: int
    amount: float
    purpose: str
    annual_income: float
    credit_score: int
    employment_status: str
    status: str
    ai_eligibility_status: Optional[str] = None
    ai_credit_risk_rating: Optional[str] = None
    ai_decision: Optional[str] = None
    ai_summary: Optional[str] = None
    officer_id: Optional[int] = None
    decision_reason: Optional[str] = None
    override_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    documents: List[DocumentResponse] = []

    class Config:
        from_attributes = True

class LoanApplicationDetailResponse(LoanApplicationResponse):
    ai_logs: List[AIEvaluationLogResponse] = []
    audit_logs: List[AuditLogResponse] = []

    class Config:
        from_attributes = True


# Officer Action schema
class DecisionSubmit(BaseModel):
    status: str = Field(..., description="Must be 'Approved' or 'Rejected'")
    reason: str = Field(..., min_length=5, description="Brief justification for the decision")
    override_reason: Optional[str] = Field(None, description="Required if overriding AI recommendation")


# RAG Chat schemas
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    answer: str
    sources: List[str]


# Analytics schemas
class LoanStatsResponse(BaseModel):
    total_applications: int
    pending_applications: int
    approved_applications: int
    rejected_applications: int
    total_approved_amount: float
    average_loan_amount: float

class AIPerformanceResponse(BaseModel):
    total_evaluated_by_ai: int
    override_count: int
    agreement_count: int
    agreement_rate: float
    average_processing_time_seconds: float
