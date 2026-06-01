'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Well, WELLS_DATA, AuditTrail, INITIAL_AUDIT_TRAIL, DUMMY_FALLBACK_WELL } from '../lib/oilfieldData';
import KnowledgeBase from '../components/KnowledgeBase';
import WellDashboard from '../components/WellDashboard';
import TechnicalCalculators from '../components/TechnicalCalculators';
import MultiAgentConsole from '../components/MultiAgentConsole';
import ReportWriter from '../components/ReportWriter';
import AIChatCopilot from '../components/AIChatCopilot';
import { Cpu, LayoutDashboard, Calculator, Network, BookOpen, FileText, Bot, Shield, List, Clock } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calculators' | 'agents' | 'rag' | 'reports' | 'chat'>('rag');
  const [wells, setWells] = useState<Well[]>(WELLS_DATA);
  const [currentWellId, setCurrentWellId] = useState<string | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditTrail[]>(INITIAL_AUDIT_TRAIL);

  const currentWell = React.useMemo(() => {
    return wells.find(w => w.id === currentWellId) || wells[0] || DUMMY_FALLBACK_WELL;
  }, [wells, currentWellId]);

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
    setCurrentWellId(well.id);
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
              { id: 'rag', label: 'Data Upload', icon: BookOpen },
              { id: 'dashboard', label: 'Surveillance Command', icon: LayoutDashboard },
              { id: 'calculators', label: 'Technical Calculators', icon: Calculator },
              { id: 'agents', label: 'Multi-Agent Sandbox', icon: Network },
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
                wells={wells}
                selectedWell={currentWell} 
                onSelectWell={selectActiveWell} 
                onAudit={addNewAuditEntry}
              />
            )}

            {activeTab === 'calculators' && (
              <TechnicalCalculators 
                wells={wells}
                selectedWell={currentWell}
                onSelectWell={(id) => {
                  const targetWell = wells.find(w => w.id === id);
                  if (targetWell) selectActiveWell(targetWell);
                }}
                onAudit={addNewAuditEntry}
              />
            )}

            {activeTab === 'agents' && (
              <MultiAgentConsole 
                wells={wells}
                selectedWell={currentWell}
                onAudit={addNewAuditEntry}
              />
            )}

            {activeTab === 'rag' && (
              <KnowledgeBase 
                wells={wells}
                selectedWell={currentWell}
                onSelectWell={selectActiveWell}
                onWellsUpdate={(newWells) => {
                  setWells(prev => {
                    const updated = [...prev];
                    newWells.forEach(nw => {
                      const idx = updated.findIndex(w => w.name.toLowerCase() === nw.name.toLowerCase() || w.id === nw.id);
                      if (idx !== -1) {
                        updated[idx] = nw;
                      } else {
                        updated.push(nw);
                      }
                    });
                    return updated;
                  });
                  if (newWells.length > 0) {
                    setCurrentWellId(newWells[0].id);
                  }
                }}
                onAudit={addNewAuditEntry}
              />
            )}

            {activeTab === 'reports' && (
              <ReportWriter 
                selectedWell={currentWell} 
                wells={wells}
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

    </div>
  );
}
