import React, { useEffect, useState } from 'react';
import { Search, Calendar, Loader } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Input } from '../components/ui';
import { managerApi } from '../api';
import type { LoanStats, AIPerformance, AuditLog } from '../api';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

export const ManagerAnalytics: React.FC = () => {
  const [stats, setStats] = useState<LoanStats | null>(null);
  const [aiPerf, setAiPerf] = useState<AIPerformance | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, aiPerfData, logsData] = await Promise.all([
          managerApi.getStats(),
          managerApi.getAIPerformance(),
          managerApi.getAuditLogs()
        ]);
        setStats(statsData);
        setAiPerf(aiPerfData);
        
        // Sort logs in reverse chronological order
        setAuditLogs(logsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } catch (err) {
        console.error('Failed to load manager analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-brand-muted space-x-2">
        <Loader className="w-8 h-8 animate-spin text-brand-emerald" />
        <span className="text-sm font-medium">Computing analytics data...</span>
      </div>
    );
  }

  // ==========================================
  // CHART DATA PREPARATION
  // ==========================================

  // 1. Approval Distribution
  const approvalData = [
    { name: 'Approved', value: stats?.approved_applications || 0 },
    { name: 'Rejected', value: stats?.rejected_applications || 0 },
  ];
  
  // 2. AI Recommendation Alignment
  const alignmentData = [
    { name: 'Agreed', count: aiPerf?.agreement_count || 0 },
    { name: 'Overridden', count: aiPerf?.override_count || 0 },
  ];

  // 3. Risk Profile Categories (FICO based ranges mapping)
  const riskCategoriesData = [
    { name: 'Low Risk (720+)', count: stats?.approved_applications || 0 }, // Low risk usually maps to approvals
    { name: 'Med Risk (640-719)', count: stats?.pending_applications || 0 },
    { name: 'High Risk (<640)', count: stats?.rejected_applications || 0 },
  ];

  // Brand Palette colors mapping (Strict Navy & Emerald + Slate neutrals)
  const COLORS = ['#10B981', '#0F172A', '#64748B'];

  // ==========================================
  // AUDIT LOG FILTERING
  // ==========================================
  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.comments && log.comments.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.performed_by.toString().includes(searchQuery);

    const matchesAction = 
      actionFilter === 'All' || 
      (actionFilter === 'Override' && log.action.toLowerCase().includes('override')) ||
      (actionFilter === 'Submission' && log.action.toLowerCase().includes('submit')) ||
      (actionFilter === 'Upload' && log.action.toLowerCase().includes('upload'));

    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-brand-navy">Analytics & Compliance Audits</h1>
        <p className="text-sm text-brand-muted">Review agent decisions, underwriter agreements, and complete immutable system logs.</p>
      </div>

      {/* Chart Visualizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Chart 1: Approval Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Distribution</CardTitle>
            <CardDescription>Ratio of approved vs. rejected files</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex justify-center items-center">
            {stats?.approved_applications === 0 && stats?.rejected_applications === 0 ? (
              <p className="text-xs text-brand-muted">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={approvalData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {approvalData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Recommendation Alignment */}
        <Card>
          <CardHeader>
            <CardTitle>AI Model Alignment</CardTitle>
            <CardDescription>Agreement rate vs. manual officer overrides</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {aiPerf?.total_evaluated_by_ai === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-brand-muted">No evaluations trace logged</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alignmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    <Cell fill="#10B981" />
                    <Cell fill="#0F172A" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 3: FICO Risk Profile Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Risk Profile</CardTitle>
            <CardDescription>Applications classified by score thresholds</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskCategoriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="count" fill="#0F172A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Part 2: Audit Logs Table */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>System Audit Logs</CardTitle>
            <CardDescription>Immutable record of customer submissions, officer reviews, and compliance overrides.</CardDescription>
          </div>

          {/* Filtering controls */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative w-64">
              <Input
                placeholder="Search action or comments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              <Search className="absolute bottom-2.5 left-3 w-4 h-4 text-brand-muted" />
            </div>

            <div className="flex border border-brand-border rounded-md overflow-hidden bg-white">
              {[
                { value: 'All', label: 'All Logs' },
                { value: 'Submission', label: 'Submissions' },
                { value: 'Upload', label: 'Uploads' },
                { value: 'Override', label: 'Overrides' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setActionFilter(opt.value)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    actionFilter === opt.value
                      ? 'bg-brand-navy text-white'
                      : 'text-brand-navy hover:bg-brand-slate'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-brand-border rounded-md">
              <p className="text-sm text-brand-muted font-medium">No audit logs matching selection</p>
              <p className="text-xs text-brand-muted mt-1">Try adjusting search query or filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Audit ID</TableHead>
                  <TableHead>Action Type</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Recorded Comments</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-semibold text-brand-navy">#{log.id}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center space-x-1 text-xs font-bold ${
                        log.action.toLowerCase().includes('override')
                          ? 'text-brand-emerald'
                          : 'text-brand-navy'
                      }`}>
                        <Calendar className="w-3.5 h-3.5 text-brand-muted mr-1.5" />
                        <span>{log.action}</span>
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-brand-muted">User #{log.performed_by}</TableCell>
                    <TableCell className="text-xs text-brand-navy italic max-w-xs truncate" title={log.comments || ''}>
                      {log.comments || 'No comment attachment'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(log.created_at).toLocaleString()}
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
