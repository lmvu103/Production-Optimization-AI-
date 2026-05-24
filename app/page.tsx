'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Well, WELLS_DATA, AuditTrail, INITIAL_AUDIT_TRAIL } from '../lib/oilfieldData';
import WellDashboard from '../components/WellDashboard';
import TechnicalCalculators from '../components/TechnicalCalculators';
import MultiAgentConsole from '../components/MultiAgentConsole';
import KnowledgeBase from '../components/KnowledgeBase';
import ReportWriter from '../components/ReportWriter';
import AIChatCopilot from '../components/AIChatCopilot';
import { Cpu, LayoutDashboard, Calculator, Network, BookOpen, FileText, Bot, Shield, List, Clock } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calculators' | 'agents' | 'rag' | 'reports' | 'chat'>('dashboard');
  const [currentWell, setCurrentWell] = useState<Well>(WELLS_DATA[1]); // Default to PROD-02 (underperforming GL) to immediately display diagnostic power!
  const [auditTrail, setAuditTrail] = useState<AuditTrail[]>(INITIAL_AUDIT_TRAIL);

  const addNewAuditEntry = (action: string, details: string) => {
    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);
    const newEntry: AuditTrail = {
      timestamp: dateStr,
      action,
      agent: 'Technical Coordinator',
      details
    };
    setAuditTrail(prev => [newEntry, ...prev]);
  };

  const selectActiveWell = (well: Well) => {
    setCurrentWell(well);
    addNewAuditEntry('Well Context Switched', `Switched telemetry monitoring focus to well ${well.name} (${well.liftType}).`);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col justify-between selection:bg-cyan-950/50 font-sans select-none">
      
      {/* 1. PRIMARY APP HEADER */}
      <header className="bg-[#0B1120] border-b border-slate-800 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center space-x-3 text-center md:text-left">
            <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)] text-black shrink-0">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xs font-bold tracking-widest text-cyan-500 uppercase font-mono">
                Production Optimization AI Copilot
              </h1>
              <p className="text-[10px] text-slate-500 font-mono">
                v4.2.0-STABLE | PRODUCTION OPTIMIZATION WORKSPACE
              </p>
            </div>
          </div>

          {/* Secure pipeline indicators */}
          <div className="flex items-center space-x-4 text-[10px] font-mono text-slate-400">
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#4ade80]"></span>
              <span>PRMS SECURE</span>
            </div>
            <div className="h-4 w-px bg-slate-800"></div>
            <div>
              <span className="text-slate-500">FOCUS WELL:</span>{' '}
              <span className="text-cyan-400 font-bold uppercase tracking-wider">{currentWell.name}</span>
            </div>
          </div>

        </div>
      </header>

      {/* 2. SUB-NAV BAR TAB SELECTOR */}
      <div className="bg-[#0B1120] border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto py-2 no-scrollbar">
            {[
              { id: 'dashboard', label: 'Surveillance Command', icon: LayoutDashboard },
              { id: 'calculators', label: 'Technical Calculators', icon: Calculator },
              { id: 'agents', label: 'Multi-Agent Sandbox', icon: Network },
              { id: 'rag', label: 'Grounding Library', icon: BookOpen },
              { id: 'reports', label: 'PDF Report Writer', icon: FileText },
              { id: 'chat', label: 'QA Engine Workspace', icon: Bot },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  id={`nav-tab-${tab.id}`}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-mono font-medium transition-all border shrink-0 ${
                    isActive 
                      ? 'bg-[#050812] border-cyan-500/30 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 3. DYNAMIC CONTENT WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'dashboard' && (
              <WellDashboard 
                selectedWell={currentWell} 
                onSelectWell={selectActiveWell} 
                onAudit={addNewAuditEntry}
              />
            )}

            {activeTab === 'calculators' && (
              <TechnicalCalculators 
                onAudit={addNewAuditEntry}
              />
            )}

            {activeTab === 'agents' && (
              <MultiAgentConsole 
                onAudit={addNewAuditEntry}
              />
            )}

            {activeTab === 'rag' && (
              <KnowledgeBase 
                onAudit={addNewAuditEntry}
              />
            )}

            {activeTab === 'reports' && (
              <ReportWriter 
                selectedWell={currentWell} 
                onAudit={addNewAuditEntry}
              />
            )}

            {activeTab === 'chat' && (
              <AIChatCopilot 
                selectedWell={currentWell} 
                onAudit={addNewAuditEntry}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 4. REAL-TIME AI AUDIT TRAIL SCULLING TABLE */}
      <footer className="bg-[#0B1120] border-t border-slate-800 p-4 shrink-0 font-mono text-[10px]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-6">
          
          <div className="md:w-1/3 space-y-2">
            <div className="flex items-center space-x-2 text-cyan-400">
              <Shield className="w-4 h-4" />
              <span className="font-bold uppercase tracking-wider">SCADA Surveillance Logs</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
              All pipeline processes, calculations, file uploads, and diagnostic audits completed are securely captured. These are stored on-workspace for regulatory compliance.
            </p>
          </div>

          <div className="md:w-2/3 border border-slate-800 rounded-lg overflow-hidden bg-[#050812] flex flex-col justify-between">
            <div className="bg-[#0B1120]/60 px-3 py-1.5 border-b border-slate-800 flex justify-between items-center font-bold">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> SECURE AUDIT LEDGER LOGS
              </span>
              <span className="text-[9px] text-emerald-400">● MULTIPLE PIPELINES STABLE</span>
            </div>

            <div className="max-h-[90px] overflow-y-auto px-3 py-2 space-y-2 divider-slate-800 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950">
              {auditTrail.map((log, idx) => (
                <div key={idx} className="flex flex-col md:flex-row justify-between items-start border-b border-slate-900 pb-1.5 last:border-0 last:pb-0 gap-1.5 md:gap-4 text-xs">
                  <span className="text-slate-600 shrink-0">{log.timestamp}</span>
                  <div className="flex-1">
                    <span className="text-cyan-400 font-bold">[{log.action}]</span>{' '}
                    <span className="text-slate-350">{log.details}</span>
                  </div>
                  <span className="text-slate-500 italic shrink-0">by {log.agent}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
