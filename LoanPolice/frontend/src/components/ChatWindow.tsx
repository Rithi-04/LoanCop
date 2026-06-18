import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Bookmark, ChevronRight, CornerDownRight, Loader } from 'lucide-react';
import { Button, Input, Card } from './ui';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  sources?: string[];
}

interface ChatWindowProps {
  title: string;
  subtitle: string;
  suggestedQuestions: string[];
  onSendMessage: (msg: string) => Promise<{ answer: string; sources?: string[] }>;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  title,
  subtitle,
  suggestedQuestions,
  onSendMessage,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am your AI Loan Assistant. I can help answer questions regarding our loan products, KYC verification standards, RBI guidelines, and lending policies. Select a suggested prompt below or write your own query.",
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await onSendMessage(textToSend);
      const assistantMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        text: response.answer,
        timestamp: new Date(),
        sources: response.sources || [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
      
      if (response.sources && response.sources.length > 0) {
        // Automatically display latest sources
        setActiveSources(response.sources);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        text: "I encountered an error querying the vector store or communicating with the backend. Please verify your server connection and OpenAI key config.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6">
      {/* Chat Area */}
      <Card className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-border bg-white flex flex-col">
          <h2 className="text-base font-bold text-brand-navy flex items-center gap-2">
            <Bot className="w-5 h-5 text-brand-emerald" />
            {title}
          </h2>
          <p className="text-xs text-brand-muted">{subtitle}</p>
        </div>

        {/* Messages timeline */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-brand-slate/20">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Avatar Icon */}
                <div className={`w-8 h-8 rounded-full border border-brand-border flex items-center justify-center shrink-0 shadow-sm ${
                  isUser ? 'bg-brand-navy text-white' : 'bg-white text-brand-navy'
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-brand-emerald" />}
                </div>

                {/* Message Body */}
                <div className="space-y-1.5">
                  <div className={`px-4 py-3 rounded-lg text-sm leading-relaxed ${
                    isUser 
                      ? 'bg-brand-navy text-white rounded-tr-none' 
                      : 'bg-white text-brand-navy border border-brand-border rounded-tl-none shadow-sm'
                  }`}>
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                  
                  {/* Citations list inside message */}
                  {!isUser && msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pl-1.5">
                      <span className="text-[10px] text-brand-muted font-bold flex items-center gap-1">
                        <Bookmark className="w-3 h-3" /> SOURCES:
                      </span>
                      {msg.sources.map((src) => (
                        <button
                          key={src}
                          onClick={() => setActiveSources(msg.sources || [])}
                          className="text-[10px] font-semibold text-brand-emerald bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          {src}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-full border border-brand-border bg-white text-brand-navy flex items-center justify-center shadow-sm">
                <Bot className="w-4 h-4 text-brand-emerald" />
              </div>
              <div className="px-4 py-3 rounded-lg bg-white border border-brand-border rounded-tl-none shadow-sm text-brand-muted flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin text-brand-emerald" />
                <span className="text-sm font-medium">Querying policies...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Starters */}
        {messages.length === 1 && (
          <div className="px-6 py-3 border-t border-brand-border bg-white">
            <p className="text-xs font-bold text-brand-muted mb-2 flex items-center gap-1">
              <CornerDownRight className="w-3.5 h-3.5" /> SUGGESTED TOPICS
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="text-xs text-brand-navy hover:text-brand-emerald border border-brand-border bg-white hover:border-brand-emerald px-3 py-1.5 rounded-full transition-all cursor-pointer text-left shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 border-t border-brand-border bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputText);
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question about bank rules, policies, or KYC procedures..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!inputText.trim() || isLoading}
              className="!p-2.5 cursor-pointer h-[38px] w-[38px]"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>

      {/* Sources / Citations sidebar panel */}
      <Card className="w-80 h-full overflow-hidden flex flex-col hidden lg:flex">
        <div className="px-6 py-4 border-b border-brand-border bg-white">
          <h3 className="text-sm font-bold text-brand-navy flex items-center gap-2 uppercase tracking-wider">
            <Bookmark className="w-4 h-4 text-brand-emerald" />
            Citations & Sources
          </h3>
        </div>
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-brand-slate/10">
          {activeSources.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-brand-muted p-4">
              <Bookmark className="w-8 h-8 opacity-30 mb-2" />
              <p className="text-xs font-semibold">No citations loaded</p>
              <p className="text-[10px] mt-1">Submit a policy query to view referenced regulatory or internal source files.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">
                Referenced Documents ({activeSources.length})
              </p>
              {activeSources.map((src) => (
                <div
                  key={src}
                  className="bg-white p-3 rounded border border-brand-border shadow-sm flex items-start justify-between gap-2 transition-colors hover:border-brand-emerald"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-brand-navy truncate max-w-[200px]" title={src}>
                      {src}
                    </p>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-brand-slate text-brand-muted border border-brand-border">
                      Verified Policy
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-brand-muted mt-0.5 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
