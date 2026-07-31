'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import api from '../lib/api';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

function renderBoldText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-white/10 text-cyan-300 px-1.5 py-0.5 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
    }
    return <span key={i}>{part}</span>;
  });
}

function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div key={idx} className="h-1.5" />);
      return;
    }

    // Headings: #, ##, ###, ####
    if (/^#{1,4} /.test(trimmed)) {
      const level = (trimmed.match(/^#+/) || [''])[0].length;
      const text = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <h4
          key={idx}
          className={`font-bold text-white mt-2 mb-1 ${
            level <= 2 ? 'text-sm border-b border-white/10 pb-1 text-vodacom-green' : 'text-xs text-vodacom-blue uppercase tracking-wide'
          }`}
        >
          {renderBoldText(text)}
        </h4>
      );
      return;
    }

    // Bullet points: * or -
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const bulletText = trimmed.substring(2).trim();
      elements.push(
        <div key={idx} className="flex gap-2 items-start pl-1 py-0.5">
          <span className="text-vodacom-green font-bold text-xs mt-0.5 shrink-0">•</span>
          <div className="flex-1 text-gray-200">{renderBoldText(bulletText)}</div>
        </div>
      );
      return;
    }

    // Numbered lists: 1. 2.
    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+\.)\s*(.*)/);
      if (match) {
        elements.push(
          <div key={idx} className="flex gap-2 items-start pl-1 py-0.5">
            <span className="text-vodacom-blue font-semibold text-xs mt-0.5 shrink-0">{match[1]}</span>
            <div className="flex-1 text-gray-200">{renderBoldText(match[2])}</div>
          </div>
        );
      }
      return;
    }

    // Standard paragraph
    elements.push(
      <p key={idx} className="text-gray-200 py-0.5">
        {renderBoldText(trimmed)}
      </p>
    );
  });

  return <div className="space-y-0.5 text-xs sm:text-[13px] leading-relaxed">{elements}</div>;
}

const QUICK_SUGGESTIONS = [
  "📦 In-Depth Inventory Analysis",
  "💰 Revenue & Billing Breakdown",
  "🛡️ AMC Portfolio Summary",
  "📢 Active Sales Enquiries"
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: "👋 Hello! I am your **Vodacom ERP Senior AI Business Assistant**.\n\nI have direct access to live inventory, revenue, customer accounts, and service contracts.\n\nAsk me for an **in-depth report** on:\n* **Detailed Inventory Valuation & Low Stock**\n* **Revenue & Outstanding Invoices**\n* **AMC Portfolio & Expiries**\n* **Sales Enquiries & Lead Pipeline**" 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const sendQuery = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: queryText.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/api/chat/', { messages: newMessages });
      const reply = res.data?.reply || 'No response received.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ Could not connect to backend assistant. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuery(input);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 font-sans">
      {isOpen ? (
        <div
          className={`flex flex-col bg-vodacom-surface/95 backdrop-blur-xl shadow-2xl rounded-2xl border border-white/10 overflow-hidden transition-all duration-300 ${
            isExpanded
              ? 'w-[calc(100vw-2rem)] sm:w-[700px] h-[85vh] max-h-[750px]'
              : 'w-[calc(100vw-2rem)] max-w-[480px] h-[520px] sm:h-[600px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-vodacom-darker p-3.5 sm:p-4 flex justify-between items-center border-b border-white/10 text-white shadow-sm shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-vodacom-blue/20 border border-vodacom-blue/40 flex items-center justify-center text-vodacom-blue">
                <Bot size={18} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm text-white tracking-wide">Vodacom AI Assistant</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <p className="text-[10px] text-vodacom-muted">Real-Time ERP Analytical Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Restore window size' : 'Expand window for detailed reading'}
                className="hover:bg-white/5 p-1.5 rounded-lg text-vodacom-muted hover:text-white transition-colors"
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button 
                onClick={() => setMessages([messages[0]])} 
                title="Clear conversation"
                className="hover:bg-white/5 p-1.5 rounded-lg text-vodacom-muted hover:text-white transition-colors"
              >
                <RefreshCw size={14} />
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                className="hover:bg-white/5 p-1.5 rounded-lg text-vodacom-muted hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3.5 bg-black/20">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-vodacom-blue/20 border border-vodacom-blue/30 flex items-center justify-center text-vodacom-blue shrink-0 shadow-sm mt-0.5">
                    <Bot size={14} />
                  </div>
                )}
                <div
                  className={`px-4 py-3 rounded-2xl shadow-md ${
                    msg.role === 'user'
                      ? 'bg-vodacom-blue text-white rounded-tr-xs text-xs sm:text-[13px] max-w-[85%]'
                      : 'bg-vodacom-darker text-gray-200 border border-white/10 rounded-tl-xs w-full max-w-[95%]'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <FormattedMessage content={msg.content} />
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-vodacom-text shrink-0 shadow-sm mt-0.5">
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-lg bg-vodacom-blue/20 border border-vodacom-blue/30 flex items-center justify-center text-vodacom-blue shrink-0 shadow-sm">
                  <Bot size={14} />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-vodacom-darker border border-white/10 rounded-tl-xs shadow-sm flex items-center gap-2">
                  <Sparkles size={14} className="text-vodacom-blue animate-spin" />
                  <span className="text-xs text-vodacom-muted">Generating in-depth database analysis...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Suggestions */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-vodacom-darker/60 border-t border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {QUICK_SUGGESTIONS.map((pill, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => sendQuery(pill)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-vodacom-blue/20 border border-white/10 text-vodacom-muted hover:text-white text-[11px] whitespace-nowrap transition-all"
                >
                  {pill}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-3 bg-vodacom-darker border-t border-white/10 flex gap-2 items-center shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for an in-depth inventory report, revenue, stock valuation..."
              className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-vodacom-muted focus:outline-none focus:border-vodacom-blue/50 transition-all"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-vodacom-green hover:bg-emerald-500 disabled:opacity-30 text-white flex items-center justify-center transition-all shadow-lg shrink-0 border-none cursor-pointer"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="relative group w-14 h-14 bg-gradient-to-tr from-vodacom-blue to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-2xl hover:scale-105 transition-all duration-200 border border-white/20"
        >
          <MessageCircle size={26} />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-vodacom-green rounded-full border-2 border-vodacom-darker"></span>
        </button>
      )}
    </div>
  );
}
