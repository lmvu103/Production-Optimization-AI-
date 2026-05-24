'use client';

import React, { useState } from 'react';
import { Cpu, CheckCircle, Database, AlertCircle, CircleDot, Activity, Server, Clock, ChevronRight } from 'lucide-react';

interface MultiAgentConsoleProps {
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

export default function MultiAgentConsole({ onAudit }: MultiAgentConsoleProps) {
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

  const appendLog = (agent: string, message: string, type: 'info' | 'thinking' | 'success' | 'alert') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setLogs(prev => [...prev, { time: timeStr, agent, message, type }]);
  };

  const updateAgentState = (name: string, status: 'IDLE' | 'COMPUTING' | 'SUCCESS') => {
    setAgents(prev => prev.map(a => a.name === name ? { ...a, status } : a));
  };

  const runWaterBreakthroughAudit = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setConfidenceScore(0);
    setRecommendationResult(null);
    setSimulationTitle('Water Breakthrough & Aquifer Remediation Audit');
    setLogs([]);

    // Step-by-step timeout logging to represent Multi-Agent workflow
    setTimeout(() => {
      appendLog('Coordinator Agent', 'Received technical request to execute water shutoff (WSO) audit on Well PROD-02.', 'info');
      updateAgentState('Coordinator Agent', 'COMPUTING');
    }, 200);

    setTimeout(() => {
      appendLog('Surveillance Agent', 'Ingested daily water cut history. PROD-02 water cut increased from 42% to 80% with immediate reservoir fluid gradient increases.', 'info');
      updateAgentState('Surveillance Agent', 'SUCCESS');
    }, 1000);

    setTimeout(() => {
      appendLog('Well Diagnostics Agent', 'Evaluating injection valves and dual completions. Internal gradients confirm water breakthrough isn\'t mechanical tubing leaks. Source: Aquifer water coning.', 'thinking');
      updateAgentState('Well Diagnostics Agent', 'SUCCESS');
    }, 2200);

    setTimeout(() => {
      appendLog('Reservoir Analysis Agent', 'Reviewing fluid mobility ratios. Aquifer edge water drive holds pressure but restricts original oil saturation zones near-wellbore.', 'thinking');
      updateAgentState('Reservoir Analysis Agent', 'SUCCESS');
    }, 3400);

    setTimeout(() => {
      appendLog('Artificial Lift Agent', 'ESP output has slugged. Gas lift allocated rate of 1.2 MMscf/d is insufficient to sweep heavy water cut column safely.', 'alert');
      updateAgentState('Artificial Lift Agent', 'SUCCESS');
    }, 4600);

    setTimeout(() => {
      appendLog('Economic Evaluation Agent', 'Calculating financial impact. Gel water-shutoff treatment CAPEX ($145,000) vs estimated 220 bopd incremental oil. NPV = +$182,000.', 'info');
      updateAgentState('Economic Evaluation Agent', 'SUCCESS');
    }, 5800);

    setTimeout(() => {
      appendLog('Recommendation Agent', 'Ranked Gel Polymer treatments side-by-side with localized ESP redesign. Gel Polymer treatment yields a priority score of 82/100.', 'success');
      updateAgentState('Recommendation Agent', 'SUCCESS');
    }, 7000);

    setTimeout(() => {
      appendLog('Report Writer Agent', 'Generated draft SPE Water Shutoff Optimization layout in buffer caches.', 'info');
      updateAgentState('Report Writer Agent', 'SUCCESS');
    }, 8000);

    setTimeout(() => {
      appendLog('Coordinator Agent', 'Aggregated all sub-agent findings. Audit completed with High Confidence. Recommending localized mechanical pack-off combined with Gas Lift valve redesign.', 'success');
      updateAgentState('Coordinator Agent', 'SUCCESS');
      setConfidenceScore(94);
      setRecommendationResult('ACTION RECOMMENDED: Execute mechanically seated polymer packers in PROD-02. This will seal lower high-perm water thief-zones, reducing water output from 80% to ~52%, liberating immediate pipeline capacity of 220 bopd (NPV: +$182,000).');
      setIsSimulating(false);
      onAudit('Water Breakthrough Audit Completed', 'Multi-Agent pipeline analyzed well PROD-02 water influx trends. Solved Gel-Polymer WSO NPV of +$182,000.');
    }, 9000);
  };

  const runLiquidLoadingDiagnostics = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setConfidenceScore(0);
    setRecommendationResult(null);
    setSimulationTitle('Liquid Loading & Loading Fluid Log Diagnostics');
    setLogs([]);

    setTimeout(() => {
      appendLog('Coordinator Agent', 'Handshaking surveillance arrays on Well PROD-04. Logging intermittent flow drop-offs.', 'info');
      updateAgentState('Coordinator Agent', 'COMPUTING');
    }, 200);

    setTimeout(() => {
      appendLog('Surveillance Agent', 'SCADA alert active: Well ceased natural flows during testing in April. Wellhead holding static gas pressure (~45 psi).', 'alert');
      updateAgentState('Surveillance Agent', 'SUCCESS');
    }, 1200);

    setTimeout(() => {
      appendLog('Well Diagnostics Agent', 'Tubing evaluation: 2.375" string diameter. Turner Critical Velocity math resolved: Critical sweeping gas rate = 1.8 MMcf/d. Current rate: 0.1 MMcf/d.', 'thinking');
      updateAgentState('Well Diagnostics Agent', 'SUCCESS');
    }, 2500);

    setTimeout(() => {
      appendLog('Reservoir Analysis Agent', 'Reservoir pressure is 2400 psi. Formation is depletion-driven. Insufficient energy to lift fluid column naturally.', 'info');
      updateAgentState('Reservoir Analysis Agent', 'SUCCESS');
    }, 3800);

    setTimeout(() => {
      appendLog('Artificial Lift Agent', 'ESP retrofitting is unviable due to narrow 2.375" casing restriction. Recommending Plunger Lift or Velocity String retrofit.', 'info');
      updateAgentState('Artificial Lift Agent', 'SUCCESS');
    }, 5000);

    setTimeout(() => {
      appendLog('Economic Evaluation Agent', 'Plunger Lift deployment CAPEX = $65,000. Payback cycle = 4.2 Months. Net 12-month value = +$115,000.', 'info');
      updateAgentState('Economic Evaluation Agent', 'SUCCESS');
    }, 6200);

    setTimeout(() => {
      appendLog('Recommendation Agent', 'Plunger Lift candidate ranked 1st for depletion zones. Priority Index: 91/100.', 'success');
      updateAgentState('Recommendation Agent', 'SUCCESS');
    }, 7400);

    setTimeout(() => {
      appendLog('Coordinator Agent', 'Fluid diagnostics complete. Final operational agreement: Convert PROD-04 to Plunger Lift cyclical flowing.', 'success');
      updateAgentState('Coordinator Agent', 'SUCCESS');
      setConfidenceScore(89);
      setRecommendationResult('ACTION RECOMMENDED: Depletion has created critical liquid loading in PROD-04. Deploy a mechanical Plunger Lift system with cycling flow controls to intermittently sweep static wellbore columns. Recovers immediate flowing capacity of 55 boepd.');
      setIsSimulating(false);
      onAudit('Liquid Loading Diagnostics Executed', 'PROD-04 analyzed for Turner critical velocities. Plunger lift recommended.');
    }, 8500);
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

        {/* Manual selection buttons */}
        <div className="bg-[#0B1120] border border-slate-800 p-4 rounded-xl flex flex-col space-y-2">
          <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono mb-2 border-b border-slate-800 pb-1">SCADA Diagnostics Triggers</p>
          <button
            onClick={runWaterBreakthroughAudit}
            disabled={isSimulating}
            className="w-full text-left bg-[#050812] hover:bg-[#0B1120]/65 border border-slate-850 text-xs text-slate-200 font-mono py-2.5 px-3 rounded-lg flex items-center justify-between transition-all group disabled:opacity-50 cursor-pointer"
          >
            <span>Water breakthrough on PROD-02</span>
            <ChevronRight className="w-3.5 h-3.5 text-cyan-500 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button
            onClick={runLiquidLoadingDiagnostics}
            disabled={isSimulating}
            className="w-full text-left bg-[#050812] hover:bg-[#0B1120]/65 border border-slate-850 text-xs text-slate-200 font-mono py-2.5 px-3 rounded-lg flex items-center justify-between transition-all group disabled:opacity-50 cursor-pointer"
          >
            <span>Liquid Loading cease on PROD-04</span>
            <ChevronRight className="w-3.5 h-3.5 text-cyan-500 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
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
