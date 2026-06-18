import React, { useEffect, useState } from 'react';
import { Activity, Percent, Clock, FileCheck, Loader } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui';
import { managerApi } from '../api';
import type { LoanStats, AIPerformance } from '../api';

export const ManagerDashboard: React.FC = () => {
  const [stats, setStats] = useState<LoanStats | null>(null);
  const [aiPerf, setAiPerf] = useState<AIPerformance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchManagerData = async () => {
      try {
        const [statsData, aiPerfData] = await Promise.all([
          managerApi.getStats(),
          managerApi.getAIPerformance()
        ]);
        setStats(statsData);
        setAiPerf(aiPerfData);
      } catch (err) {
        console.error('Failed to load manager analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchManagerData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-brand-muted space-x-2">
        <Loader className="w-8 h-8 animate-spin text-brand-emerald" />
        <span className="text-sm font-medium">Hydrating executive KPIs...</span>
      </div>
    );
  }

  // Derive metrics
  const total = stats?.total_applications || 0;
  const approved = stats?.approved_applications || 0;
  const rejected = stats?.rejected_applications || 0;
  const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : '0.0';
  const rejectionRate = total > 0 ? ((rejected / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold text-brand-navy">Branch Overview</h1>
        <p className="text-sm text-brand-muted">Consolidated branch pipeline statistics, manual decisions, and AI agent metrics.</p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Approval Rate', val: `${approvalRate}%`, sub: `${approved} of ${total} files`, icon: Percent, color: 'text-brand-emerald' },
          { label: 'Rejection Rate', val: `${rejectionRate}%`, sub: `${rejected} of ${total} files`, icon: Percent, color: 'text-brand-muted' },
          { label: 'Avg Processing Time', val: `${aiPerf?.average_processing_time_seconds.toFixed(2) || '0.00'}s`, sub: 'From start to decision', icon: Clock, color: 'text-brand-navy' },
          { label: 'Total Volume Approved', val: `$${(stats?.total_approved_amount || 0).toLocaleString()}`, sub: `Avg request: $${(stats?.average_loan_amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: FileCheck, color: 'text-brand-emerald' }
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="pt-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider">{card.label}</p>
                  <p className="text-3xl font-bold text-brand-navy">{card.val}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Branch Queue stats */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Queue Pipeline Status</CardTitle>
            <CardDescription>Breakdown of active customer applications in current workflow</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 border border-brand-border rounded bg-brand-slate/40">
              <span className="text-[10px] font-bold text-brand-muted uppercase">Total Requests</span>
              <p className="text-2xl font-bold text-brand-navy mt-1">{stats?.total_applications || 0}</p>
            </div>
            <div className="p-4 border border-brand-border rounded bg-brand-slate/40">
              <span className="text-[10px] font-bold text-brand-muted uppercase">Under Evaluation</span>
              <p className="text-2xl font-bold text-brand-navy mt-1">{stats?.pending_applications || 0}</p>
            </div>
            <div className="p-4 border border-brand-border rounded bg-brand-slate/40">
              <span className="text-[10px] font-bold text-brand-muted uppercase">Approved Loans</span>
              <p className="text-2xl font-bold text-brand-navy mt-1">{stats?.approved_applications || 0}</p>
            </div>
            <div className="p-4 border border-brand-border rounded bg-brand-slate/40">
              <span className="text-[10px] font-bold text-brand-muted uppercase">Rejected Loans</span>
              <p className="text-2xl font-bold text-brand-navy mt-1">{stats?.rejected_applications || 0}</p>
            </div>
          </CardContent>
        </Card>

        {/* AI Performance Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-emerald" />
              AI Model Alignment
            </CardTitle>
            <CardDescription>Accuracy and officer override tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm border-b border-brand-border pb-2.5">
              <span className="text-brand-muted">Evaluated by AI:</span>
              <span className="font-bold text-brand-navy">{aiPerf?.total_evaluated_by_ai || 0} files</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-brand-border pb-2.5">
              <span className="text-brand-muted">Officer Overrides:</span>
              <span className="font-bold text-brand-navy">{aiPerf?.override_count || 0} times</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-brand-border pb-2.5">
              <span className="text-brand-muted">AI Agreement Count:</span>
              <span className="font-bold text-brand-navy">{aiPerf?.agreement_count || 0} files</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-brand-muted">Model Agreement Rate:</span>
              <span className="font-bold text-brand-emerald bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                {aiPerf?.agreement_rate.toFixed(1) || '0.0'}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
