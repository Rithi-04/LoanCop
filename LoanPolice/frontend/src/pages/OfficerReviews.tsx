import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Cpu, CheckCircle2, ShieldAlert, AlertTriangle, AlertCircle, Loader, Terminal } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Input } from '../components/ui';
import { StatusBadge } from '../components/StatusBadge';
import { officerApi } from '../api';
import type { LoanApplication } from '../api';

export const OfficerReviews: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const loanIdParam = searchParams.get('id');

  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [decisionSuccess, setDecisionSuccess] = useState('');

  // Decision Panel State
  const [decisionStatus, setDecisionStatus] = useState<'Approved' | 'Rejected'>('Approved');
  const [decisionReason, setDecisionReason] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Active accordion tabs for agent logs
  const [openLogTab, setOpenLogTab] = useState<string | null>(null);

  const fetchQueue = async (selectId?: number) => {
    try {
      const data = await officerApi.getLoans();
      setLoans(data);
      if (data.length > 0) {
        const activeId = selectId || (loanIdParam ? parseInt(loanIdParam) : data[0].id);
        const matched = data.find((l) => l.id === activeId);
        if (matched) {
          fetchDetails(matched.id);
        } else {
          fetchDetails(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to retrieve loans', err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const fetchDetails = async (id: number) => {
    setIsLoadingDetails(true);
    setDecisionError('');
    setDecisionSuccess('');
    try {
      const details = await officerApi.getLoanDetails(id);
      setSelectedLoan(details);
      
      // Default form parameters
      setDecisionStatus(details.status === 'Pending' ? 'Approved' : (details.status as 'Approved' | 'Rejected'));
      setDecisionReason(details.decision_reason || '');
      setOverrideReason(details.override_reason || '');
      
      // Reset selected log accordion
      if (details.ai_logs && details.ai_logs.length > 0) {
        setOpenLogTab(details.ai_logs[0].agent_name);
      } else {
        setOpenLogTab(null);
      }
    } catch (err) {
      console.error('Failed to load details', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [loanIdParam]);

  const handleSelectLoan = (id: number) => {
    setSearchParams({ id: id.toString() });
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;

    setDecisionError('');
    setDecisionSuccess('');

    if (decisionReason.length < 5) {
      setDecisionError('Please provide a decision explanation (minimum 5 characters).');
      return;
    }

    // Determine if override is active
    const isOverrideActive = selectedLoan.ai_decision && selectedLoan.ai_decision !== decisionStatus;
    if (isOverrideActive && !overrideReason.trim()) {
      setDecisionError('The manual decision differs from the AI Agent suggestion. An Override Reason explanation is strictly required.');
      return;
    }

    setSubmitting(true);
    try {
      await officerApi.submitDecision(selectedLoan.id, {
        status: decisionStatus,
        reason: decisionReason,
        override_reason: isOverrideActive ? overrideReason : undefined,
      });

      setDecisionSuccess(`Successfully recorded decision: ${decisionStatus}`);
      
      // Update local state queue
      fetchQueue(selectedLoan.id);
    } catch (err: any) {
      setDecisionError(err.response?.data?.detail || 'Failed to submit decision.');
    } finally {
      setSubmitting(false);
    }
  };

  const isOverrideRequired = selectedLoan?.ai_decision && selectedLoan.ai_decision !== decisionStatus;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-brand-navy">Underwriting Workstation</h1>
        <p className="text-sm text-brand-muted">Cross-reference document extractions, trace AI LangGraph execution steps, and sign off decisions.</p>
      </div>

      {isLoadingQueue ? (
        <div className="flex items-center justify-center p-12 text-brand-muted space-x-2">
          <Loader className="w-6 h-6 animate-spin text-brand-emerald" />
          <span className="text-sm font-medium">Booting workstations...</span>
        </div>
      ) : loans.length === 0 ? (
        <Card className="p-8 text-center max-w-lg mx-auto">
          <p className="text-sm font-semibold text-brand-navy">Review queue is empty</p>
          <p className="text-xs text-brand-muted mt-1">Check back later for new borrower applications.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Side: Loan Selection List */}
          <Card className="lg:col-span-1 h-fit max-h-[80vh] overflow-y-auto">
            <CardHeader className="sticky top-0 bg-white z-10 border-b border-brand-border">
              <CardTitle>Underwriting Inbox</CardTitle>
              <CardDescription>Select request files to begin review</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              {loans.map((loan) => (
                <button
                  key={loan.id}
                  onClick={() => handleSelectLoan(loan.id)}
                  className={`w-full text-left p-3.5 border rounded-lg transition-all flex items-center justify-between cursor-pointer ${
                    selectedLoan?.id === loan.id
                      ? 'border-brand-emerald bg-brand-slate text-brand-navy shadow-sm'
                      : 'border-brand-border bg-white hover:bg-brand-slate/50'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-brand-navy">App #{loan.id} - Borrower #{loan.customer_id}</p>
                    <p className="text-xs text-brand-muted mt-0.5">{loan.purpose}</p>
                    <p className="text-xs font-semibold text-brand-navy mt-1">${loan.amount.toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge status={loan.status} />
                    <span className="text-[9px] font-medium text-brand-muted uppercase">
                      Risk: {loan.ai_credit_risk_rating || 'N/A'}
                    </span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Right Side: Underwriter Evaluation Panel */}
          {selectedLoan && (
            <div className="lg:col-span-2 space-y-6">
              {isLoadingDetails ? (
                <Card className="p-12 flex flex-col items-center justify-center text-brand-muted space-y-2">
                  <Loader className="w-8 h-8 animate-spin text-brand-emerald" />
                  <span className="text-sm font-medium">Hydrating application workspace...</span>
                </Card>
              ) : (
                <>
                  {/* Part 1: Applicant Profile Details */}
                  <Card>
                    <CardHeader className="border-b border-brand-border">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>Borrower Profile Details</CardTitle>
                          <CardDescription>Self-declared criteria and attached verification files</CardDescription>
                        </div>
                        <StatusBadge status={selectedLoan.status} />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-6 border-b border-brand-border pb-6">
                      <div>
                        <p className="text-[10px] font-bold text-brand-muted uppercase">Requested Amount</p>
                        <p className="text-lg font-bold text-brand-navy">${selectedLoan.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-brand-muted uppercase">Declared Annual Income</p>
                        <p className="text-lg font-bold text-brand-navy">${selectedLoan.annual_income.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-brand-muted uppercase">FICO Credit Score</p>
                        <p className="text-lg font-bold text-brand-navy">{selectedLoan.credit_score}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-brand-muted uppercase">Employment Status</p>
                        <p className="text-lg font-bold text-brand-navy">{selectedLoan.employment_status}</p>
                      </div>
                    </CardContent>

                    {/* Attached Documents Checklist */}
                    <CardContent className="pt-6">
                      <h4 className="text-xs font-bold text-brand-navy uppercase tracking-wider mb-3">
                        Attached Document Files ({selectedLoan.documents?.length || 0})
                      </h4>
                      {selectedLoan.documents && selectedLoan.documents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {selectedLoan.documents.map((doc) => (
                            <div key={doc.id} className="p-3 border border-brand-border rounded bg-brand-slate/30 flex items-center space-x-2.5">
                              <FileText className="w-5 h-5 text-brand-muted shrink-0" />
                              <div className="truncate">
                                <p className="text-xs font-semibold text-brand-navy truncate" title={doc.filename}>
                                  {doc.filename}
                                </p>
                                <p className="text-[10px] text-brand-muted uppercase">Type: {doc.doc_type}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 border border-dashed border-brand-border rounded bg-brand-slate/20 text-center text-xs text-brand-muted">
                          No document files uploaded by customer.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Part 2: AI Multi-Agent Evaluation Traces */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-brand-emerald" />
                        AI Agent Underwriting Evaluation
                      </CardTitle>
                      <CardDescription>Audit trails of the LangGraph agent decisions and document verification rules</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* AI decision summary panel */}
                      <div className="grid grid-cols-3 gap-4 p-4 border border-brand-border bg-brand-slate/30 rounded-lg">
                        <div>
                          <p className="text-[10px] font-bold text-brand-muted uppercase">Eligibility status</p>
                          <p className="text-sm font-bold text-brand-navy mt-0.5">{selectedLoan.ai_eligibility_status || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-brand-muted uppercase">Credit Risk Rating</p>
                          <p className="text-sm font-bold text-brand-navy mt-0.5">{selectedLoan.ai_credit_risk_rating || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-brand-muted uppercase">AI Action Recommendation</p>
                          <p className={`text-sm font-bold mt-0.5 ${selectedLoan.ai_decision === 'Approve' ? 'text-brand-emerald' : 'text-brand-navy'}`}>
                            {selectedLoan.ai_decision || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {selectedLoan.ai_summary && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-brand-muted uppercase">Evaluation Summary</p>
                          <p className="text-xs text-brand-navy leading-relaxed bg-brand-slate/20 border border-brand-border p-3 rounded">
                            {selectedLoan.ai_summary}
                          </p>
                        </div>
                      )}

                      {/* Accordion List for Agent Log details */}
                      {selectedLoan.ai_logs && selectedLoan.ai_logs.length > 0 && (
                        <div className="space-y-2.5 mt-4">
                          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">
                            Trace LangGraph Orchestration Logs ({selectedLoan.ai_logs.length} Steps)
                          </p>
                          
                          <div className="border border-brand-border rounded-md divide-y divide-brand-border overflow-hidden">
                            {selectedLoan.ai_logs.map((log) => {
                              const isOpen = openLogTab === log.agent_name;
                              return (
                                <div key={log.id} className="bg-white">
                                  <button
                                    type="button"
                                    onClick={() => setOpenLogTab(isOpen ? null : log.agent_name)}
                                    className="w-full px-4 py-2.5 text-left flex items-center justify-between text-xs font-semibold text-brand-navy hover:bg-brand-slate/50 transition-colors cursor-pointer"
                                  >
                                    <span className="flex items-center space-x-2">
                                      <Terminal className="w-3.5 h-3.5 text-brand-emerald" />
                                      <span>{log.agent_name}</span>
                                    </span>
                                    <div className="flex items-center space-x-3">
                                      <span className="text-[9px] font-bold text-brand-emerald uppercase px-2 py-0.5 bg-emerald-50 rounded border border-emerald-100">
                                        {log.status}
                                      </span>
                                      <svg className={`w-3.5 h-3.5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </div>
                                  </button>

                                  {isOpen && (
                                    <div className="p-4 bg-brand-navy text-brand-slate font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-48 border-t border-brand-border">
                                      {log.log_details}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Part 3: Underwriter Sign-off Panel */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Decision Board</CardTitle>
                      <CardDescription>Approve or Reject this application and record manual override decisions.</CardDescription>
                    </CardHeader>
                    
                    <form onSubmit={handleDecisionSubmit}>
                      <CardContent className="space-y-4">
                        {decisionError && (
                          <div className="flex items-start space-x-2 bg-slate-100 text-brand-navy border border-brand-border rounded p-3 text-xs font-medium">
                            <AlertCircle className="w-4 h-4 shrink-0 text-brand-muted mt-0.5" />
                            <span>{decisionError}</span>
                          </div>
                        )}
                        {decisionSuccess && (
                          <div className="flex items-start space-x-2 bg-emerald-50 text-brand-emerald border border-emerald-200 rounded p-3 text-xs font-medium">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{decisionSuccess}</span>
                          </div>
                        )}

                        {/* Status Selection Buttons */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-brand-navy uppercase tracking-wider">
                            manual decision
                          </label>
                          <div className="flex gap-4">
                            <button
                              type="button"
                              onClick={() => setDecisionStatus('Approved')}
                              disabled={selectedLoan.status !== 'Pending'}
                              className={`flex-1 py-3 px-4 border rounded-lg font-semibold text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                                decisionStatus === 'Approved'
                                  ? 'border-brand-emerald bg-emerald-50 text-brand-emerald ring-1 ring-brand-emerald'
                                  : 'border-brand-border bg-white text-brand-navy hover:bg-brand-slate'
                              } disabled:opacity-50 disabled:pointer-events-none`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Approve Loan</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDecisionStatus('Rejected')}
                              disabled={selectedLoan.status !== 'Pending'}
                              className={`flex-1 py-3 px-4 border rounded-lg font-semibold text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                                decisionStatus === 'Rejected'
                                  ? 'border-brand-navy bg-brand-navy text-white ring-1 ring-brand-navy'
                                  : 'border-brand-border bg-white text-brand-navy hover:bg-brand-slate'
                              } disabled:opacity-50 disabled:pointer-events-none`}
                            >
                              <AlertTriangle className="w-4 h-4" />
                              <span>Reject Loan</span>
                            </button>
                          </div>
                        </div>

                        {/* Standard Decision Reason */}
                        <div>
                          <label className="text-xs font-semibold text-brand-navy uppercase tracking-wider block mb-1.5">
                            Underwriter Justification
                          </label>
                          <textarea
                            value={decisionReason}
                            onChange={(e) => setDecisionReason(e.target.value)}
                            placeholder="State the primary findings supporting this decision (minimum 5 characters)..."
                            disabled={selectedLoan.status !== 'Pending'}
                            className="w-full min-h-[80px] p-3 text-sm bg-white border border-brand-border rounded-md shadow-sm focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy disabled:bg-brand-slate disabled:text-brand-muted"
                            required
                          />
                        </div>

                        {/* Override Reason Required Panel */}
                        {isOverrideRequired && (
                          <div className="space-y-3 p-4 border border-brand-border bg-slate-100 rounded-lg animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-start space-x-2 text-brand-navy">
                              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                              <div className="text-xs leading-relaxed font-semibold">
                                <p className="uppercase tracking-wider">AI RECOMMENDATION DEVIATION DETECTED</p>
                                <p className="font-normal mt-0.5">The selected status differs from the AI decision ({selectedLoan.ai_decision}). An override explanation must be recorded for audit and model alignment tracking.</p>
                              </div>
                            </div>
                            <div>
                              <Input
                                label="Override Reason Description"
                                value={overrideReason}
                                onChange={(e) => setOverrideReason(e.target.value)}
                                placeholder="Explain why the AI model recommendation was overruled..."
                                disabled={selectedLoan.status !== 'Pending'}
                                required
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>

                      {selectedLoan.status === 'Pending' && (
                        <CardFooter>
                          <Button
                            type="submit"
                            variant="accent"
                            className="w-full flex items-center justify-center gap-2 cursor-pointer h-10"
                            disabled={submitting}
                          >
                            {submitting ? (
                              <>
                                <Loader className="w-4 h-4 animate-spin text-white" />
                                <span>Recording credit decision...</span>
                              </>
                            ) : (
                              'Confirm Credit Decision'
                            )}
                          </Button>
                        </CardFooter>
                      )}
                    </form>
                  </Card>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
