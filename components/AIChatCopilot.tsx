'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Well } from '../lib/oilfieldData';
import { Bot, User, Send, Sparkles, RefreshCw, Layers, ShieldCheck } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AIChatCopilotProps {
  selectedWell: Well;
  onAudit: (action: string, details: string) => void;
}

export default function AIChatCopilot({ selectedWell, onAudit }: AIChatCopilotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Xin chào! Tôi là **Senior Production Optimization Engineer AI Copilot**. 

Tôi được trang bị đầy đủ dữ liệu thời gian thực của khu mỏ Block-A, hệ thống tài liệu SPE chuẩn hóa, và các thuật toán tính toán thủy động học.

Tôi có thể hỗ trợ bạn:
* **Chẩn đoán lý do suy giảm sản xuất** trên giếng hiện tại (${selectedWell.name}).
* **Tính toán PI, Skin Factor** và đánh giá hiệu năng các hệ thống nâng nhân tạo (ESP, Gas Lift).
* **Đề xuất giải pháp tăng sản lượng** (Acid wash, Gel shutoff, thay đổi thông số bơm) kèm theo dự báo hiệu quả kinh tế (NPV, ROI).

Hãy chọn một câu hỏi gợi ý bên dưới hoặc nhập câu hỏi trực tiếp của bạn!`,
      timestamp: new Date().toTimeString().split(' ')[0].substring(0, 5)
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync assistant welcoming when context changes
  const handleSelectSuggested = (promptText: string) => {
    sendMessage(promptText);
  };

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsgId = `user-msg-${messages.length}`;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    const newUserMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: textToSend,
      timestamp: timeStr
    };

    setMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);

    // Keep history array for conversational context
    const chatHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          chatHistory: chatHistory,
          wellContextId: selectedWell.id
        })
      });

      const data = await response.json();
      
      const assistantMsgId = `assistant-msg-${messages.length + 1}`;
      const newAssistantMessage: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: data.text || "Handshake occurred but returned empty response.",
        timestamp: new Date().toTimeString().split(' ')[0].substring(0, 5)
      };

      setMessages(prev => [...prev, newAssistantMessage]);
      onAudit('AI Chat Handler Engaged', `Processed engineering query on well ${selectedWell.name}`);

    } catch (e: any) {
      console.error(e);
      const assistantMsgId = `error-msg-${messages.length + 1}`;
      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        content: `### Handshake Server Network Timeout\n\nFailed to establish standard telemetry resolution. Our mechanical equations and local charts remain fully active online!`,
        timestamp: new Date().toTimeString().split(' ')[0].substring(0, 5)
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick action labels in Vietnamese
  const vietnameseQuickActions = [
    { label: 'Tại sao giếng này sụt sản lượng?', prompt: `Tại sao giếng ${selectedWell.name} lại suy giảm sản lượng? Hãy phân tích các thông số vận hành hiện tại.` },
    { label: 'ESP / Gas Lift có tối ưu không?', prompt: `Hệ thống nâng nhân tạo (${selectedWell.liftType}) của giếng ${selectedWell.name} có đang hoạt động tối ưu không? Đề xuất thay đổi tần số (Hz) hoặc lượng khí ép thích hợp.` },
    { label: 'Dự báo kinh tế & Workover?', prompt: `Hãy tính toán hiệu quả kinh tế (NPV, ROI, payback) của dự án can thiệp workover phục hồi cho giếng ${selectedWell.name} dựa trên mức tăng sản lượng dự kiến.` },
    { label: 'SPE Paper khuyên gì?', prompt: `Dựa trên tài liệu SPE, hãy gợi ý cho tôi các kinh nghiệm thực tế (lessons learned) tốt nhất để xử lý vấn đề hiện tại của ${selectedWell.name}.` }
  ];

  return (
    <div id="ai-copilot-container" className="flex flex-col lg:flex-row gap-6 bg-[#0B1120] border border-slate-800 rounded-xl overflow-hidden shadow-xl min-h-[500px]">
      
      {/* Dynamic parameters briefing (3 cols) */}
      <div id="ai-chat-parameter-briefing" className="lg:col-span-4 bg-[#0B1120] p-4 border-r lg:border-r border-slate-850 flex flex-col justify-between shrink-0">
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2.5">
            <Layers className="w-4 h-4 text-cyan-400 font-bold" />
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase font-mono">Telemetry Datafeed</span>
          </div>

          <div className="bg-[#050812] p-3 rounded-lg border border-slate-850 space-y-3 font-mono text-xs">
            <span className="text-cyan-400 font-bold block">ACTIVE WELL TELEMETRY:</span>
            <div className="space-y-1.5 break-all">
              <div>Bore Hole ID: <strong className="text-slate-250">{selectedWell.name}</strong></div>
              <div>Lift Type: <strong className="text-slate-250">{selectedWell.liftType}</strong></div>
              <div>Liquid Flow: <strong className="text-slate-250">{selectedWell.liquidRate} bpd</strong></div>
              <div>Water Cut: <strong className="text-blue-400">{selectedWell.waterCut}%</strong></div>
              <div>Oil Clean: <strong className="text-emerald-400">{selectedWell.oilRate} bopd</strong></div>
              <div>Formation Skin: <strong className={selectedWell.skinFactor > 8 ? "text-rose-400" : "text-slate-250"}>{selectedWell.skinFactor}</strong></div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-850">
          <div className="flex items-center space-x-1.5 text-emerald-500/80 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">SECURED ENDPOINT</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono leading-snug">All conversations are fully proxy-nested client-side to prevent credential leakage.</p>
        </div>
      </div>

      {/* Primary chat workspace (8 cols) */}
      <div id="ai-chat-terminal" className="flex-1 flex flex-col justify-between bg-[#050812] min-h-[460px]">
        {/* Chat window viewport */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 h-[350px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950">
          {messages.map((m) => {
            const isBot = m.role === 'assistant';
            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-[85%] ${isBot ? 'mr-auto items-start' : 'ml-auto flex-row-reverse items-start'}`}
              >
                {/* User avatar indicator */}
                <div className={`p-1.5 rounded-lg shrink-0 ${isBot ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-800 text-slate-300'}`}>
                  {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Message bubble background */}
                <div className={`p-3 rounded-xl border ${
                  isBot 
                    ? 'bg-[#0B1120] border-slate-800 text-xs text-slate-300 leading-relaxed font-sans select-text whitespace-pre-line' 
                    : 'bg-cyan-950/20 border-cyan-800/40 text-xs text-slate-200 leading-relaxed font-mono select-text'
                }`}>
                  {m.content}
                  <span className="block text-[9px] text-slate-500 font-mono text-right mt-1.5">{m.timestamp}</span>
                </div>
              </div>
            );
          })}
          
          {isLoading && (
            <div className="flex gap-3 items-center mr-auto">
              <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg animate-spin">
                <RefreshCw className="w-4 h-4" />
              </div>
              <p className="text-[11px] text-slate-500 font-mono tracking-wider animate-pulse">Engaging multi-agent diagnostic core...</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestion Quick actions in Vietnamese */}
        <div className="bg-[#0B1120]/40 border-t border-slate-850 p-3">
          <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mb-1.5">Gợi ý chẩn đoán nhanh cho {selectedWell.name}:</p>
          <div className="grid grid-cols-2 gap-2">
            {vietnameseQuickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectSuggested(action.prompt)}
                disabled={isLoading}
                className="text-left bg-[#050812] hover:bg-slate-800/20 border border-slate-850 text-[10px] text-slate-300 font-mono py-1.5 px-2.5 rounded hover:border-cyan-800 transition-all truncate disabled:opacity-50 cursor-pointer"
              >
                ✦ {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Console operational typing field */}
        <div className="bg-[#050812] p-3 border-t border-slate-850">
          <form 
            onSubmit={(e) => { e.preventDefault(); sendMessage(userInput); }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={userInput}
              placeholder="Ask me anything: 'Tại sao giếng sụt sản lượng?'"
              disabled={isLoading}
              onChange={(e) => setUserInput(e.target.value)}
              className="flex-1 bg-[#0B1120] text-xs font-mono text-slate-100 py-2 px-3 border border-slate-800 rounded-lg focus:border-cyan-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !userInput.trim()}
              className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold p-2 rounded-lg transition-colors flex items-center justify-center disabled:opacity-40 shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
