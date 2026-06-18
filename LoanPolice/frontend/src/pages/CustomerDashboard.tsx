import React, { useEffect, useState } from 'react';
import { FilePlus2, Landmark, CheckCircle2, AlertCircle, Eye, Loader } from 'lucide-react';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardDescription, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from '../components/ui';
import { StatusBadge } from '../components/StatusBadge';
import { customerApi } from '../api';
import type { LoanApplication } from '../api';

export const CustomerDashboard: React.FC = () => {
  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Form Fields
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('Home Loan');
  const [annualIncome, setAnnualIncome] = useState('');
  const [creditScore, setCreditScore] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('Employed');

  // Selected Loan Details Modal
  const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchLoans = async () => {
    try {
      const data = await customerApi.getLoans();
      setLoans(data);
    } catch (err) {
      console.error('Failed to load loans', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const parsedAmount = parseFloat(amount);
    const parsedIncome = parseFloat(annualIncome);
    const parsedCredit = parseInt(creditScore);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid loan amount.');
      return;
    }
    if (isNaN(parsedIncome) || parsedIncome <= 0) {
      setFormError('Please enter a valid annual income.');
      return;
    }
    if (isNaN(parsedCredit) || parsedCredit < 300 || parsedCredit > 900) {
      setFormError('Please enter a valid credit score between 300 and 900.');
      return;
    }

    setFormLoading(true);
    try {
      const newApp = await customerApi.submitLoan({
        amount: parsedAmount,
        purpose,
        annual_income: parsedIncome,
        credit_score: parsedCredit,
        employment_status: employmentStatus,
      });
      setFormSuccess('Loan application submitted successfully!');
      setAmount('');
      setAnnualIncome('');
      setCreditScore('');
      fetchLoans();
      
      // Auto open details
      setSelectedLoan(newApp);
      setIsModalOpen(true);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to submit application. Verify inputs.');
    } finally {
      setFormLoading(false);
    }
  };

  const openLoanDetails = (loan: LoanApplication) => {
    setSelectedLoan(loan);
    setIsModalOpen(true);
  };

  const purposeOptions = [
    { value: 'Home Loan', label: 'Home Mortgage Loan' },
    { value: 'Education Loan', label: 'Higher Education / Tuition Loan' },
    { value: 'Vehicle Loan', label: 'Auto / Vehicle Purchase' },
    { value: 'Business Loan', label: 'Commercial Business Growth' },
    { value: 'Personal Loan', label: 'Personal Expense / Consolidation' }
  ];

  const employmentOptions = [
    { value: 'Employed', label: 'Salaried Employee' },
    { value: 'Self-Employed', label: 'Self-Employed Professional / Business' },
    { value: 'Unemployed', label: 'Not Employed / Contractual' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-navy">Customer Workspace</h1>
          <p className="text-sm text-brand-muted">Submit and manage your credit applications and document checks.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submission Form Card */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FilePlus2 className="w-5 h-5 text-brand-emerald" />
              Apply for Loan
            </CardTitle>
            <CardDescription>
              Submit values for automated credit assessment
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleApply}>
            <CardContent className="space-y-4">
              {formError && (
                <div className="flex items-start space-x-2 bg-slate-100 text-brand-navy border border-brand-border rounded p-3 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-brand-muted mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="flex items-start space-x-2 bg-emerald-50 text-brand-emerald border border-emerald-200 rounded p-3 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <Input
                label="Loan Amount Requested ($)"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 50000"
                required
              />

              <Select
                label="Loan Purpose"
                options={purposeOptions}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />

              <Input
                label="Annual Income ($)"
                type="number"
                value={annualIncome}
                onChange={(e) => setAnnualIncome(e.target.value)}
                placeholder="e.g. 75000"
                required
              />

              <Input
                label="Credit Score (FICO)"
                type="number"
                value={creditScore}
                onChange={(e) => setCreditScore(e.target.value)}
                placeholder="e.g. 720"
                required
              />

              <Select
                label="Employment Status"
                options={employmentOptions}
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
              />
            </CardContent>
            <CardContent className="pt-0">
              <Button
                type="submit"
                variant="primary"
                className="w-full flex items-center justify-center gap-2 cursor-pointer"
                disabled={formLoading}
              >
                {formLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin text-brand-emerald" />
                    <span>Analyzing application...</span>
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </CardContent>
          </form>
        </Card>

        {/* Existing Applications Queue */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-brand-emerald" />
              Active Applications
            </CardTitle>
            <CardDescription>
              Track the status of your submitted loan applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-12 text-brand-muted space-x-2">
                <Loader className="w-6 h-6 animate-spin text-brand-emerald" />
                <span className="text-sm font-medium">Retrieving applications...</span>
              </div>
            ) : loans.length === 0 ? (
              <div className="text-center p-12 border border-dashed border-brand-border rounded-md">
                <p className="text-sm text-brand-muted font-medium">No loans submitted yet</p>
                <p className="text-xs text-brand-muted mt-1">Use the application panel on the left to start a request.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Requested Amount</TableHead>
                    <TableHead>Final Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-semibold text-brand-navy">#{loan.id}</TableCell>
                      <TableCell>{loan.purpose}</TableCell>
                      <TableCell className="font-medium">${loan.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <StatusBadge status={loan.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openLoanDetails(loan)}
                          className="inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Loan Details Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Application Detail - #${selectedLoan?.id}`}
      >
        {selectedLoan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b border-brand-border pb-4">
              <div>
                <p className="text-[10px] font-bold text-brand-muted uppercase">Amount Requested</p>
                <p className="text-lg font-bold text-brand-navy">${selectedLoan.amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-brand-muted uppercase">Status</p>
                <div className="mt-1">
                  <StatusBadge status={selectedLoan.status} />
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-brand-slate/40 border border-brand-border p-4 rounded-md">
              <div className="flex justify-between items-center text-xs">
                <span className="text-brand-muted">Purpose:</span>
                <span className="font-bold text-brand-navy">{selectedLoan.purpose}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-brand-muted">Annual Income:</span>
                <span className="font-bold text-brand-navy">${selectedLoan.annual_income.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-brand-muted">Credit Score (FICO):</span>
                <span className="font-bold text-brand-navy">{selectedLoan.credit_score}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-brand-muted">Employment Status:</span>
                <span className="font-bold text-brand-navy">{selectedLoan.employment_status}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-brand-border">
              <span className="text-[10px] text-brand-muted">
                Submitted: {new Date(selectedLoan.created_at).toLocaleDateString()}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsModalOpen(false);
                }}
                className="cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
