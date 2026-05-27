'use client';

import React, { useMemo } from 'react';
import { Well } from '../lib/oilfieldData';
import { Activity, AlertTriangle, Droplets, Flame, HardDrive, TrendingUp } from 'lucide-react';

interface WellDashboardProps {
  wells: Well[];
  selectedWell: Well;
  onSelectWell: (well: Well) => void;
  onAudit: (action: string, details: string) => void;
}

export default function WellDashboard({ wells, selectedWell, onSelectWell, onAudit }: WellDashboardProps) {
  // Overall oilfield overview KPIs on current well data
  const fieldSummary = useMemo(() => {
    let totalOil = 0;
    let totalLiq = 0;
    let activeWellsCount = 0;
    wells.forEach(w => {
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
      totalWells: wells.length
    };
  }, [wells]);

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

  return (
    <div id="oilfield-dashboard-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
      
      {/* SECTION 1: Field KPI Summary Banner (12 cols) */}
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
            <Activity className="w-5 h-5 animate-pulse" />
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
            {wells.map((w) => {
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

        {/* WELL INTEGRITY NOTES */}
        <div className="bg-[#0B1120] border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-semibold text-cyan-400 uppercase tracking-widest font-mono mb-2">Technical Guidance</p>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Mô hình Nodal Analysis đầy đủ đã được tích hợp sang tab <b className="text-cyan-400 font-mono">Technical Calculators</b>. Hãy truy cập vào đó để hiệu chỉnh bộ khớp SCADA và phân tích lưu lượng.
          </p>
        </div>
      </div>

      {/* SECTION 3: Main Active Well workspace (9 cols) */}
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
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-800 font-medium font-sans">RANKED</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#050812] p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono">Productivity Index (PI)</span>
              <p className="text-lg font-bold text-slate-100 font-mono">{selectedWell.productivityIndex} <span className="text-xs font-sans text-slate-400">b/d/psi</span></p>
            </div>
            <div className="bg-[#050812] p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono">Measured Skin Factor (S)</span>
              <p className={`text-lg font-bold font-mono ${selectedWell.skinFactor > 8 ? 'text-rose-400' : 'text-slate-100'}`}>{selectedWell.skinFactor}</p>
            </div>
            <div className="bg-[#050812] p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono">Current Fluid Velocity</span>
              <p className="text-lg font-bold text-slate-100 font-mono">{selectedWell.liquidRate} <span className="text-xs font-sans text-slate-400">bpd</span></p>
            </div>
            <div className="bg-[#050812] p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono">Actual Oil Produced</span>
              <p className="text-lg font-bold text-emerald-400 font-mono">{selectedWell.oilRate} <span className="text-xs font-sans text-slate-400 font-bold">bopd</span></p>
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

        {/* Nodal Highlights / Spec Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Hydraulic Wellbore Mechanical Profile Card */}
          <div className="bg-[#0B1120] border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono">Wellbore Profile &amp; Mechanical Layout</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Mechanical design configuration and thermodynamic conditions retrieved from the database structure for <span className="text-slate-300 font-bold">{selectedWell.name}</span>.
              </p>

              <div className="grid grid-cols-2 gap-3.5 border-t border-slate-800/80 pt-4 text-xs font-mono">
                <div className="bg-slate-950 p-2.5 rounded border border-slate-900">
                  <span className="text-[10px] text-slate-500 block">MEASURED DEPTH</span>
                  <span className="text-slate-200 font-bold text-[13px]">{(selectedWell.measuredDepth || 8500).toLocaleString()} <span className="text-[10px] text-slate-500 font-sans">ft</span></span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-900">
                  <span className="text-[10px] text-slate-500 block">RESERVOIR DEPTH (TVD)</span>
                  <span className="text-slate-200 font-bold text-[13px]">{(selectedWell.reservoirDepth || 8000).toLocaleString()} <span className="text-[10px] text-slate-500 font-sans">ft</span></span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-900">
                  <span className="text-[10px] text-slate-500 block">TUBING DIAMETER</span>
                  <span className="text-slate-200 font-bold text-[13px]">{selectedWell.tubingID || 2.441} <span className="text-[10px] text-slate-500 font-sans">inch</span></span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-900">
                  <span className="text-[10px] text-slate-500 block">RESERVOIR PRESSURE</span>
                  <span className="text-slate-200 font-bold text-[13px]">{(selectedWell.reservoirPressure || 3200).toLocaleString()} <span className="text-[10px] text-slate-500 font-sans">psi</span></span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-950 col-span-2 flex justify-between items-center font-sans">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono block font-bold">ARTIFICIAL LIFT SUITE</span>
                    <span className="text-[#38bdf8] font-bold text-xs">{selectedWell.liftType} system active</span>
                  </div>
                  {selectedWell.liftType === 'Gas Lift' && (
                    <span className="text-[11px] text-slate-400 font-mono">Rate: <b>{selectedWell.gasLiftInjectionRate || 1.2} MMscf/d</b></span>
                  )}
                  {selectedWell.liftType === 'ESP' && (
                    <span className="text-[11px] text-slate-400 font-mono">Speed: <b>{selectedWell.espHz || 50} Hz</b></span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-800/80">
              <div className="p-3 bg-cyan-950/20 rounded border border-cyan-500/10 text-xs leading-relaxed text-slate-300">
                <span className="text-cyan-400 font-semibold font-mono block mb-1 text-[10px]">💡 SYSTEM ANALYSIS HIGHLIGHT:</span>
                Vận hành hệ thống khai thác tại áp suất và lưu lượng thiết kế để tránh các hiện tượng xâm thực (cavitation) của bơm ly tâm ESP hoặc hiện tượng sục khí (critical gas slugging) trong ống khai thác.
              </div>
            </div>
          </div>

          {/* Interactive Nodal Analysis Redirection Gateway */}
          <div className="bg-[#0B1120] border border-orange-500/10 p-5 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Activity className="w-4 h-4 text-orange-400 animate-pulse" />
                <h3 className="text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono">System Nodal Plot Optimization Gateway</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4 font-sans">
                Bộ công cụ tính toán và căn chỉnh điểm hoạt động hệ thống (Nodal Analysis Plot) đã được nâng cấp và chuyển vào tab <b className="text-orange-400 font-mono">Technical Calculators</b>.
              </p>

              <div className="space-y-3.5 border-t border-slate-800/80 pt-4 text-slate-300">
                <div className="flex items-start space-x-3 text-xs leading-normal">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0"></div>
                  <div>
                    <span className="text-slate-200 font-bold font-mono">Phân Tách Công Cụ Khai Thác:</span> Phân chia cụ thể các thông số để tính toán riêng biệt cho đường cong Inflow (IPR) và Outflow (VLP).
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 text-xs leading-normal">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0"></div>
                  <div>
                    <span className="text-slate-200 font-bold font-mono">Bộ Ước Lượng Độ Nhạy (Sensitivity Turner):</span> Tự do thay đổi độ ngập, cỡ ống Tubing, tần số ESP hoặc lưu lượng Gas Lift để đánh giá hiệu quả tức thời.
                  </div>
                </div>

                <div className="flex items-start space-x-3 text-xs leading-normal">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0"></div>
                  <div>
                    <span className="text-slate-200 font-bold font-mono">Cơ Chế Khớp Mô Hình Tự Động (Auto-Match):</span> Đồng bộ hóa và tự động khớp hai đường cong IPR và VLP giao nhau tại điểm đo thực tế từ hệ thống giám sát SCADA.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-800/80 pt-4">
              <div className="bg-slate-950 p-4 rounded border border-orange-500/10 flex flex-col items-center justify-center text-center space-y-1.5">
                <span className="text-[10px] text-orange-400 font-mono font-bold">CALIBRATION &amp; TUNING WORKSPACE INSIDE:</span>
                <span className="text-xs bg-orange-500/10 text-orange-300 px-3 py-1.5 border border-orange-500/20 rounded font-mono font-bold tracking-wide text-center">
                  Technical Calculators &gt; Nodal Analysis Plot
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
