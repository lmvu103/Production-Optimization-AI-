'use client';

import React, { useState, useMemo } from 'react';
import { forecastDecline, estimateReserves, calculateEconBenefit } from '../lib/engineeringMath';
import { AreaChart, Calculator, DollarSign, ListFilter, TrendingDown, Percent, Settings, Download } from 'lucide-react';

interface TechnicalCalculatorsProps {
  onAudit: (action: string, details: string) => void;
}

export default function TechnicalCalculators({ onAudit }: TechnicalCalculatorsProps) {
  const [activeTab, setActiveTab] = useState<'DCA' | 'SKIN_PI' | 'ECON'>('DCA');

  // --- DCA State ---
  const [q0, setQ0] = useState<number>(850);
  const [declineRate, setDeclineRate] = useState<number>(18); // 18% annual
  const [declineType, setDeclineType] = useState<'EXPONENTIAL' | 'HARMONIC' | 'HYPERBOLIC'>('EXPONENTIAL');
  const [bParam, setBParam] = useState<number>(0.5);
  const [abRate, setAbRate] = useState<number>(40);

  // --- SKIN & PI State ---
  const [qTest, setQTest] = useState<number>(1200);
  const [prPressure, setPrPressure] = useState<number>(3300);
  const [pwfPressure, setPwfPressure] = useState<number>(2400);
  const [idealPi, setIdealPi] = useState<number>(2.5); // Damage free ideal PI

  // --- Econ State ---
  const [incBopd, setIncBopd] = useState<number>(150);
  const [capex, setCapex] = useState<number>(120000); // $120,000 for acid job
  const [oilPrice, setOilPrice] = useState<number>(75);
  const [months, setMonths] = useState<number>(12);

  // 1. DCA computations
  const dcaCalculations = useMemo(() => {
    const decDecimal = declineRate / 100;
    const forecast = forecastDecline(q0, decDecimal, declineType, bParam, 12);
    const reserves = estimateReserves(q0, abRate, decDecimal, declineType, bParam);
    return { forecast, reserves };
  }, [q0, declineRate, declineType, bParam, abRate]);

  // 1.1 DCA SVG drawing logic
  const dcaSvgData = useMemo(() => {
    const width = 460;
    const height = 180;
    const pad = 25;
    const data = dcaCalculations.forecast;
    const maxVal = Math.max(...data, q0);

    const points = data.map((val, idx) => {
      const x = pad + (idx / (data.length - 1)) * (width - pad * 2);
      const y = height - pad - (val / maxVal) * (height - pad * 2);
      return { x, y, val };
    });

    const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x} ${height - pad} L ${points[0].x} ${height - pad} Z`
      : '';

    return { points, linePath, areaPath, width, height, pad };
  }, [dcaCalculations, q0]);

  // 2. PI & Skin computations
  const skinPiCalculations = useMemo(() => {
    const drawDown = prPressure - pwfPressure;
    if (drawDown <= 0) {
      return { pi: 0, flowEfficiency: 0, skin: 0, drawdownDanger: true };
    }
    const pi = qTest / drawDown;
    const flowEfficiency = pi / Math.max(0.1, idealPi);
    
    // Skin estimation from Flow Efficiency (FE)
    // S = 7.5 * (1/FE - 1)
    let skin = 0;
    if (flowEfficiency > 0) {
      skin = 7.5 * (1 / flowEfficiency - 1);
    }

    return {
      pi: parseFloat(pi.toFixed(2)),
      flowEfficiency: parseFloat((flowEfficiency * 100).toFixed(1)),
      skin: parseFloat(skin.toFixed(1)),
      drawdownDanger: false
    };
  }, [qTest, prPressure, pwfPressure, idealPi]);

  // 3. Economy computations
  const econCalculations = useMemo(() => {
    return calculateEconBenefit(incBopd, capex, oilPrice, months);
  }, [incBopd, capex, oilPrice, months]);

  const recordDCAAudit = () => {
    onAudit('Arps DCA Forecast Simulated', `Forecast q0=${q0}, dec=${declineRate}%, type=${declineType}. Solved EUR = ${dcaCalculations.reserves.eur} Mbo.`);
  };

  const recordSkinAudit = () => {
    onAudit('PI & Wellbore Skin Calculated', `Tested liquid=${qTest} bpd, draw=${prPressure - pwfPressure} psi. Solved PI=${skinPiCalculations.pi}, Skin=${skinPiCalculations.skin}`);
  };

  const recordEconAudit = () => {
    onAudit('Well Economic Appraisal Completed', `CAPEX=$${capex.toLocaleString()} incOil=${incBopd} bopd. Solved ROI = ${econCalculations.roiPercent}%, Payback=${econCalculations.paybackMonths} months.`);
  };

  return (
    <div id="technical-analyzers" className="bg-[#0B1120] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      
      {/* Category selector */}
      <div id="calculator-tabs" className="bg-[#050812] border-b border-slate-800 p-2 flex space-x-1">
        <button
          onClick={() => setActiveTab('DCA')}
          className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-lg transition-all flex items-center justify-center space-x-1 border cursor-pointer ${
            activeTab === 'DCA' 
              ? 'bg-[#0B1120] text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border-transparent'
          }`}
        >
          <AreaChart className="w-3.5 h-3.5" />
          <span>Decline Curve (Arps)</span>
        </button>
        <button
          onClick={() => setActiveTab('SKIN_PI')}
          className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-lg transition-all flex items-center justify-center space-x-1 border cursor-pointer ${
            activeTab === 'SKIN_PI' 
              ? 'bg-[#0B1120] text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border-transparent'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>IPR, PI & Skin Solver</span>
        </button>
        <button
          onClick={() => setActiveTab('ECON')}
          className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-lg transition-all flex items-center justify-center space-x-1 border cursor-pointer ${
            activeTab === 'ECON' 
              ? 'bg-[#0B1120] text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border-transparent'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Well Economic Appraisal</span>
        </button>
      </div>

      <div className="p-6">
        
        {/* TAB 1: DECLINE CURVE PANEL */}
        {activeTab === 'DCA' && (
          <div id="dca-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <h3 className="text-sm font-semibold tracking-wider text-slate-300 font-mono uppercase border-b border-slate-800 pb-2">Arps Parameters</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono">INITIAL RATE q0 (BOPD)</label>
                  <input
                    type="number"
                    value={q0}
                    onChange={(e) => setQ0(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-[#050812] border border-slate-800 px-3 py-1.5 rounded text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono">ANNUAL DECLINE RATE (%)</label>
                  <input
                    type="number"
                    value={declineRate}
                    onChange={(e) => setDeclineRate(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-[#050812] border border-slate-800 px-3 py-1.5 rounded text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono">DECLINE TYPE</label>
                <select
                  value={declineType}
                  onChange={(e) => setDeclineType(e.target.value as any)}
                  className="w-full bg-[#050812] border border-slate-800 px-3 py-1.5 rounded text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                >
                  <option value="EXPONENTIAL">Exponential (b = 0)</option>
                  <option value="HARMONIC">Harmonic (b = 1)</option>
                  <option value="HYPERBOLIC">Hyperbolic (0 &lt; b &lt; 1)</option>
                </select>
              </div>

              {declineType === 'HYPERBOLIC' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">HYPERBOLIC EXPONENT (b)</span>
                    <span className="text-cyan-400 font-semibold">{bParam}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={bParam}
                    onChange={(e) => setBParam(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono">ABANDONMENT CUTOFF RATE (BOPD)</label>
                <input
                  type="number"
                  value={abRate}
                  onChange={(e) => setAbRate(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#050812] border border-slate-800 px-3 py-1.5 rounded text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                >
                </input>
              </div>

              <button
                onClick={recordDCAAudit}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-bold py-2 rounded transition-all cursor-pointer"
              >
                Execute Reservoir Projection
              </button>
            </div>

            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold tracking-wider text-slate-400 font-mono uppercase mb-2">12-Month Production Forecast Plot</h3>
                
                {/* Custom bar visualizer */}
                <div className="bg-[#050812] p-2 rounded-lg border border-slate-850">
                  <svg width="100%" height={dcaSvgData.height} viewBox={`0 0 ${dcaSvgData.width} ${dcaSvgData.height}`} className="overflow-visible">
                    {/* Gridlines */}
                    {[0.25, 0.5, 0.75].map((fac, idx) => (
                      <line
                        key={idx}
                        x1={dcaSvgData.pad}
                        y1={dcaSvgData.pad + fac * (dcaSvgData.height - dcaSvgData.pad * 2)}
                        x2={dcaSvgData.width - dcaSvgData.pad}
                        y2={dcaSvgData.pad + fac * (dcaSvgData.height - dcaSvgData.pad * 2)}
                        stroke="#111827"
                        strokeDasharray="2"
                      />
                    ))}

                    <path
                      d={dcaSvgData.areaPath}
                      fill="url(#area-gradient)"
                      opacity="0.15"
                    />
                    <path
                      d={dcaSvgData.linePath}
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                    />

                    {dcaSvgData.points.map((p, idx) => (
                      <g key={idx}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="4"
                          fill="#06b6d4"
                          stroke="#020617"
                          strokeWidth="1.5"
                        />
                        {idx % 3 === 0 && (
                          <text
                            x={p.x}
                            y={p.y - 10}
                            fill="#94a3b8"
                            fontSize="8"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {Math.round(p.val)}
                          </text>
                        )}
                      </g>
                    ))}

                    <line
                      x1={dcaSvgData.pad}
                      y1={dcaSvgData.height - dcaSvgData.pad}
                      x2={dcaSvgData.width - dcaSvgData.pad}
                      y2={dcaSvgData.height - dcaSvgData.pad}
                      stroke="#374151"
                    />

                    <defs>
                      <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Economic stats resolved display */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-lg border border-slate-850">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">RESERVES OUTLOOK (EUR)</span>
                  <p className="text-base font-bold text-slate-100 font-mono">{dcaCalculations.reserves.eur} Mbo</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">REMAINING RESERVES</span>
                  <p className="text-base font-bold text-cyan-400 font-mono">{dcaCalculations.reserves.remainingReservesMbo} Mbo</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">YEARS TO OPERATE</span>
                  <p className="text-base font-bold text-slate-100 font-mono">{dcaCalculations.reserves.yearsToAbandon} Years</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PI & SKIN SOLVER */}
        {activeTab === 'SKIN_PI' && (
          <div id="skin-solver-workspace" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold tracking-wider text-slate-300 font-mono uppercase border-b border-slate-800 pb-2">Well Test Input Parameters</h3>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono">WELL TEST LIQUID PRODUCTION (BPD)</label>
                  <input
                    type="number"
                    value={qTest}
                    onChange={(e) => setQTest(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-[#050812] border border-slate-800 px-3 py-1.5 rounded text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-mono">RESERVOIR PRESSURE PR (PSI)</label>
                    <input
                      type="number"
                      value={prPressure}
                      onChange={(e) => setPrPressure(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-[#050812] border border-slate-800 px-3 py-1.5 rounded text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-mono">FLOWING PRESSURE PWF (PSI)</label>
                    <input
                      type="number"
                      value={pwfPressure}
                      onChange={(e) => setPwfPressure(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-[#050812] border border-slate-800 px-3 py-1.5 rounded text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono">IDEAL DAMAGE-FREE PI (STB/D/PSI)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={idealPi}
                    onChange={(e) => setIdealPi(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                    className="w-full bg-[#050812] border border-slate-800 px-3 py-1.5 rounded text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={recordSkinAudit}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-bold py-2 rounded transition-all cursor-pointer"
              >
                Solve Production Diagnostics
              </button>
            </div>

            <div className="bg-[#050812] p-5 rounded-lg border border-slate-850 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-400 font-mono tracking-wider mb-4 uppercase">SOLVED WELL EFFICIENCY HANDSHAKE</h4>
                
                {skinPiCalculations.drawdownDanger ? (
                  <div className="text-center p-4 bg-rose-500/10 border border-rose-500/20 rounded text-rose-300 text-xs font-mono">
                    ERROR: Pwf pressure cannot equal or exceed static reservoir pressure (Drawdown &le; 0).
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                       <span className="text-xs text-slate-400 font-sans">Productivity Index (PI)</span>
                      <strong className="text-slate-200 font-mono text-base">{skinPiCalculations.pi} b/d/psi</strong>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                      <span className="text-xs text-slate-400 font-sans">Flow Efficiency (FE)</span>
                      <strong className="text-emerald-400 font-mono text-base">{skinPiCalculations.flowEfficiency}%</strong>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                      <span className="text-xs text-slate-400 font-sans">Estimated Skin Factor (S)</span>
                      <strong className={`font-mono text-lg ${skinPiCalculations.skin > 8 ? 'text-rose-400 animate-pulse' : 'text-slate-100'}`}>
                        {skinPiCalculations.skin}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {!skinPiCalculations.drawdownDanger && (
                <div className="mt-4 leading-relaxed text-xs text-slate-400 font-mono p-3 bg-[#0B1120] border border-slate-800 rounded">
                  {skinPiCalculations.skin > 8 ? (
                    <span>
                      <strong className="text-rose-400 block mb-1">⚠️ DIAGNOSIS: SEVERE FORMATION DAMAGE</strong>
                      The skin factor of <span className="text-slate-200 font-bold">{skinPiCalculations.skin}</span> indicates severe mud solids cake baking/damage. Matrix acid injection is extremely viable, offering up to <span className="text-emerald-400">{(idealPi / skinPiCalculations.pi).toFixed(1)}x productivity gains</span>.
                    </span>
                  ) : skinPiCalculations.skin < 0 ? (
                    <span>
                      <strong className="text-emerald-400 block mb-1">🎉 DIAGNOSIS: STIMULATED / FRACTURED WELL</strong>
                      Negative skin values confirm the formation zone is stimulated. No matrix cleanups required. Maintain current operational lift schedules.
                    </span>
                  ) : (
                    <span>
                      <strong className="text-slate-300 block mb-1">ℹ️ DIAGNOSIS: REASONABLE WELL COMMONS</strong>
                      The well displays slight skin damage. Cleanups offer minimal ROI. Recommend focusing optimization budgets on artificial lift parameters.
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: WELL ECONOMIC APPRAISAL */}
        {activeTab === 'ECON' && (
          <div id="economy-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <h3 className="text-sm font-semibold tracking-wider text-slate-300 font-mono uppercase border-b border-slate-800 pb-2">Appraisal Parameters</h3>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono">ESTIMATED OIL GAIN (BOPD)</label>
                  <input
                    type="number"
                    value={incBopd}
                    onChange={(e) => setIncBopd(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-[#050812] border border-slate-800 px-3 py-1.5 rounded text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono">WORKOVER OPERATION CAPEX ($)</label>
                  <input
                    type="number"
                    step="5000"
                    value={capex}
                    onChange={(e) => setCapex(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-[#050812] border border-slate-800 px-3 py-1.5 rounded text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-mono">OIL PRICE ($/BBL)</label>
                    <input
                      type="number"
                      value={oilPrice}
                      onChange={(e) => setOilPrice(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-[#050812] border border-slate-800 px-3 py-1.5 rounded text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-mono">WELL WELLHEAD LONGEVITY (M)</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={months}
                      onChange={(e) => setMonths(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-[#050812] border border-slate-800 px-3 py-1.5 rounded text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={recordEconAudit}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-bold py-2 rounded transition-all cursor-pointer"
              >
                Perform NPV Discount Cash Ledger
              </button>
            </div>

            <div className="lg:col-span-7 bg-[#050812] p-5 rounded-lg border border-slate-850 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-400 font-mono tracking-wider mb-4 uppercase">FINANCIAL METRIC RUN</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-[#0B1120] border border-slate-850 p-3 rounded text-center">
                    <span className="text-[9px] text-slate-500 font-mono block">BOE TOTAL RECOVERED</span>
                    <strong className="text-slate-100 text-sm font-mono leading-relaxed">{econCalculations.incrementalOilTotalBarrels?.toLocaleString()} Bbl</strong>
                  </div>
                  <div className="bg-[#0B1120] border border-slate-850 p-3 rounded text-center">
                    <span className="text-[9px] text-slate-500 font-mono block">ESTIMATED REVENUE</span>
                    <strong className="text-slate-100 text-sm font-mono leading-relaxed">${econCalculations.grossRevenueUsd?.toLocaleString()}</strong>
                  </div>
                  <div className="bg-[#0B1120] border border-slate-850 p-3 rounded text-center">
                    <span className="text-[9px] text-slate-500 font-mono block">ROYALTIES & TAX DEDUCTS</span>
                    <strong className="text-slate-100 text-sm font-mono leading-relaxed">${(econCalculations.grossRevenueUsd - econCalculations.netRevenueUsd)?.toLocaleString()}</strong>
                  </div>
                  <div className="bg-[#0B1120] border border-slate-850 p-3 rounded text-center">
                    <span className="text-[9px] text-slate-500 font-mono block">FLUID OPEX ADD</span>
                    <strong className="text-slate-100 text-sm font-mono leading-relaxed">${econCalculations.opexUsd?.toLocaleString()}</strong>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-sans">Project CAPEX Required</span>
                    <strong className="text-rose-400 font-mono">${econCalculations.capexUsd?.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-sans">Net Present Value (NPV @10%)</span>
                    <strong className="text-emerald-400 font-mono text-lg">${econCalculations.npvUsd?.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-300 font-sans font-medium">Internal Return Index (ROI / Multiplier)</span>
                    <strong className="text-emerald-400 font-mono text-lg">{econCalculations.roiPercent}%</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-300 font-sans">Payback Duration Period</span>
                    <strong className="text-cyan-400 font-mono text-base">{econCalculations.paybackMonths} Months</strong>
                  </div>
                </div>
              </div>

              <div className="mt-5 text-[11px] text-slate-400 font-mono leading-relaxed p-2 border border-dashed border-emerald-900/40 bg-emerald-950/10 rounded">
                <span className="text-emerald-400 font-bold">● Economic Viability Handshake:</span>{' '}
                {econCalculations.npvUsd > 0 ? (
                  <span>
                    Approved. The project payout yields an asset-expanding NPV of <span className="text-slate-200">${econCalculations.npvUsd.toLocaleString()}</span> with a very low payback period of {econCalculations.paybackMonths} months. Well intervention candidate fits executive budget requirements.
                  </span>
                ) : (
                  <span className="text-rose-400">
                    Defeated. Operation requires a higher BOPD rate multiplier to offset initial CAPEX expenditures within {months} months. Retarget optimization parameters.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
