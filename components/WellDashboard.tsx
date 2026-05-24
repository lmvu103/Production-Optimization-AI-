'use client';

import React, { useState, useMemo } from 'react';
import { Well, WELLS_DATA, SPE_KNOWLEDGE_BASE } from '../lib/oilfieldData';
import { getIPRCurve, getVLPCurve, solveOperatingPoint, calculateEconBenefit } from '../lib/engineeringMath';
import { Activity, AlertTriangle, Cpu, Droplets, Flame, HelpCircle, HardDrive, RefreshCw, Sliders, TrendingUp, DollarSign } from 'lucide-react';

interface WellDashboardProps {
  selectedWell: Well;
  onSelectWell: (well: Well) => void;
  onAudit: (action: string, details: string) => void;
}

export default function WellDashboard({ selectedWell, onSelectWell, onAudit }: WellDashboardProps) {
  // Simulator tuning parameters
  const [espHz, setEspHz] = useState<number>(selectedWell.espHz || 50);
  const [gasLift, setGasLift] = useState<number>(selectedWell.gasLiftInjectionRate || 0.5);
  const [choke, setChoke] = useState<number>(selectedWell.chokeSize || 48);

  // Overall oilfield overview KPIs on current well data
  const fieldSummary = useMemo(() => {
    let totalOil = 0;
    let totalLiq = 0;
    let activeWellsCount = 0;
    WELLS_DATA.forEach(w => {
      totalOil += w.oilRate;
      totalLiq += w.liquidRate;
      if (w.status !== 'DOWN') activeWellsCount++;
    });
    const avgWaterCut = totalLiq > 0 ? ((totalLiq - totalOil) / totalLiq) * 100 : 0;
    return {
      totalOil: Math.round(totalOil),
      totalWater: Math.round(totalLiq - totalOil),
      avgWaterCut: parseFloat(avgWaterCut.toFixed(1)),
      activeWells: activeWellsCount,
      totalWells: WELLS_DATA.length
    };
  }, []);

  // Compute operational IPR & VLP curves with simulated sliders
  const iprCurve = useMemo(() => {
    return getIPRCurve(selectedWell);
  }, [selectedWell]);

  const vlpCurve = useMemo(() => {
    // Generate VLP curve based on sliders
    const calculatedLiftType = selectedWell.liftType;
    return getVLPCurve(
      selectedWell,
      calculatedLiftType === 'Gas Lift' ? gasLift : 0,
      calculatedLiftType === 'ESP' ? espHz : 0,
      choke
    );
  }, [selectedWell, espHz, gasLift, choke]);

  // Intersection solver
  const operatingPoint = useMemo(() => {
    return solveOperatingPoint(iprCurve, vlpCurve);
  }, [iprCurve, vlpCurve]);

  // Real-time calculations of outputs & Economics
  const simulationResults = useMemo(() => {
    if (!operatingPoint) {
      return {
        flowRate: 0,
        oilRate: 0,
        unstableFlow: true,
        econ: null
      };
    }
    const flowRate = operatingPoint.q;
    const oilRate = Math.round(flowRate * (1 - selectedWell.waterCut / 100));
    const incrementalOilBopd = Math.max(0, oilRate - selectedWell.oilRate);
    
    // CAPEX assumption of implementing of tune
    let capex = 0;
    if (selectedWell.liftType === 'ESP' && Math.abs(espHz - (selectedWell.espHz || 55)) > 1) {
      capex = 3500; // ESP frequency change cost
    } else if (selectedWell.liftType === 'Gas Lift' && Math.abs(gasLift - (selectedWell.gasLiftInjectionRate || 1.2)) > 0.1) {
      capex = 2500; // gas allocation injection valving adjustment
    } else if (choke !== selectedWell.chokeSize) {
      capex = 1000; // Wellhead choke orientation
    }

    const econ = calculateEconBenefit(incrementalOilBopd, capex, 78, 6);

    return {
      flowRate,
      oilRate,
      unstableFlow: flowRate < 100, // loading danger
      econ
    };
  }, [operatingPoint, selectedWell, espHz, gasLift, choke]);

  // Find candidate selection rules to show rank
  const recommendationScore = useMemo(() => {
    let score = 50; // base score
    if (selectedWell.status === 'UNDERPERFORMER') score += 25;
    if (selectedWell.status === 'CRITICAL') score += 40;
    if (selectedWell.status === 'DOWN') score += 30;
    if (selectedWell.skinFactor > 8) score += 20; // damage candidate (Acid wash)
    if (selectedWell.liftType === 'Natural Flow' && selectedWell.reservoirPressure > 2500 && selectedWell.skinFactor > 5) score += 15;
    
    // Normalise
    return Math.min(98, score);
  }, [selectedWell]);

  const triggerOptimizationApply = () => {
    const details = `Optimized ${selectedWell.name}: ${
      selectedWell.liftType === 'ESP' ? `Tuned ESP to ${espHz}Hz` : `Adjusted gas lift to ${gasLift} MMscf/d`
    }, choke resized to ${choke}/64". Predicted oil output: ${simulationResults.oilRate} bopd. Simulating peak reservoir draw.`;
    onAudit('Well Parameter Optimization Applied', details);
  };

  // Convert coordinate datasets to SVG space (W=500, H=280)
  const svgCoordinates = useMemo(() => {
    const width = 500;
    const height = 280;
    const padding = 40;

    const maxQ = 4500;
    const maxP = 4000;

    const translatePoint = (q: number, p: number) => {
      const x = padding + (q / maxQ) * (width - padding * 2);
      const y = height - padding - (p / maxP) * (height - padding * 2);
      return { x, y };
    };

    const iprPath = iprCurve.map((pt, idx) => {
      const { x, y } = translatePoint(pt.q, pt.pwf);
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const vlpPath = vlpCurve.map((pt, idx) => {
      const { x, y } = translatePoint(pt.q, pt.pwf);
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const opPoint = operatingPoint ? translatePoint(operatingPoint.q, operatingPoint.pwf) : null;

    // generate axis labels
    const qLabels = [1000, 2000, 3000, 4000].map(q => ({
      val: q,
      x: padding + (q / maxQ) * (width - padding * 2)
    }));
    const pLabels = [1000, 2000, 3000, 4000].map(p => ({
      val: p,
      y: height - padding - (p / maxP) * (height - padding * 2)
    }));

    return { iprPath, vlpPath, opPoint, qLabels, pLabels, translatePoint, padding, width, height };
  }, [iprCurve, vlpCurve, operatingPoint]);

  return (
    <div id="oilfield-dashboard-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* SECTION 1: Field KPI Summary Banner (4 cols) */}
      <div id="field-kpi-banner" className="lg:col-span-12 grid grid-cols-2 md:grid-cols-5 gap-4 bg-[#0B1120] border border-slate-800 p-4 rounded-xl">
        <div id="kpi-oil-rate" className="flex items-center space-x-3 p-2">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-mono">Field Oil output</p>
            <p className="text-xl font-bold font-sans text-emerald-400">{fieldSummary.totalOil} bopd</p>
          </div>
        </div>

        <div id="kpi-water-rate" className="flex items-center space-x-3 p-2">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-mono">Water Output</p>
            <p className="text-xl font-bold font-sans text-blue-400">{fieldSummary.totalWater} bwpd</p>
          </div>
        </div>

        <div id="kpi-water-cut" className="flex items-center space-x-3 p-2">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-mono">Average Water Cut</p>
            <p className="text-xl font-bold font-sans text-amber-400">{fieldSummary.avgWaterCut}%</p>
          </div>
        </div>

        <div id="kpi-well-status" className="flex items-center space-x-3 p-2">
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-mono">Operations Count</p>
            <p className="text-xl font-bold font-sans text-purple-400">{fieldSummary.activeWells} / {fieldSummary.totalWells} Active</p>
          </div>
        </div>

        <div id="kpi-current-hand" className="hidden md:flex items-center space-x-3 p-2 border-l border-slate-800 pl-4 col-span-1">
          <div className="p-2 bg-[#050812] border border-slate-800 text-slate-300 rounded-lg font-mono text-xs font-semibold">
            LIVE-DATA
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-mono">SCADA Handshake</p>
            <p className="text-xs text-emerald-400 font-mono font-medium">● 200 ms Sync State</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: Wells Sidebar list (3 cols) */}
      <div id="wells-selection-pane" className="lg:col-span-3 flex flex-col space-y-4">
        <div className="bg-[#0B1120] border border-slate-800 p-4 rounded-xl flex flex-col space-y-3">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-300 font-mono border-b border-slate-800 pb-2">Well Registry</h3>
          <div className="flex flex-col space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {WELLS_DATA.map((w) => {
              const bgActive = selectedWell.id === w.id;
              let badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
              if (w.status === 'UNDERPERFORMER') badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/30";
              if (w.status === 'CRITICAL') badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/30";
              if (w.status === 'DOWN') badgeColor = "bg-slate-700/20 text-slate-400 border-slate-800";

              return (
                <button
                  id={`well-card-${w.id}`}
                  key={w.id}
                  onClick={() => onSelectWell(w)}
                  className={`flex flex-col text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    bgActive 
                      ? 'bg-[#0B1120] border-cyan-500/40 border-l-2 border-l-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                      : 'bg-[#050812] border-transparent border-l-2 border-l-transparent hover:border-slate-800/50 hover:bg-slate-800/10'
                  }`}
                >
                  <div className="flex justify-between items-center w-full mb-1">
                    <span className="font-semibold text-slate-200 text-sm font-sans">{w.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badgeColor} font-mono font-medium`}>
                      {w.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-slate-400 font-mono mt-1">
                    <div>Oil: <strong className="text-emerald-400">{w.oilRate} bopd</strong></div>
                    <div>Cut: <strong className="text-blue-400">{w.waterCut}%</strong></div>
                    <div>Type: <strong className="text-slate-300">{w.liftType}</strong></div>
                    <div>Skin: <strong className={w.skinFactor > 8 ? "text-rose-400" : "text-slate-300"}>{w.skinFactor}</strong></div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* WELL INTEGRIY NOTES */}
        <div className="bg-[#0B1120] border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-semibold text-cyan-400 uppercase tracking-widest font-mono mb-2">Technical Guidance</p>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Use the tuning sliders in the active workspace to configure synthetic operating points for the flowing stream. Real-time hydraulic balances will solve for inflow and outflow limits.
          </p>
        </div>
      </div>

      {/* SECTION 3: Main Active Well workspace & Nodal Analysis Graph (9 cols) */}
      <div id="active-well-workspace" className="lg:col-span-9 flex flex-col space-y-6">
        
        {/* Well Information & Diagnostic Details */}
        <div className="bg-[#0B1120] border border-slate-800 p-5 rounded-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 mb-4 gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-bold text-slate-100">{selectedWell.name} Workspace</h2>
                <span className="text-xs px-2.5 py-1 rounded bg-[#050812] text-slate-300 border border-slate-700 font-mono">
                  {selectedWell.liftType} System
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">Well MD: {selectedWell.measuredDepth} ft | Reservoir Depth: {selectedWell.reservoirDepth} ft | Reservoir Pr: {selectedWell.reservoirPressure} psi</p>
            </div>
            
            <div className="flex flex-col items-end">
              <span className="text-xs font-mono text-slate-400">Copilot Priority Score</span>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-black font-mono text-cyan-400">{recommendationScore}%</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-800 font-medium">RANKED</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#050812] p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono">Productivity Index (PI)</span>
              <p className="text-lg font-bold text-slate-100 font-mono">{selectedWell.productivityIndex} <span className="text-xs">b/d/psi</span></p>
            </div>
            <div className="bg-[#050812] p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono">Measured Skin Factor (S)</span>
              <p className={`text-lg font-bold font-mono ${selectedWell.skinFactor > 8 ? 'text-rose-400' : 'text-slate-100'}`}>{selectedWell.skinFactor}</p>
            </div>
            <div className="bg-[#050812] p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono">Current Fluid Velocity</span>
              <p className="text-lg font-bold text-slate-100 font-mono">{selectedWell.liquidRate} <span className="text-xs">bpd</span></p>
            </div>
            <div className="bg-[#050812] p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono">Actual Oil Produced</span>
              <p className="text-lg font-bold text-emerald-400 font-mono">{selectedWell.oilRate} <span className="text-xs">bopd</span></p>
            </div>
          </div>

          {selectedWell.activeAlerts.length > 0 && (
            <div className="mt-4 flex flex-col space-y-1 bg-rose-500/5 border border-rose-500/20 p-3 rounded-lg">
              <span className="text-[10px] font-bold text-rose-400 font-mono flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> WELL SURVEILLANCE ALERTS
              </span>
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedWell.activeAlerts.map((alert, i) => (
                  <span key={i} className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30 font-mono">
                    {alert}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 bg-[#050812] p-3 rounded-lg border border-slate-850">
            <span className="text-[10px] text-slate-400 font-mono">Field Surveillance Diagnostic Comments</span>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{selectedWell.diagnosticComments}</p>
          </div>
        </div>

        {/* Nodal Analysis & Tuning Playground (2 side-by-side or stacked layout) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Hydraulic Multi-Phase Core Simulator & Tuning Sliders */}
          <div className="bg-[#0B1120] border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono">Scenario Tuner</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4 font-sans">
                Tweak parameters to trigger synthetic multi-phase lift curves. View real-time thermodynamic corrections dynamically plotted on the Nodal grid.
              </p>

              <div className="space-y-4 border-t border-slate-800/80 pt-4">
                {/* ESP Speed Tuning */}
                {selectedWell.liftType === 'ESP' ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">ESP Motor Frequency (Hz)</span>
                      <span className="text-emerald-400 font-bold">{espHz} Hz</span>
                    </div>
                    <input
                      type="range"
                      min="35"
                      max="65"
                      step="1"
                      value={espHz}
                      onChange={(e) => setEspHz(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>35 Hz (Idle)</span>
                      <span>50 Hz (Standard)</span>
                      <span>65 Hz (Peak)</span>
                    </div>
                  </div>
                ) : selectedWell.liftType === 'Gas Lift' ? (
                  /* Gas Lift Injection speed slider */
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Gas Injection Allocation (MMscf/d)</span>
                      <span className="text-emerald-400 font-bold">{gasLift} MMscf/d</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.1"
                      value={gasLift}
                      onChange={(e) => setGasLift(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>0.1 (Minimum)</span>
                      <span>1.5 (Optimum)</span>
                      <span>3.0 (Maximum)</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-[#050812] rounded border border-slate-800 text-xs text-slate-400 font-mono text-center">
                    ESP or Gas Lift operations are deactivated for {selectedWell.name} (Natural flow completes drive).
                  </div>
                )}

                {/* Choke Valve Tuning */}
                <div className="space-y-2 border-t border-slate-800/50 pt-3">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">Wellhead Choke Size (64ths)</span>
                    <span className="text-cyan-400 font-bold">{choke}/64&quot;</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="64"
                    step="2"
                    value={choke}
                    onChange={(e) => setChoke(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>12/64&quot; (Throttled)</span>
                    <span>40/64&quot; (Standard)</span>
                    <span>64/64&quot; (Fully Open)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sim Outputs */}
            <div className="mt-5 border-t border-slate-800/85 pt-4">
              <div className="grid grid-cols-2 gap-4 bg-[#050812] p-3 rounded-lg border border-slate-850">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono">Sim Liquid Yield</span>
                  <p className="text-slate-100 font-bold font-mono text-base">
                    {simulationResults.flowRate > 0 ? `${simulationResults.flowRate} bpd` : 'UNSTABLE FLOW'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-mono">Sim Oil Output</span>
                  <p className="text-emerald-400 font-bold font-mono text-base">
                    {simulationResults.flowRate > 0 ? `${simulationResults.oilRate} bopd` : 'NO FLOW'}
                  </p>
                </div>
              </div>

              {simulationResults.econ && simulationResults.flowRate > 0 && (
                <div className="mt-3 leading-tight grid grid-cols-2 gap-2 text-xs font-mono bg-[#050812] p-2.5 rounded border border-slate-850">
                  <div className="col-span-2 text-[10px] text-slate-400">SIMULATED GAIN (6 MONTHS ECONOMIC RUN):</div>
                  <div className="text-slate-300">NPV Yield: <strong className="text-emerald-400">+${simulationResults.econ.npvUsd.toLocaleString()}</strong></div>
                  <div className="text-slate-300">Payback: <strong className="text-cyan-400">{simulationResults.econ.paybackMonths} Months</strong></div>
                </div>
              )}

              <button
                id="apply-optimized-parameters-btn"
                onClick={triggerOptimizationApply}
                className="w-full mt-4 bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold font-sans py-2.5 rounded-lg transition-all flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer shadow-lg shadow-cyan-950/40"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Inject Parameters to SCADA System</span>
              </button>
            </div>
          </div>

          {/* Interactive SVG Nodal Plot */}
          <div className="bg-[#0B1120] border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono">Nodal Analysis Plot</h3>
                </div>
                <div className="flex space-x-3 text-[10px] font-mono">
                  <span className="flex items-center gap-1 text-sky-400">
                    <span className="inline-block w-2.5 h-0.5 bg-sky-400"></span> Inflow (IPR)
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <span className="inline-block w-2.5 h-0.5 bg-red-400"></span> Outflow (VLP)
                  </span>
                </div>
              </div>

              {/* Graphic wrapper */}
              <div className="bg-[#050812] p-2 rounded-lg border border-slate-850 flex items-center justify-center relative">
                <svg
                  id="nodal-analysis-svg-plot"
                  width="100%"
                  height="260"
                  viewBox={`0 0 ${svgCoordinates.width} ${svgCoordinates.height}`}
                  className="overflow-visible"
                >
                  {/* Grid Lines */}
                  {svgCoordinates.qLabels.map((q, i) => (
                    <g key={`q-grid-${i}`}>
                      <line
                        x1={q.x}
                        y1={svgCoordinates.padding}
                        x2={q.x}
                        y2={svgCoordinates.height - svgCoordinates.padding}
                        stroke="#1e293b"
                        strokeDasharray="2"
                      />
                      <text
                        x={q.x}
                        y={svgCoordinates.height - svgCoordinates.padding + 16}
                        fill="#64748b"
                        fontSize="10"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {q.val}
                      </text>
                    </g>
                  ))}
                  
                  {svgCoordinates.pLabels.map((p, i) => (
                    <g key={`p-grid-${i}`}>
                      <line
                        x1={svgCoordinates.padding}
                        y1={p.y}
                        x2={svgCoordinates.width - svgCoordinates.padding}
                        y2={p.y}
                        stroke="#1e293b"
                        strokeDasharray="2"
                      />
                      <text
                        x={svgCoordinates.padding - 8}
                        y={p.y + 4}
                        fill="#64748b"
                        fontSize="10"
                        fontFamily="monospace"
                        textAnchor="end"
                      >
                        {p.val}
                      </text>
                    </g>
                  ))}

                  {/* Axis Borders */}
                  <line
                    x1={svgCoordinates.padding}
                    y1={svgCoordinates.height - svgCoordinates.padding}
                    x2={svgCoordinates.width - svgCoordinates.padding}
                    y2={svgCoordinates.height - svgCoordinates.padding}
                    stroke="#475569"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={svgCoordinates.padding}
                    y1={svgCoordinates.padding}
                    x2={svgCoordinates.padding}
                    y2={svgCoordinates.height - svgCoordinates.padding}
                    stroke="#475569"
                    strokeWidth="1.5"
                  />

                  {/* Title Labels */}
                  <text
                    x={svgCoordinates.width / 2}
                    y={svgCoordinates.height - 4}
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    Liquid Flow Rate Q (STB/D)
                  </text>
                  
                  <text
                    x="12"
                    y={svgCoordinates.height / 2}
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                    transform={`rotate(-90 12 ${svgCoordinates.height / 2})`}
                  >
                    Bottom Hole Pressure Pwf (PSI)
                  </text>

                  {/* Inflow IPR Curve */}
                  <path
                    d={svgCoordinates.iprPath}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                  />

                  {/* Outflow VLP Curve */}
                  <path
                    d={svgCoordinates.vlpPath}
                    fill="none"
                    stroke="#f87171"
                    strokeWidth="2.5"
                  />

                  {/* Operating Intersection Indicator */}
                  {svgCoordinates.opPoint && (
                    <g>
                      <circle
                        cx={svgCoordinates.opPoint.x}
                        cy={svgCoordinates.opPoint.y}
                        r="6"
                        fill="#22c55e"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                      <line
                        x1={svgCoordinates.opPoint.x}
                        y1={svgCoordinates.opPoint.y}
                        x2={svgCoordinates.opPoint.x}
                        y2={svgCoordinates.height - svgCoordinates.padding}
                        stroke="#22c55e"
                        strokeWidth="1"
                        strokeDasharray="3"
                      />
                      <line
                        x1={svgCoordinates.padding}
                        y1={svgCoordinates.opPoint.y}
                        x2={svgCoordinates.opPoint.x}
                        y2={svgCoordinates.opPoint.y}
                        stroke="#22c55e"
                        strokeWidth="1"
                        strokeDasharray="3"
                      />
                    </g>
                  )}
                </svg>

                {!operatingPoint && (
                  <div className="absolute inset-0 bg-slate-950/80 flex flex-col justify-center items-center p-4 rounded-lg">
                    <AlertTriangle className="w-8 h-8 text-rose-500 mb-2 animate-bounce" />
                    <p className="text-xs font-bold text-rose-300 font-mono">FLOW INSTABILITY TRIGGERED</p>
                    <p className="text-[10px] text-slate-400 text-center leading-relaxed mt-1">
                      WHP vertical loading gradients exceed reserve drive potential. Adjust tuning inputs to boost hydraulic pressure indices.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-400 font-mono leading-relaxed bg-slate-950 px-3 py-2 rounded border border-slate-850">
              <span className="text-emerald-400 font-bold">● Solved Operating Matrix:</span>{' '}
              {operatingPoint ? (
                <>
                  Flow rate holds at <span className="text-slate-200 font-bold">{operatingPoint.q} bpd</span> with drawing bottomhole pressure at <span className="text-slate-200 font-bold">{operatingPoint.pwf} psi</span>.
                </>
              ) : (
                <span className="text-rose-400">Shut-in occurred. Reservoir drive insufficient for lift routing boundaries.</span>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
