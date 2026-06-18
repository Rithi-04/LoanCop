import axios from 'axios';

// Create Axios instance pointing to FastAPI backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiry / unauth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==========================================
// API INTERFACES
// ==========================================

export interface UserProfile {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: 'Customer' | 'LoanOfficer' | 'Manager';
}

export interface LoanDocument {
  id: number;
  filename: string;
  doc_type: string;
  uploaded_at: string;
}

export interface AIEvaluationLog {
  id: number;
  agent_name: string;
  status: string;
  log_details: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  action: string;
  performed_by: number;
  comments?: string;
  created_at: string;
}

export interface LoanApplication {
  id: number;
  customer_id: number;
  amount: number;
  purpose: string;
  annual_income: number;
  credit_score: number;
  employment_status: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  ai_eligibility_status?: string;
  ai_credit_risk_rating?: string;
  ai_decision?: string;
  ai_summary?: string;
  officer_id?: number;
  decision_reason?: string;
  override_reason?: string;
  created_at: string;
  updated_at: string;
  documents: LoanDocument[];
  ai_logs?: AIEvaluationLog[];
  audit_logs?: AuditLog[];
}

export interface ChatResponse {
  answer: string;
  sources: string[];
}

export interface LoanStats {
  total_applications: number;
  pending_applications: number;
  approved_applications: number;
  rejected_applications: number;
  total_approved_amount: number;
  average_loan_amount: number;
}

export interface AIPerformance {
  total_evaluated_by_ai: number;
  override_count: number;
  agreement_count: number;
  agreement_rate: number;
  average_processing_time_seconds: number;
}

// ==========================================
// API METHODS
// ==========================================

export const authApi = {
  register: async (data: any) => {
    const response = await apiClient.post<UserProfile>('/api/auth/register', data);
    return response.data;
  },
  login: async (formData: URLSearchParams) => {
    const response = await apiClient.post<{ access_token: string; token_type: string }>('/api/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },
  getMe: async () => {
    const response = await apiClient.get<UserProfile>('/api/auth/me');
    return response.data;
  },
};

export const customerApi = {
  getLoans: async () => {
    const response = await apiClient.get<LoanApplication[]>('/api/customer/loans');
    return response.data;
  },
  submitLoan: async (data: any) => {
    const response = await apiClient.post<LoanApplication>('/api/customer/loans', data);
    return response.data;
  },
  uploadDoc: async (loanId: number, docType: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    const response = await apiClient.post<LoanDocument>(`/api/customer/loans/${loanId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  chat: async (message: string) => {
    const response = await apiClient.post<ChatResponse>('/api/customer/chat', { message });
    return response.data;
  },
};

export const officerApi = {
  getLoans: async () => {
    const response = await apiClient.get<LoanApplication[]>('/api/officer/loans');
    return response.data;
  },
  getLoanDetails: async (loanId: number) => {
    const response = await apiClient.get<LoanApplication>(`/api/officer/loans/${loanId}`);
    return response.data;
  },
  submitDecision: async (loanId: number, data: { status: 'Approved' | 'Rejected'; reason: string; override_reason?: string }) => {
    const response = await apiClient.post<LoanApplication>(`/api/officer/loans/${loanId}/decision`, data);
    return response.data;
  },
  chat: async (message: string) => {
    const response = await apiClient.post<ChatResponse>('/api/officer/chat', { message });
    return response.data;
  },
};

export const managerApi = {
  getStats: async () => {
    const response = await apiClient.get<LoanStats>('/api/manager/analytics/stats');
    return response.data;
  },
  getAIPerformance: async () => {
    const response = await apiClient.get<AIPerformance>('/api/manager/analytics/ai-performance');
    return response.data;
  },
  getAuditLogs: async () => {
    const response = await apiClient.get<AuditLog[]>('/api/manager/audit-logs');
    return response.data;
  },
};
