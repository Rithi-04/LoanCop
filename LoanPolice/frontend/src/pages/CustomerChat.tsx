import React from 'react';
import { ChatWindow } from '../components/ChatWindow';
import { customerApi } from '../api';

export const CustomerChat: React.FC = () => {
  const suggestedQuestions = [
    "Am I eligible for a home loan?",
    "What documents are required for KYC?",
    "What is the current interest rate?"
  ];

  const handleSendMessage = async (msg: string) => {
    return await customerApi.chat(msg);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-brand-navy">AI Policy Guide</h1>
        <p className="text-sm text-brand-muted">Ask our AI assistant about RBI guidelines, KYC rules, or basic loan terms.</p>
      </div>

      <ChatWindow
        title="Customer AI Assistant"
        subtitle="RAG Policy Knowledge Base (Public FAQ, RBI Lending & KYC)"
        suggestedQuestions={suggestedQuestions}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};
