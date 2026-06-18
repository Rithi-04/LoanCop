import React from 'react';
import { ChatWindow } from '../components/ChatWindow';
import { officerApi } from '../api';

export const OfficerChat: React.FC = () => {
  const suggestedQuestions = [
    "What is the minimum income required for a loan?",
    "What are the RBI lending guidelines regarding loan-to-value?",
    "How should I verify KYC documents for credit risk?"
  ];

  const handleSendMessage = async (msg: string) => {
    return await officerApi.chat(msg);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-brand-navy">Policy Library Chat</h1>
        <p className="text-sm text-brand-muted">Ask our internal RAG assistant about bank underwriting constraints and regulatory guidelines.</p>
      </div>

      <ChatWindow
        title="Internal Policy Desk"
        subtitle="Unrestricted Knowledge Base (Internal Rules, Guidelines, Compliance Docs)"
        suggestedQuestions={suggestedQuestions}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};
