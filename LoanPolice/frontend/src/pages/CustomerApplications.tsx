import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle2, ShieldAlert, AlertCircle, Loader } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui';
import { StatusBadge } from '../components/StatusBadge';
import { DocumentUploader } from '../components/DocumentUploader';
import { customerApi } from '../api';
import type { LoanApplication } from '../api';

export const CustomerApplications: React.FC = () => {
  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLoans = async (selectId?: number) => {
    try {
      const data = await customerApi.getLoans();
      setLoans(data);
      if (data.length > 0) {
        if (selectId) {
          const matched = data.find(l => l.id === selectId);
          setSelectedLoan(matched || data[0]);
        } else if (!selectedLoan) {
          setSelectedLoan(data[0]);
        } else {
          // Keep current selection updated
          const matched = data.find(l => l.id === selectedLoan.id);
          setSelectedLoan(matched || data[0]);
        }
      } else {
        setSelectedLoan(null);
      }
    } catch (err) {
      console.error('Could not retrieve applications.', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleUploadSuccess = () => {
    if (selectedLoan) {
      // Reload current loan data to display new uploaded documents
      fetchLoans(selectedLoan.id);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-brand-navy">Document Check & Verification</h1>
        <p className="text-sm text-brand-muted">Submit verifying materials (tax statements, photo IDs) to support your active loan requests.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-brand-muted space-x-2">
          <Loader className="w-6 h-6 animate-spin text-brand-emerald" />
          <span className="text-sm font-medium">Loading details...</span>
        </div>
      ) : loans.length === 0 ? (
        <Card className="p-8 text-center max-w-lg mx-auto">
          <p className="text-sm font-semibold text-brand-navy">No applications found</p>
          <p className="text-xs text-brand-muted mt-1 mb-4">You need to submit an application first before uploading supporting KYC/Income document files.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side: Loan Selection Table */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle>Select Application</CardTitle>
              <CardDescription>Click to manage verifying files</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loans.map((loan) => (
                <button
                  key={loan.id}
                  onClick={() => setSelectedLoan(loan)}
                  className={`w-full text-left p-3.5 border rounded-lg transition-all flex items-center justify-between cursor-pointer ${
                    selectedLoan?.id === loan.id
                      ? 'border-brand-emerald bg-brand-slate text-brand-navy shadow-sm'
                      : 'border-brand-border bg-white hover:bg-brand-slate/50'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-brand-navy">Application #{loan.id}</p>
                    <p className="text-xs text-brand-muted mt-0.5">{loan.purpose}</p>
                    <p className="text-xs font-semibold text-brand-navy mt-1">${loan.amount.toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge status={loan.status} />
                    <span className="text-[9px] font-medium text-brand-muted uppercase">
                      Docs: {loan.documents?.length || 0}
                    </span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Right Side: Selected Loan Files & Uploader */}
          {selectedLoan && (
            <Card className="lg:col-span-2 space-y-6">
              <CardHeader className="border-b border-brand-border">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Verification Center - #{selectedLoan.id}</CardTitle>
                    <CardDescription>{selectedLoan.purpose} — ${selectedLoan.amount.toLocaleString()}</CardDescription>
                  </div>
                  <StatusBadge status={selectedLoan.status} />
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pt-6">
                {/* Checklist warnings */}
                <div className="p-3 bg-brand-slate/50 border border-brand-border rounded flex items-start space-x-2.5">
                  <ShieldAlert className="w-4 h-4 text-brand-navy mt-0.5 shrink-0" />
                  <div className="text-xs text-brand-navy leading-relaxed">
                    <p className="font-semibold">Compliance Note:</p>
                    <p className="mt-0.5">Uploading documents automatically triggers a complete re-evaluation of your eligibility by our five AI Agents. Ensure document details match your submitted application.</p>
                  </div>
                </div>

                {/* Upload Form */}
                {selectedLoan.status === 'Pending' ? (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-brand-navy uppercase tracking-wider">
                      Add New Verification File
                    </h4>
                    <DocumentUploader
                      loanId={selectedLoan.id}
                      uploadFn={customerApi.uploadDoc}
                      onUploadSuccess={handleUploadSuccess}
                    />
                  </div>
                ) : (
                  <div className="p-3 border border-brand-border bg-slate-50 text-slate-600 rounded flex items-center space-x-2 text-xs">
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    <span>This application is already finalized. No further uploads are accepted.</span>
                  </div>
                )}

                {/* Uploaded Documents List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-brand-navy uppercase tracking-wider">
                    Uploaded Documents Checklist ({selectedLoan.documents?.length || 0})
                  </h4>

                  {selectedLoan.documents && selectedLoan.documents.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Uploaded At</TableHead>
                          <TableHead className="text-right">Verification</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedLoan.documents.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium flex items-center space-x-2 truncate max-w-[240px]">
                              <FileText className="w-4 h-4 text-brand-muted shrink-0" />
                              <span title={doc.filename}>{doc.filename}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-semibold uppercase tracking-wider text-brand-muted bg-brand-slate px-2 py-0.5 rounded border border-brand-border">
                                {doc.doc_type}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs">
                              {new Date(doc.uploaded_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="inline-flex items-center space-x-1 text-xs font-semibold text-brand-emerald">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Attached</span>
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center p-8 border border-dashed border-brand-border rounded-md bg-brand-slate/20">
                      <p className="text-xs text-brand-muted font-medium">No documents uploaded yet</p>
                      <p className="text-[10px] text-brand-muted mt-0.5">Please upload KYC and Income Proof files to initiate reviews.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
