import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, CheckCircle2, Clock, XCircle, Search, Eye, Loader } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Input, Button } from '../components/ui';
import { StatusBadge } from '../components/StatusBadge';
import { officerApi } from '../api';
import type { LoanApplication } from '../api';

export const OfficerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const data = await officerApi.getLoans();
        setLoans(data);
      } catch (err) {
        console.error('Failed to load officer applications', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLoans();
  }, []);

  // Compute stats locally from queue
  const totalApps = loans.length;
  const pendingApps = loans.filter((l) => l.status === 'Pending').length;
  const approvedApps = loans.filter((l) => l.status === 'Approved').length;
  const rejectedApps = loans.filter((l) => l.status === 'Rejected').length;

  // Filter queue
  const filteredLoans = loans.filter((loan) => {
    const matchesSearch = 
      loan.id.toString().includes(searchQuery) ||
      loan.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.customer_id.toString().includes(searchQuery);

    const matchesStatus = statusFilter === 'All' || loan.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-brand-navy">Review Workspace</h1>
        <p className="text-sm text-brand-muted">Evaluate borrower profiles, document scans, and RAG policy matching triggers.</p>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Applications', count: totalApps, sub: 'Lifetime queue', icon: Layers, color: 'text-brand-navy' },
          { label: 'Pending Assessment', count: pendingApps, sub: 'Needs manual check', icon: Clock, color: 'text-brand-navy' },
          { label: 'Approved Decisions', count: approvedApps, sub: 'Criteria cleared', icon: CheckCircle2, color: 'text-brand-emerald' },
          { label: 'Rejected Files', count: rejectedApps, sub: 'Policy conflict', icon: XCircle, color: 'text-brand-muted' }
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="pt-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider">{card.label}</p>
                  <p className="text-3xl font-bold text-brand-navy">{card.count}</p>
                  <p className="text-[10px] text-brand-muted">{card.sub}</p>
                </div>
                <div className={`p-3 bg-brand-slate rounded-lg border border-brand-border ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Underwriting Queue Table */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Credit Underwriting Queue</CardTitle>
            <CardDescription>Select a pending file to view verification logs and submit manual override decisions.</CardDescription>
          </div>
          
          {/* Controls */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative w-64">
              <Input
                placeholder="Search ID, purpose, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              <Search className="absolute bottom-2.5 left-3 w-4 h-4 text-brand-muted" />
            </div>

            <div className="flex border border-brand-border rounded-md overflow-hidden bg-white">
              {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    statusFilter === status
                      ? 'bg-brand-navy text-white'
                      : 'text-brand-navy hover:bg-brand-slate'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-12 text-brand-muted space-x-2">
              <Loader className="w-6 h-6 animate-spin text-brand-emerald" />
              <span className="text-sm font-medium">Loading review queue...</span>
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-brand-border rounded-md">
              <p className="text-sm text-brand-muted font-medium">No applications found matching criteria</p>
              <p className="text-xs text-brand-muted mt-1">Review filters or query text and try again.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App ID</TableHead>
                  <TableHead>Customer Ref</TableHead>
                  <TableHead>Loan Purpose</TableHead>
                  <TableHead>Requested Amount</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>AI Decision</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-semibold text-brand-navy">#{loan.id}</TableCell>
                    <TableCell className="font-medium text-brand-muted">Borrower #{loan.customer_id}</TableCell>
                    <TableCell>{loan.purpose}</TableCell>
                    <TableCell className="font-medium">${loan.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      {loan.ai_credit_risk_rating ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          loan.ai_credit_risk_rating === 'Low'
                            ? 'bg-emerald-50 text-brand-emerald border border-emerald-100'
                            : 'bg-slate-100 text-brand-navy border border-brand-border'
                        }`}>
                          {loan.ai_credit_risk_rating}
                        </span>
                      ) : (
                        <span className="text-xs text-brand-muted italic">Awaiting Assessment</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {loan.ai_decision ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          loan.ai_decision === 'Approve' 
                            ? 'bg-emerald-50 text-brand-emerald' 
                            : 'bg-slate-100 text-brand-muted'
                        }`}>
                          AI: {loan.ai_decision}
                        </span>
                      ) : (
                        <span className="text-xs text-brand-muted italic">Pending Agent</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={loan.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/officer/reviews?id=${loan.id}`)}
                        className="inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Assess File</span>
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
  );
};
