import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, ArrowRight, ShieldCheck, Cpu, FileCheck, SearchCode, Database, Activity } from 'lucide-react';
import { Button } from '../components/ui';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const handleCTA = () => {
    if (token && role) {
      navigate(role === 'LoanOfficer' ? '/officer/dashboard' : `/${role.toLowerCase()}/dashboard`);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="bg-brand-slate min-h-screen flex flex-col font-sans">
      {/* Header bar */}
      <header className="h-16 bg-white border-b border-brand-border px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-2.5">
          <div className="bg-brand-navy p-1.5 rounded-md text-brand-emerald">
            <Landmark className="w-5 h-5" />
          </div>
          <span className="font-sans font-bold text-lg text-brand-navy tracking-tight">
            LEND<span className="text-brand-emerald">.AI</span>
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="cursor-pointer">
            Log In
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/register')} className="cursor-pointer">
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-brand-emerald border border-emerald-100">
            Powered by LangGraph & ChromaDB
          </span>
          <h1 className="text-5xl font-extrabold tracking-tight text-brand-navy leading-[1.1]">
            AI-Powered Loan Decision Intelligence
          </h1>
          <p className="text-lg text-brand-muted leading-relaxed max-w-lg">
            Accelerate loan processing with RAG-powered policy retrieval, automated risk assessments, and secure, auditable agentic workflows.
          </p>
          <div className="flex items-center space-x-4">
            <Button variant="accent" size="lg" onClick={handleCTA} className="flex items-center space-x-2 cursor-pointer">
              <span>Access Platform</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('/register')} className="cursor-pointer">
              Create Account
            </Button>
          </div>
        </div>

        {/* Banking illustration (Styled SVG) */}
        <div className="bg-white border border-brand-border p-8 rounded-xl shadow-lg flex flex-col justify-between aspect-video relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-emerald/5 rounded-full filter blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-navy/5 rounded-full filter blur-3xl" />
          
          <div className="flex items-center justify-between border-b border-brand-border pb-4 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-3.5 h-3.5 rounded-full bg-brand-navy" />
              <span className="text-xs font-bold text-brand-navy uppercase tracking-wider">LEND.AI Decision Hub</span>
            </div>
            <span className="text-[10px] font-bold text-brand-emerald bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              ACTIVE AGENTS: 5/5
            </span>
          </div>

          <div className="flex-1 grid grid-cols-5 gap-3 items-center relative z-10">
            {[
              { label: 'Ingest', val: '100%', done: true },
              { label: 'Eligibility', val: 'Eligible', done: true },
              { label: 'Risk', val: 'Low Risk', done: true },
              { label: 'Policy', val: '8 Matches', done: true },
              { label: 'Decision', val: 'Approve', done: true, highlight: true }
            ].map((node, i) => (
              <div key={node.label} className={`flex flex-col items-center justify-center p-3 border rounded-lg text-center ${
                node.highlight 
                  ? 'border-brand-emerald bg-emerald-50/10' 
                  : 'border-brand-border bg-brand-slate/50'
              }`}>
                <span className="text-[9px] font-bold text-brand-muted uppercase tracking-wider block mb-1">
                  Step 0{i + 1}
                </span>
                <span className="text-[10px] font-bold text-brand-navy truncate block max-w-full">
                  {node.label}
                </span>
                <div className={`mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden`}>
                  <div className={`h-full ${node.highlight ? 'bg-brand-emerald' : 'bg-brand-navy'}`} style={{ width: '100%' }} />
                </div>
                <span className={`text-[9px] font-bold mt-1.5 ${node.highlight ? 'text-brand-emerald' : 'text-brand-navy'}`}>
                  {node.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white border-y border-brand-border px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <h2 className="text-3xl font-bold text-brand-navy">
              Enterprise Risk and Decision Automation
            </h2>
            <p className="text-sm text-brand-muted leading-relaxed">
              Equip customers, loan officers, and compliance managers with real-time insight from submission to audit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: 'AI Eligibility Analysis', desc: 'Validates basic criteria including credit rating, LTI, and minimum incomes.', icon: Cpu },
              { title: 'Risk Assessment Modeler', desc: 'Evaluates applicant profiles against default parameters and tiers credit risk.', icon: Activity },
              { title: 'OCR & Document Verification', desc: 'Auto-scans and extracts details from uploaded KYC and salary proof files.', icon: FileCheck },
              { title: 'RAG Policy Retrieval', desc: 'Queries vectors to cross-reference application data with RBI & bank guidelines.', icon: SearchCode },
              { title: 'Role-Based Access Rules', desc: 'Secures routes for Customers, Officers, and Managers with cryptographically validated JWTs.', icon: Database },
              { title: 'Analytics Dashboard', desc: 'Manager portal measuring approval ratios, AI performance logs, and exceptions.', icon: ShieldCheck }
            ].map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.title} className="p-6 border border-brand-border rounded-lg hover:border-brand-emerald transition-colors bg-brand-slate/10 space-y-3">
                  <div className="bg-brand-navy text-brand-emerald p-2 rounded-md inline-block">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-brand-navy">{feat.title}</h3>
                  <p className="text-sm text-brand-muted leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full space-y-12">
        <div className="text-center space-y-4 max-w-xl mx-auto">
          <h2 className="text-3xl font-bold text-brand-navy">
            Our Automated Decisional Workflow
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            Applications are evaluated sequentially by five Specialized Agents on our LangGraph runtime.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
          {[
            { step: '01', title: 'Submit App', desc: 'Income & Credit' },
            { step: '02', title: 'Verify Docs', desc: 'Scan proof files' },
            { step: '03', title: 'Check Rules', desc: 'Basic eligibility' },
            { step: '04', title: 'Risk Score', desc: 'Determine risk tier' },
            { step: '05', title: 'Review policies', desc: 'ChromaDB retrieval' },
            { step: '06', title: 'Decision', desc: 'AI Recommendation' }
          ].map((node, i) => (
            <React.Fragment key={node.step}>
              <div className="w-full md:w-32 bg-white border border-brand-border p-4 rounded-lg shadow-sm text-center relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-navy text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                  {node.step}
                </span>
                <p className="text-xs font-bold text-brand-navy mt-1 truncate">{node.title}</p>
                <p className="text-[10px] text-brand-muted mt-1 leading-normal">{node.desc}</p>
              </div>
              {i < 5 && (
                <div className="hidden md:block text-brand-muted">
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-brand-navy text-white border-t border-slate-800 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="bg-slate-800 p-1 rounded text-brand-emerald">
              <Landmark className="w-4 h-4" />
            </div>
            <span className="font-bold">LEND.AI Systems Inc.</span>
          </div>
          <p className="text-slate-400">
            &copy; {new Date().getFullYear()} LEND.AI. All compliance rules and RBI regulations apply.
          </p>
          <div className="flex space-x-4 text-slate-400">
            <span className="hover:text-white cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer">Security Audits</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
