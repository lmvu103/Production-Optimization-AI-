'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Well, SPE_KNOWLEDGE_BASE, SPEPaper } from '../lib/oilfieldData';
import { Bot, User, Send, Sparkles, RefreshCw, Layers, ShieldCheck, Search, BookOpen } from 'lucide-react';

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
  
  // SPE papers inside AI workspace
  const [sidebarTab, setSidebarTab] = useState<'telemetry' | 'spe'>('spe');
  const [speSearchQuery, setSpeSearchQuery] = useState('');
  const [activeCopilotPaper, setActiveCopilotPaper] = useState<SPEPaper | null>(SPE_KNOWLEDGE_BASE[0]);
  
  const filteredSpePapers = React.useMemo(() => {
    if (!speSearchQuery) return SPE_KNOWLEDGE_BASE;
    return SPE_KNOWLEDGE_BASE.filter(p => 
      p.title.toLowerCase().includes(speSearchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(speSearchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(speSearchQuery.toLowerCase()) ||
      p.summary.toLowerCase().includes(speSearchQuery.toLowerCase())
    );
  }, [speSearchQuery]);

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
      <div id="ai-chat-parameter-briefing" className="lg:col-span-4 bg-[#0B1120] p-4 border-r lg:border-r border-slate-850 flex flex-col justify-between shrink-0 lg:w-[350px]">
        <div className="space-y-4">
          
          {/* Sub Tab Navigation */}
          <div className="flex bg-[#050812] p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setSidebarTab('telemetry')}
              className={`flex-1 text-center py-1.5 rounded text-[10px] uppercase font-mono font-bold tracking-wider transition-all ${
                sidebarTab === 'telemetry' 
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700/60 font-semibold' 
                  : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              Telemetry feed
            </button>
            <button
              onClick={() => setSidebarTab('spe')}
              className={`flex-1 text-center py-1.5 rounded text-[10px] uppercase font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                sidebarTab === 'spe' 
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700/60 font-semibold' 
                  : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              <BookOpen className="w-3 h-3" /> SPE Papers
            </button>
          </div>

          {sidebarTab === 'telemetry' ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
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
          ) : (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                <BookOpen className="w-4 h-4 text-cyan-400 font-bold" />
                <span className="text-xs font-bold tracking-widest text-slate-400 uppercase font-mono">SPE Grounding reference</span>
              </div>

              {/* Compact search input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={speSearchQuery}
                  placeholder="Kiếm cứu tài liệu SPE..."
                  onChange={(e) => setSpeSearchQuery(e.target.value)}
                  className="w-full bg-[#050812] text-[10px] text-slate-100 font-mono pl-8 pr-2 py-1.5 border border-slate-850 rounded-lg focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Filtered list of papers */}
              <div className="space-y-1 max-h-[130px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredSpePapers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActiveCopilotPaper(p)}
                    className={`w-full text-left p-1.5 rounded border text-[10px] font-mono transition-all block cursor-pointer ${
                      activeCopilotPaper?.id === p.id 
                        ? 'bg-slate-855 border-cyan-500/50 text-cyan-400' 
                        : 'bg-[#050812] border-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-center opacity-75 text-[8px] mb-0.5">
                      <span>{p.code}</span>
                      <span>{p.category}</span>
                    </div>
                    <p className="font-semibold truncate leading-none">{p.title}</p>
                  </button>
                ))}
              </div>

              {/* Active paper details */}
              {activeCopilotPaper && (
                <div className="bg-[#050812] p-2.5 rounded border border-slate-850 space-y-1.5 text-[10px] max-h-[190px] overflow-y-auto scrollbar-thin">
                  <div className="border-b border-slate-850 pb-1 flex justify-between items-center">
                    <span className="font-bold text-slate-300 font-mono text-[9px] uppercase tracking-wider">{activeCopilotPaper.code}</span>
                    <span className="text-[8px] bg-slate-800 text-slate-400 font-mono px-1 py-0.5 rounded leading-none">{activeCopilotPaper.year}</span>
                  </div>
                  <p className="font-bold text-slate-200 leading-tight">{activeCopilotPaper.title}</p>
                  <p className="text-slate-400 leading-normal font-sans text-[9px] line-clamp-3">{activeCopilotPaper.summary}</p>
                  
                  <button
                    onClick={() => {
                      sendMessage(`Hãy tư vấn chi tiết về tài liệu ${activeCopilotPaper.code} ("${activeCopilotPaper.title}") có các chỉ dẫn: ${activeCopilotPaper.guidelines.join('; ')}. Hãy áp dụng nghiên cứu này để chẩn đoán hoặc đưa ra giải pháp vận hành tối ưu cho giếng ${selectedWell.name} (${selectedWell.liftType}).`);
                      onAudit('SPE Paper Injected Into Copilot', `Consulted paper ${activeCopilotPaper.code} guidelines for well ${selectedWell.name}`);
                    }}
                    className="w-full bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-400 border border-cyan-800/30 font-mono py-1 rounded text-[9px] font-bold uppercase transition-all mt-1 cursor-pointer flex items-center justify-center gap-1"
                  >
                    ✦ Chat về tài liệu này
                  </button>
                </div>
              )}
            </div>
          )}

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
