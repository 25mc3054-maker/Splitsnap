import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Minimize2,
  Maximize2,
  Trash2,
  ArrowRight,
  Bot,
  User,
  CreditCard,
  Receipt,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { sendChatMessage, ChatMessage } from '../utils/api';

interface ChatbotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToSettle?: () => void;
  onNavigateToReceipt?: () => void;
  onNavigateToAddExpense?: () => void;
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  {
    icon: '💸',
    label: 'How much do I owe and why?',
    query: 'How much do I owe and why?',
  },
  {
    icon: '📋',
    label: 'Give me the expense list',
    query: 'Give me the complete expense list across all groups',
  },
  {
    icon: '🔍',
    label: 'Give me the breakdown',
    query: 'Give me the complete breakdown of Manali Trip and recent receipts',
  },
  {
    icon: '🧾',
    label: 'Mountain Cafe receipt',
    query: 'Explain The Mountain Cafe receipt and my exact share breakdown',
  },
  {
    icon: '📈',
    label: 'Who owes me money?',
    query: 'Who owes me money and how much across all groups?',
  },
];

// Helper to render basic markdown (tables, headers, bold, bullets, code)
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = (key: string) => {
    if (tableHeaders.length > 0 || tableRows.length > 0) {
      elements.push(
        <div key={key} className="my-3 overflow-x-auto rounded-lg border border-[#182822] bg-[#09120e]">
          <table className="w-full text-left text-xs">
            {tableHeaders.length > 0 && (
              <thead className="bg-[#0f1f18] text-[#00e599] border-b border-[#182822]">
                <tr>
                  {tableHeaders.map((th, i) => (
                    <th key={i} className="px-3 py-2 font-semibold">
                      {th.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-[#182822]/60 text-slate-300">
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#13281f]/40 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 whitespace-nowrap">
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeaders = [];
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check table row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map(c => c.trim());

      // If it's a separator line (e.g. |:---|:---|), skip
      if (cells.every(c => c.replace(/:/g, '').replace(/-/g, '') === '')) {
        inTable = true;
        continue;
      }

      if (!inTable && tableHeaders.length === 0) {
        tableHeaders = cells;
        inTable = true;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable(`tbl_${i}`);
    }

    if (!trimmed) {
      elements.push(<div key={`sp_${i}`} className="h-2" />);
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h3_${i}`} className="mt-3 mb-1 text-sm font-bold text-[#00e599] flex items-center gap-1.5">
          {renderInlineFormatting(trimmed.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h5 key={`h4_${i}`} className="mt-2.5 mb-1 text-xs font-bold text-emerald-300 uppercase tracking-wider">
          {renderInlineFormatting(trimmed.slice(5))}
        </h5>
      );
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={`li_${i}`} className="flex items-start gap-2 my-1 text-xs text-slate-200">
          <span className="text-[#00e599] mt-0.5">•</span>
          <span className="flex-1">{renderInlineFormatting(trimmed.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Standard paragraph
    elements.push(
      <p key={`p_${i}`} className="text-xs text-slate-200 leading-relaxed my-1">
        {renderInlineFormatting(trimmed)}
      </p>
    );
  }

  if (inTable) {
    flushTable('tbl_end');
  }

  return <div className="space-y-1">{elements}</div>;
}

// Inline formatting for **bold** and `code`
function renderInlineFormatting(text: string): React.ReactNode {
  // Regex to split bold **...** and code `...`
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="rounded bg-[#182822] px-1.5 py-0.5 font-mono text-[11px] text-[#00e599] border border-[#00e599]/30"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export const ChatbotDrawer: React.FC<ChatbotDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateToSettle,
  onNavigateToReceipt,
  onNavigateToAddExpense,
}) => {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: 'init_welcome',
      role: 'model',
      content: `### 👋 Hi Kushagra! I'm your SplitSnap AI Copilot.\n\n` +
        `I have complete, live visibility into your groups, receipts, and settlements.\n\n` +
        `**Quick Ledger Status:**\n` +
        `- You owe **₹800.00** to **Aryan Gupta** for Manali bus tickets.\n` +
        `- You are owed **₹1,225.00** by Rohan, Diya & Priya.\n` +
        `- Overall balance: **+₹425.00** net positive.\n\n` +
        `Tap any question below or ask me anything!`,
      timestamp: 'Just now',
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || isLoading) return;

    const userMessage: DisplayMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputQuery('');
    setIsLoading(true);

    try {
      // Build API messages payload
      const apiPayload: ChatMessage[] = newMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendChatMessage(apiPayload);

      const botMessage: DisplayMessage = {
        id: `bot_${Date.now()}`,
        role: 'model',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: DisplayMessage = {
        id: `err_${Date.now()}`,
        role: 'model',
        content: `### ⚠️ Connection Notice\n\nI couldn't reach the live AI service right now. However, your local ledger shows you owe **₹800.00** to Aryan Gupta, and you are owed **₹1,225.00** overall.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `clr_${Date.now()}`,
        role: 'model',
        content: `### 🧹 Conversation Cleared\n\nI'm ready with your full ledger state. How can I help you today?`,
        timestamp: 'Just now',
      },
    ]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={onClose}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full bg-[#00e599] px-4 py-3 font-semibold text-[#060b09] shadow-[0_0_25px_rgba(0,229,153,0.4)] transition-all hover:bg-[#00ffaa] hover:scale-105 active:scale-95 cursor-pointer"
        title="Open SplitSnap AI Assistant"
      >
        <Sparkles className="h-5 w-5 fill-[#060b09]" />
        <span className="text-sm font-bold">Ask AI Copilot</span>
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#060b09] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#060b09]"></span>
        </span>
      </button>
    );
  }

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ease-out flex flex-col shadow-2xl border border-[#00e599]/30 bg-[#060b09] backdrop-blur-xl ${
        isExpanded
          ? 'inset-3 sm:inset-6 md:inset-12 rounded-2xl'
          : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[460px] h-[640px] max-h-[85vh] rounded-2xl'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#182822] bg-[#09120e] px-4 py-3.5 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00e599]/15 border border-[#00e599]/30 text-[#00e599]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">SplitSnap AI</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#00e599]/10 px-2 py-0.5 text-[10px] font-semibold text-[#00e599] border border-[#00e599]/20">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00e599] animate-pulse"></span>
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Live ledger, debts & itemized breakdowns</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearChat}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#182822] hover:text-slate-200 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden sm:block rounded-lg p-1.5 text-slate-400 hover:bg-[#182822] hover:text-slate-200 transition-colors"
            title={isExpanded ? 'Restore size' : 'Maximize'}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#182822] hover:text-white transition-colors"
            title="Close Assistant"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Quick Prompt Chips */}
      <div className="border-b border-[#182822] bg-[#0c1612]/70 px-3 py-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 whitespace-nowrap">
          {QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp.query)}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-full border border-[#182822] bg-[#0f1f18] hover:border-[#00e599]/40 hover:bg-[#13281f] px-2.5 py-1 text-xs text-slate-300 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <span>{qp.icon}</span>
              <span className="font-medium">{qp.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          const mentionsAryan = msg.content.includes('Aryan') || msg.content.includes('800');
          const mentionsMountain = msg.content.includes('Mountain Cafe') || msg.content.includes('1,354');

          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div
                className={`flex items-start gap-2 max-w-[92%] sm:max-w-[85%] ${
                  isUser ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isUser
                      ? 'bg-slate-700 text-slate-200'
                      : 'bg-[#00e599]/20 border border-[#00e599]/40 text-[#00e599]'
                  }`}
                >
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                {/* Content Box */}
                <div
                  className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-[#00e599] text-[#060b09] font-medium shadow-md'
                      : 'bg-[#0e1714] border border-[#182822] text-slate-200 shadow-sm'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div>
                      <FormattedMessage content={msg.content} />

                      {/* Contextual Action Shortcuts */}
                      {!isUser && (mentionsAryan || mentionsMountain) && (
                        <div className="mt-3 pt-2.5 border-t border-[#182822] flex flex-wrap gap-2">
                          {mentionsAryan && onNavigateToSettle && (
                            <button
                              onClick={() => {
                                onNavigateToSettle();
                                onClose();
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#00e599]/15 border border-[#00e599]/40 px-2.5 py-1 text-[11px] font-bold text-[#00e599] hover:bg-[#00e599]/25 transition-all cursor-pointer"
                            >
                              <CreditCard className="h-3 w-3" />
                              <span>Settle with Aryan via PayPal ($9.41 USD)</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}

                          {mentionsMountain && onNavigateToReceipt && (
                            <button
                              onClick={() => {
                                onNavigateToReceipt();
                                onClose();
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500/15 border border-teal-500/30 px-2.5 py-1 text-[11px] font-semibold text-teal-300 hover:bg-teal-500/25 transition-all cursor-pointer"
                            >
                              <Receipt className="h-3 w-3" />
                              <span>Review Mountain Cafe Receipt</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <span className="text-[10px] text-slate-500 mt-1 px-9">{msg.timestamp}</span>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00e599]/20 border border-[#00e599]/40 text-[#00e599]">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl bg-[#0e1714] border border-[#182822] px-4 py-3 flex items-center gap-2">
              <span className="text-xs text-slate-400">Analyzing ledger with Gemini 3.8...</span>
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00e599] animate-bounce"></span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#00e599] animate-bounce [animation-delay:0.2s]"></span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#00e599] animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t border-[#182822] bg-[#09120e] p-3 rounded-b-2xl">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            placeholder="Ask 'how much do I owe and why?', expense list..."
            disabled={isLoading}
            className="flex-1 rounded-xl bg-[#0e1714] border border-[#182822] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#00e599] focus:outline-none focus:ring-1 focus:ring-[#00e599] transition-all"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#00e599] text-[#060b09] shadow-[0_0_15px_rgba(0,229,153,0.3)] transition-all hover:bg-[#00ffaa] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-slate-500">
          <span>Powered by Gemini 3.8 Flash • SplitSnap Ledger Copilot</span>
          <span>Press Enter ↵</span>
        </div>
      </div>
    </div>
  );
};
