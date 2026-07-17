'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles, RefreshCw } from 'lucide-react';
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

/** Detects if a line is a product row like "**Item Name:** 5 pieces" */
function parseProductLine(text: string): { name: string; qty: string } | null {
  const match = text.match(/^\*\*(.+?):\*\*\s*(.+)$/);
  if (match) return { name: match[1].trim(), qty: match[2].trim() };
  return null;
}

function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inProductList = false;
  let productRows: { name: string; qty: string }[] = [];
  let productKey = 0;

  const flushProductTable = () => {
    if (productRows.length === 0) return;
    elements.push(
      <div key={`tbl-${productKey++}`} className="mt-1 mb-2 rounded-xl overflow-hidden border border-white/10">
        <table className="w-full text-[11px] sm:text-xs">
          <thead>
            <tr className="bg-white/5">
              <th className="text-left px-3 py-1.5 text-vodacom-muted font-semibold uppercase tracking-wide">Product</th>
              <th className="text-right px-3 py-1.5 text-vodacom-muted font-semibold uppercase tracking-wide">Stock</th>
            </tr>
          </thead>
          <tbody>
            {productRows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-black/20' : 'bg-black/10'}>
                <td className="px-3 py-1.5 text-gray-200">{row.name}</td>
                <td className="px-3 py-1.5 text-right text-emerald-400 font-medium whitespace-nowrap">{row.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    productRows = [];
    inProductList = false;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushProductTable();
      elements.push(<div key={idx} className="h-1" />);
      return;
    }

    // H1/H2/H3 headings
    if (/^#{1,3} /.test(trimmed)) {
      flushProductTable();
      const text = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <h4 key={idx} className="font-bold text-white text-xs sm:text-sm mt-3 mb-1 border-b border-white/10 pb-1">
          {renderBoldText(text)}
        </h4>
      );
      return;
    }

    // #### sub-category header (e.g. "#### Cables & Connectors")
    if (trimmed.startsWith('#### ') || trimmed.startsWith('### ')) {
      flushProductTable();
      const text = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <p key={idx} className="text-[11px] sm:text-xs font-semibold text-vodacom-blue mt-2 mb-0.5 uppercase tracking-wide">
          {text}
        </p>
      );
      return;
    }

    // Bullet with bold product format: "*   **Name:** qty"
    if ((trimmed.startsWith('* ') || trimmed.startsWith('- ')) ) {
      const bulletText = trimmed.substring(2).trim();
      const product = parseProductLine(bulletText);
      if (product) {
        inProductList = true;
        productRows.push(product);
        return;
      }
      // Regular bullet
      flushProductTable();
      elements.push(
        <div key={idx} className="flex gap-2 items-start pl-1 py-0.5">
          <span className="text-vodacom-blue font-bold text-xs mt-0.5 shrink-0">•</span>
          <span className="flex-1 text-gray-200">{renderBoldText(bulletText)}</span>
        </div>
      );
      return;
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      flushProductTable();
      const match = trimmed.match(/^(\d+\.)\s*(.*)/);
      if (match) {
        elements.push(
          <div key={idx} className="flex gap-2 items-start pl-1 py-0.5">
            <span className="text-vodacom-blue font-semibold text-xs mt-0.5 shrink-0">{match[1]}</span>
            <span className="flex-1 text-gray-200">{renderBoldText(match[2])}</span>
          </div>
        );
      }
      return;
    }

    // Default paragraph
    flushProductTable();
    elements.push(<p key={idx} className="text-gray-200">{renderBoldText(trimmed)}</p>);
  });

  flushProductTable();

  return <div className="space-y-0.5 text-xs sm:text-[13px] leading-relaxed">{elements}</div>;
}

const QUICK_SUGGESTIONS = [
  "📦 Inventory Summary",
  "🔍 Search Dome Cameras",
  "📄 Latest Invoices",
  "🤝 Active AMCs"
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: "👋 Hello! I am your **Vodacom ERP AI Assistant**.\n\nI can help you query live data from your database! Ask me about:\n* **Inventory & Stock**\n* **Customers & AMCs**\n* **Invoices & Sales**" 
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
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {isOpen ? (
        <div className="w-80 h-[480px] sm:w-[420px] sm:h-[560px] flex flex-col bg-vodacom-surface/95 backdrop-blur-xl shadow-2xl rounded-2xl border border-white/10 overflow-hidden transition-all duration-300">
          {/* Header */}
          <div className="bg-vodacom-darker p-4 flex justify-between items-center border-b border-white/10 text-white shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-vodacom-blue/20 border border-vodacom-blue/40 flex items-center justify-center text-vodacom-blue">
                <Bot size={18} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm text-white tracking-wide">Vodacom AI Assistant</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <p className="text-[10px] text-vodacom-muted">Powered by Gemini AI</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setMessages([messages[0]])} 
                title="Clear chat"
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

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3.5 bg-black/20">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-vodacom-blue/20 border border-vodacom-blue/30 flex items-center justify-center text-vodacom-blue shrink-0 shadow-sm mt-0.5">
                    <Bot size={14} />
                  </div>
                )}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl shadow-md ${
                    msg.role === 'user'
                      ? 'bg-vodacom-blue text-white rounded-tr-xs text-xs sm:text-[13px]'
                      : 'bg-vodacom-darker text-gray-200 border border-white/10 rounded-tl-xs max-w-[85%]'
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
                <div className="px-4 py-3 rounded-2xl bg-vodacom-darker border border-white/10 rounded-tl-xs shadow-sm flex items-center gap-1.5">
                  <Sparkles size={14} className="text-vodacom-blue animate-spin" />
                  <span className="text-xs text-vodacom-muted">Thinking &amp; querying database...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Suggestion Pills */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-vodacom-darker/60 border-t border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar">
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
          <form onSubmit={handleSubmit} className="p-3 bg-vodacom-darker border-t border-white/10 flex gap-2 items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about inventory, stock, invoices..."
              className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-vodacom-muted focus:outline-none focus:border-vodacom-blue/50 transition-all"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-vodacom-green hover:bg-emerald-500 disabled:opacity-30 text-white flex items-center justify-center transition-all shadow-lg shrink-0"
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

