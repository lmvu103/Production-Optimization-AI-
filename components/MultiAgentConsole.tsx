'use client';

import React, { useState, useMemo } from 'react';
import { Cpu, CheckCircle, Database, AlertCircle, CircleDot, Activity, Server, Clock, ChevronRight } from 'lucide-react';
import { Well } from '../lib/oilfieldData';

interface MultiAgentConsoleProps {
  wells: Well[];
  selectedWell: Well;
  onAudit: (action: string, details: string) => void;
}

interface AgentIdentity {
  name: string;
  role: string;
  status: 'IDLE' | 'COMPUTING' | 'SUCCESS';
  color: string;
}

interface LogMessage {
  time: string;
  agent: string;
  message: string;
  type: 'info' | 'thinking' | 'success' | 'alert';
}

const DEFAULT_MOCK_WELLS: Well[] = [
  {
    id: 'well-prod-01',
    name: 'PROD-01',
    status: 'OPTIMAL',
    liftType: 'ESP',
    measuredDepth: 8500,
    reservoirPressure: 3200,
    wellheadPressure: 210,
    reservoirDepth: 8200,
    tubingID: 2.441,
    liquidRate: 1200,
    oilRate: 700,
    waterCut: 41.7,
    gor: 320,
    productivityIndex: 1.8,
    skinFactor: 1.2,
    bubblePointPressure: 1400,
    espHz: 55,
    activeAlerts: [],
    diagnosticComments: 'Giếng khai thác tối ưu bằng bơm ESP tốc độ cao. Các thông số vận hành đều nằm trong biên độ thiết kế lý tưởng.',
    history: []
  },
  {
    id: 'well-prod-03',
    name: 'PROD-03',
    status: 'CRITICAL',
    liftType: 'Natural Flow',
    measuredDepth: 9100,
    reservoirPressure: 2800,
    wellheadPressure: 95,
    reservoirDepth: 8800,
    tubingID: 2.992,
    liquidRate: 600,
    oilRate: 570,
    waterCut: 5.0,
    gor: 450,
    productivityIndex: 0.6,
    skinFactor: 14.8,
    bubblePointPressure: 1250,
    activeAlerts: ['Skin Damage Alert', 'Low Productivity Index (PI < 1.0)'],
    diagnosticComments: 'Giếng tự phun đang gặp tổn trở cơ học nghiêm trọng vùng cận đáy giếng (Skin Factor +14.8). Cần tiến hành bắn rửa acid để phục hồi lưu lượng.',
    history: []
  }
];

export default function MultiAgentConsole({ wells, selectedWell, onAudit }: MultiAgentConsoleProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationTitle, setSimulationTitle] = useState('All Systems Nominal');
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [recommendationResult, setRecommendationResult] = useState<string | null>(null);

  const [agents, setAgents] = useState<AgentIdentity[]>([
    { name: 'Coordinator Agent', role: 'Team Lead / System Aggregator', status: 'IDLE', color: 'text-indigo-400 border-indigo-500/20' },
    { name: 'Surveillance Agent', role: 'Real-Time SCADA Monitor', status: 'IDLE', color: 'text-rose-400 border-rose-500/20' },
    { name: 'Well Diagnostics Agent', role: 'Mechanical & Tubing Auditor', status: 'IDLE', color: 'text-cyan-400 border-cyan-500/20' },
    { name: 'Reservoir Analysis Agent', role: 'Drive & Inflow Specialist', status: 'IDLE', color: 'text-teal-400 border-teal-500/20' },
    { name: 'Artificial Lift Agent', role: 'ESP & Gas Lift Specialist', status: 'IDLE', color: 'text-emerald-400 border-emerald-500/20' },
    { name: 'Economic Evaluation Agent', role: 'Financial NPV Cash auditor', status: 'IDLE', color: 'text-yellow-400 border-yellow-500/20' },
    { name: 'Recommendation Agent', role: 'Priority & Ranking Engine', status: 'IDLE', color: 'text-purple-400 border-purple-500/20' },
    { name: 'Report Writer Agent', role: 'Automated SPE Documenter', status: 'IDLE', color: 'text-pink-400 border-pink-500/20' },
  ]);

  const [logs, setLogs] = useState<LogMessage[]>([
    { time: '13:03:35', agent: 'Coordinator Agent', message: 'All 8 monitoring pipelines initialized on sandbox. Listening for SCADA triggers...', type: 'info' }
  ]);

  // Compute available wells from database, excluding PROD-02 and PROD-04
  const availableWells = useMemo(() => {
    const rawWells = (wells && wells.length > 0 && wells[0].id !== 'well-none') ? wells : DEFAULT_MOCK_WELLS;
    return rawWells.filter(w => {
      const nameClean = w.name?.toUpperCase().replace(/[\s\-_]/g, '') || '';
      return nameClean !== 'PROD02' && nameClean !== 'PROD04' && nameClean !== 'PRO02' && nameClean !== 'PRO04';
    });
  }, [wells]);

  const [selectedTriggerWellId, setSelectedTriggerWellId] = useState<string>('');

  const activeTriggerWell = useMemo(() => {
    if (selectedTriggerWellId) {
      const found = availableWells.find(w => w.id === selectedTriggerWellId);
      if (found) return found;
    }
    return availableWells[0] || null;
  }, [availableWells, selectedTriggerWellId]);

  const appendLog = (agent: string, message: string, type: 'info' | 'thinking' | 'success' | 'alert') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setLogs(prev => [...prev, { time: timeStr, agent, message, type }]);
  };

  const updateAgentState = (name: string, status: 'IDLE' | 'COMPUTING' | 'SUCCESS') => {
    setAgents(prev => prev.map(a => a.name === name ? { ...a, status } : a));
  };

  const runWellDiagnostics = (targetWell: Well) => {
    if (isSimulating) return;
    setIsSimulating(true);
    setConfidenceScore(0);
    setRecommendationResult(null);
    setSimulationTitle(`Live SCADA Diagnostics: Well ${targetWell.name}`);
    setLogs([]);
    setAgents(prev => prev.map(a => ({ ...a, status: 'IDLE' })));

    // 1. Coordinator Agent Initialized
    setTimeout(() => {
      appendLog('Coordinator Agent', `Nhận yêu cầu phân tích SCADA. Đang khởi chạy quy trình giám sát đa tác nhân cho giếng ${targetWell.name} (${targetWell.liftType}).`, 'info');
      updateAgentState('Coordinator Agent', 'COMPUTING');
    }, 200);

    // 2. Surveillance Agent - Water Cut & Rates
    setTimeout(() => {
      const isHighWaterCut = targetWell.waterCut > 70;
      const statusMsg = targetWell.status === 'DOWN' ? 'Giếng hiện đang đóng dòng (SI).' : 'Giếng đang trong trạng thái khai thác.';
      appendLog('Surveillance Agent', `Đã phân tích lịch sử SCADA. Lưu lượng chất lỏng đạt ${targetWell.liquidRate} bpd, lưu lượng dầu đạt ${targetWell.oilRate} bopd. Tỷ lệ ngập nước (Water Cut) là ${targetWell.waterCut}%. ${statusMsg}`, isHighWaterCut ? 'alert' : 'info');
      updateAgentState('Surveillance Agent', 'SUCCESS');
    }, 1200);

    // 3. Well Diagnostics Agent - Tubing layout
    setTimeout(() => {
      appendLog('Well Diagnostics Agent', `Đánh giá thiết kế cơ học: Đường kính tubing = ${targetWell.tubingID} inches. Chiều sâu lòng giếng đạt ${targetWell.measuredDepth} ft. Tình trạng cơ học danh định.`, 'thinking');
      updateAgentState('Well Diagnostics Agent', 'SUCCESS');
    }, 2400);

    // 4. Reservoir Analysis Agent - pressure & skin
    setTimeout(() => {
      const isDamaged = targetWell.skinFactor > 5;
      const skinMsg = isDamaged 
        ? `Phát hiện tổn thất cận đáy giếng lớn (Skin Factor S = +${targetWell.skinFactor}). Khả năng cao do lắng đọng cát lắng hoặc phân lớp hữu cơ.`
        : `Chỉ số Skin Factor ổn định (S = +${targetWell.skinFactor}). Khả năng truyền dẫn vỉa tốt.`;
      appendLog('Reservoir Analysis Agent', `Phân tích thông số vỉa chứa: Áp suất vỉa = ${targetWell.reservoirPressure} psi, Chỉ số năng suất PI = ${targetWell.productivityIndex} bpd/psi. ${skinMsg}`, isDamaged ? 'alert' : 'info');
      updateAgentState('Reservoir Analysis Agent', 'SUCCESS');
    }, 3600);

    // 5. Artificial Lift Agent - lift specific parameters
    setTimeout(() => {
      let liftMsg = `Giếng đang tự phun (Natural Flow) dựa trên áp suất vỉa tự nhiên.`;
      if (targetWell.liftType === 'ESP') {
        liftMsg = `Hệ thống bơm điện chìm (ESP) đang chạy ở tần số ${targetWell.espHz || 50} Hz. Kiểm tra dòng tải motor ổn định.`;
      } else if (targetWell.liftType === 'Gas Lift') {
        liftMsg = `Hệ thống van khai thác Gas Lift phân bổ lưu lượng bơm đạt ${targetWell.gasLiftInjectionRate || 1.2} MMscf/d.`;
      } else if (targetWell.liftType === 'Plunger Lift') {
        liftMsg = `Chu kỳ di chuyển của plunger hoạt động ổn định, loại bỏ hiện tượng ngập lỏng cột chất lỏng.`;
      }
      appendLog('Artificial Lift Agent', liftMsg, 'info');
      updateAgentState('Artificial Lift Agent', 'SUCCESS');
    }, 4800);

    // 6. Economic Evaluation Agent - ROI/NPV
    setTimeout(() => {
      let treatmentType = "Tối ưu hóa chung";
      let capex = 50000;
      let profit = 85000;
      
      if (targetWell.waterCut > 70) {
        treatmentType = "Bơm ép hóa phẩm Gel Polymer đóng nước";
        capex = 145000;
        profit = 182000;
      } else if (targetWell.skinFactor > 5) {
        treatmentType = "Bắn rửa Acid vùng cận đáy giếng";
        capex = 120000;
        profit = 742000;
      } else if (targetWell.liftType === 'Natural Flow') {
        treatmentType = "Lắp đặt và chuyển đổi sang thiết bị nâng nhân tạo (ESP)";
        capex = 220000;
        profit = 450000;
      }
      
      appendLog('Economic Evaluation Agent', `Thẩm định hiệu quả kinh tế: Chi phí xử lý đề xuất [${treatmentType}] tương đương $${capex.toLocaleString()}. Dự kiến đem lại dòng tiền ròng NPV lũy kế tăng thêm +$${profit.toLocaleString()}.`, 'info');
      updateAgentState('Economic Evaluation Agent', 'SUCCESS');
    }, 6000);

    // 7. Recommendation Agent - Ranking priority
    setTimeout(() => {
      let priorityScore = 70;
      if (targetWell.status === 'CRITICAL') priorityScore = 95;
      else if (targetWell.status === 'UNDERPERFORMER') priorityScore = 80;
      else if (targetWell.status === 'DOWN') priorityScore = 85;
      
      appendLog('Recommendation Agent', `Xếp hạng ưu tiên hoạt động can thiệp cho giếng ${targetWell.name}. Điểm số Copilot Priority Score đạt ${priorityScore}/100.`, 'success');
      updateAgentState('Recommendation Agent', 'SUCCESS');
    }, 7200);

    // 8. Report Writer Agent - Documentation
    setTimeout(() => {
      appendLog('Report Writer Agent', `Biên soạn biểu mẫu can thiệp kỹ thuật giếng ${targetWell.name} gửi hệ thống RAG nội bộ.`, 'info');
      updateAgentState('Report Writer Agent', 'SUCCESS');
    }, 8200);

    // 9. Coordinator Agent Wrap-Up
    setTimeout(() => {
      let activePriorityScore = 70;
      if (targetWell.status === 'CRITICAL') activePriorityScore = 95;
      else if (targetWell.status === 'UNDERPERFORMER') activePriorityScore = 80;
      else if (targetWell.status === 'DOWN') activePriorityScore = 85;

      let recAction = `Khuyến nghị duy trì chế độ giám sát dòng SCADA định kỳ cho giếng ${targetWell.name}.`;
      if (targetWell.waterCut > 70) {
        recAction = `HÀNH ĐỘNG KHUYẾN NGHỊ: Khai thác tầng cát phát sinh ngập nước cao (${targetWell.waterCut}%). Thực hiện đặt Packer cơ học cô lập tầng ngập nước đáy, giảm tỷ lệ ngập nước xuống dưới 52%, tức thời giải phóng công suất vận hành pipeline thêm ${Math.round(targetWell.liquidRate * 0.15)} bopd (NPV: +$182,000).`;
      } else if (targetWell.skinFactor > 5) {
        recAction = `HÀNH ĐỘNG KHUYẾN NGHỊ: Hệ số Skin Factor cao cực đoan (+${targetWell.skinFactor}) gây suy giảm PI. Thực hiện bắn rửa Acid hóa vỉa cát kết cận giếng (Matrix Acidizing HCl/HF) để giảm Skin về mức tối ưu +1.2. Khai thông hoàn toàn lắng đọng cát, khôi phục lưu lượng dầu +${targetWell.oilRate + 150} bopd.`;
      } else if (targetWell.liftType === 'Natural Flow') {
        recAction = `HÀNH ĐỘNG KHUYẾN NGHỊ: Xem xét chuyển đổi sang hệ thống bơm ESP cho giếng nhằm đối phó với hiện tượng suy giảm áp suất vỉa tự nhiên theo thời gian, đảm bảo duy trì vận tốc quét lỏng.`;
      } else if (targetWell.liftType === 'ESP') {
        recAction = `HÀNH ĐỘNG KHUYẾN NGHỊ: Tối ưu tần số vận hành biến tần ESP lên mức ${Math.min(65, (targetWell.espHz || 50) + 5)} Hz để ổn định vị trí tâm dốc bơm, tránh rủi ro xâm thực rotor.`;
      } else if (targetWell.liftType === 'Gas Lift') {
        recAction = `HÀNH ĐỘNG KHUYẾN NGHỊ: Hiệu chỉnh tăng áp suất nén khí Gas Lift thêm 0.5 MMscf/d hỗ trợ giảm tỷ trọng cột dâng nước nặng.`;
      }

      appendLog('Coordinator Agent', `Tổng hợp kết quả phân tích cho giếng ${targetWell.name}. Toàn bộ luồng phân tích hệ thống hoàn thành.`, 'success');
      updateAgentState('Coordinator Agent', 'SUCCESS');
      setConfidenceScore(activePriorityScore);
      setRecommendationResult(recAction);
      setIsSimulating(false);
      
      onAudit('SCADA Diagnostic Executed', `Multi-Agent monitored telemetry diagnostics for well ${targetWell.name}. Resolved confidence index ${activePriorityScore}/100.`);
    }, 9200);
  };

  const clearSandboxConsole = () => {
    setLogs([
      { time: '13:03:35', agent: 'Coordinator Agent', message: 'All pipeline agents reset. Standing by for SCADA triggers.', type: 'info' }
    ]);
    setRecommendationResult(null);
    setConfidenceScore(0);
    setSimulationTitle('All Systems Nominal');
    setAgents(prev => prev.map(a => ({ ...a, status: 'IDLE' })));
  };

  return (
    <div id="multi-agent-system" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* List of active AI Specialists (4 cols) */}
      <div id="agents-directory" className="lg:col-span-4 flex flex-col space-y-4">
        <div className="bg-[#0B1120] border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 mb-4">
            <Server className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono">Specialist Core</h3>
          </div>
          
          <div className="flex flex-col space-y-3">
            {agents.map((agent, i) => (
              <div 
                key={i} 
                className={`flex justify-between items-center bg-[#050812] p-2.5 rounded-lg border ${
                  agent.status === 'COMPUTING' 
                    ? 'border-cyan-500 shadow-sm shadow-cyan-950 bg-slate-900/60' 
                    : agent.status === 'SUCCESS'
                    ? 'border-emerald-500/30'
                    : 'border-slate-850'
                }`}
              >
                <div>
                  <span className={`text-xs font-bold block ${agent.color} font-mono`}>{agent.name}</span>
                  <span className="text-[10px] text-slate-500 font-sans">{agent.role}</span>
                </div>
                
                <div>
                  {agent.status === 'IDLE' && (
                    <span className="text-[9px] bg-slate-800/85 text-slate-400 px-2 py-0.5 rounded font-mono border border-slate-700">IDLE</span>
                  )}
                  {agent.status === 'COMPUTING' && (
                    <span className="text-[9px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded font-mono border border-cyan-800 animate-pulse">SOLVING</span>
                  )}
                  {agent.status === 'SUCCESS' && (
                    <span className="text-[9px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-mono border border-emerald-800 flex items-center gap-1">
                      <CheckCircle className="w-2.5 h-2.5" /> RESOLVED
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic selector based on available wells in database excluding PROD-02 and PROD-04 */}
        <div className="bg-[#0B1120] border border-slate-800 p-4 rounded-xl flex flex-col space-y-3">
          <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono mb-1 border-b border-slate-800 pb-1">SCADA Diagnostics Triggers</p>
          
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-mono block">DATABASE WELL SELECTOR:</span>
            <select
              id="scada-trigger-well-dropdown"
              value={activeTriggerWell?.id || ''}
              onChange={(e) => setSelectedTriggerWellId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono py-2 px-2.5 rounded-lg focus:border-cyan-500 focus:outline-none cursor-pointer h-[36px]"
            >
              {availableWells.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.liftType} - PI: {w.productivityIndex})
                </option>
              ))}
            </select>
          </div>

          <button
            id="run-scada-well-diagnostics-btn"
            onClick={() => activeTriggerWell && runWellDiagnostics(activeTriggerWell)}
            disabled={isSimulating || !activeTriggerWell}
            className="w-full text-left bg-[#050812] hover:bg-[#0B1120]/65 border border-slate-850 text-xs text-slate-205 font-mono py-2.5 px-3 rounded-lg flex items-center justify-between transition-all group disabled:opacity-50 cursor-pointer"
          >
            <span>Run diagnostics on {activeTriggerWell?.name || 'database well'}</span>
            <ChevronRight className="w-3.5 h-3.5 text-cyan-500 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            id="reset-sandbox-cores-btn"
            onClick={clearSandboxConsole}
            disabled={isSimulating}
            className="w-full bg-[#050812] hover:bg-slate-800 text-slate-300 text-[10px] uppercase font-mono font-bold py-1.5 rounded transition-all text-center mt-2 border border-slate-800 cursor-pointer"
          >
            Reset Specialist Core Threads
          </button>
        </div>
      </div>

      {/* Realtime Terminal Console Output (8 cols) */}
      <div id="logs-terminal" className="lg:col-span-8 flex flex-col justify-between bg-[#0B1120] border border-slate-800 rounded-xl overflow-hidden shadow-lg min-h-[460px]">
        {/* Terminal Header */}
        <div className="bg-[#050812] px-4 py-3 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4] animate-pulse"></span>
            <span className="text-xs font-bold text-slate-200 font-mono uppercase">{simulationTitle}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Threads Active: 8</span>
        </div>

        {/* Console logs output */}
        <div className="flex-1 bg-[#050812] p-4 font-mono text-xs overflow-y-auto space-y-2 h-[320px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950">
          {logs.map((log, idx) => {
            let textColor = 'text-slate-300';
            let labelSymbol = '✦';
            if (log.type === 'thinking') {
              textColor = 'text-cyan-400';
              labelSymbol = '⚙';
            } else if (log.type === 'success') {
              textColor = 'text-emerald-400';
              labelSymbol = '✔';
            } else if (log.type === 'alert') {
              textColor = 'text-rose-400';
              labelSymbol = '⚠';
            }

            return (
              <div key={idx} className="flex items-start space-x-2 leading-relaxed">
                <span className="text-slate-600 text-[10px]">{log.time}</span>
                <span className="text-slate-500">[{log.agent}]</span>
                <span className={textColor}>
                  {labelSymbol} {log.message}
                </span>
              </div>
            );
          })}
          
          {isSimulating && (
            <div className="flex items-center space-x-2 text-cyan-400 text-xs pt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="animate-pulse">Awaiting final multi-agent alignment...</span>
            </div>
          )}
        </div>

        {/* Resolved Recommendation & Consensus Card */}
        {recommendationResult && (
          <div className="bg-[#050812] p-4 border-t border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-[10px] font-mono border-b border-slate-850 pb-2">
              <span className="text-slate-400">MULTIPLE AGENT CONSENSUS STATEMENTS:</span>
              <span className="text-emerald-400 font-bold">CONFIDENCE INDEX: {confidenceScore}/100</span>
            </div>
            
            <p className="text-xs font-sans text-slate-200 leading-relaxed bg-[#0B1120] p-3 rounded-lg border border-slate-800">
              {recommendationResult}
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
