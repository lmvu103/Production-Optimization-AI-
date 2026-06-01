'use client';

import React, { useMemo, useState } from 'react';
import { Well } from '../lib/oilfieldData';
import { Activity, AlertTriangle, Droplets, Flame, HardDrive, TrendingUp } from 'lucide-react';

interface WellDashboardProps {
  wells: Well[];
  selectedWell: Well;
  onSelectWell: (well: Well) => void;
  onAudit: (action: string, details: string) => void;
}

const formatXAxisDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  
  // Normalize string for common tokens
  const normalized = clean.toLowerCase()
    .replace(/thg\s*/g, '')
    .replace(/tháng\s*/g, '')
    .replace(/thang\s*/g, '')
    .trim();
    
  const parts = normalized.split(/[-/ ]+/);
  
  const monthsEngShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const monthMap: Record<string, string> = {
    jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr',
    may: 'May', jun: 'Jun', jul: 'Jul', aug: 'Aug',
    sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec',
    'thg 01': 'Jan', 'thg 02': 'Feb', 'thg 03': 'Mar', 'thg 04': 'Apr',
    'thg 05': 'May', 'thg 06': 'Jun', 'thg 07': 'Jul', 'thg 08': 'Aug',
    'thg 09': 'Sep', 'thg 10': 'Oct', 'thg 11': 'Nov', 'thg 12': 'Dec',
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
    '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
    '1': 'Jan', '2': 'Feb', '3': 'Mar', '4': 'Apr', '5': 'May', '6': 'Jun',
    '7': 'Jul', '8': 'Aug', '9': 'Sep'
  };

  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const mPart = parts[1];
    let yr = parts[2];
    if (yr.length === 4) {
      yr = yr.substring(2);
    }
    
    let matchedMonth = '';
    if (monthMap[mPart]) {
      matchedMonth = monthMap[mPart];
    } else {
      const mIdx = parseInt(mPart, 10);
      if (!isNaN(mIdx) && mIdx >= 1 && mIdx <= 12) {
        matchedMonth = monthsEngShort[mIdx - 1];
      }
    }

    if (matchedMonth && !isNaN(day)) {
      return `${day}-${matchedMonth}-${yr}`;
    }
  }

  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const yr = parts[0].substring(2);
      const mPart = parts[1];
      const day = parseInt(parts[2], 10);
      
      let matchedMonth = '';
      if (monthMap[mPart]) {
        matchedMonth = monthMap[mPart];
      } else {
        const mIdx = parseInt(mPart, 10);
        if (!isNaN(mIdx) && mIdx >= 1 && mIdx <= 12) {
          matchedMonth = monthsEngShort[mIdx - 1];
        }
      }
      
      if (matchedMonth && !isNaN(day)) {
        return `${day}-${matchedMonth}-${yr}`;
      }
    }
    
    const p2_num = parseInt(parts[2], 10);
    if (!isNaN(p2_num)) {
      const yr = parts[2].length === 4 ? parts[2].substring(2) : parts[2];
      const mPart = parts[1];
      const day = parseInt(parts[0], 10);
      
      let matchedMonth = '';
      if (monthMap[mPart]) {
        matchedMonth = monthMap[mPart];
      } else {
        const mIdx = parseInt(mPart, 10);
        if (!isNaN(mIdx) && mIdx >= 1 && mIdx <= 12) {
          matchedMonth = monthsEngShort[mIdx - 1];
        }
      }
      
      if (matchedMonth && !isNaN(day)) {
        return `${day}-${matchedMonth}-${yr}`;
      }
    }
  }

  if (parts.length === 2) {
    const p0 = parts[0];
    const p1 = parts[1];
    
    let matchedMonth = '';
    let yr = '';
    
    if (monthMap[p0]) {
      matchedMonth = monthMap[p0];
      yr = p1;
    } else if (monthMap[p1]) {
      matchedMonth = monthMap[p1];
      yr = p0;
    }
    
    if (matchedMonth && yr) {
      if (yr.length === 4) {
        yr = yr.substring(2);
      }
      return `1-${matchedMonth}-${yr}`;
    }
  }

  return dateStr;
};

export default function WellDashboard({ wells, selectedWell, onSelectWell, onAudit }: WellDashboardProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Formulating plot history based on active well or a realistic physical depletion fallback
  const plotHistory = useMemo(() => {
    if (selectedWell.history && selectedWell.history.length > 0) {
      return selectedWell.history;
    }
    
    // Fallback data structure replicating the timeline format from image.png (e.g. 1-Jun-14 to 1-Jun-26)
    const years = ['14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26'];
    const fakeHistory = [];
    let cumulativeOil = 120; // base historical accumulation in Mstb
    
    // Deterministic pure pseudo-random noise helper to comply with react-hooks/purity rules
    const getPureNoise = (seed: number): number => {
      const value = Math.sin(seed * 12.9898) * 43758.5453;
      return value - Math.floor(value);
    };
    
    for (let i = 0; i < 36; i++) {
        const yearIdx = Math.floor(i / 3);
        const subIdx = i % 3;
        const monthPart = subIdx === 0 ? 'Jan' : subIdx === 1 ? 'Jun' : 'Oct';
        const dateStr = `1-${monthPart}-${years[yearIdx]}`;
        const normalizedIdx = i / 35; // 0 to 1
        
        const noiseFactor = getPureNoise(i);
        
        // Oil depletion profile matching image.png
        const baseOilRate = 2100;
        const oilRate = Math.round(baseOilRate * Math.pow(0.15, normalizedIdx) + noiseFactor * 60 + 20);
        
        // Oil cumulative rises gradually
        cumulativeOil += (oilRate * 30.4 * 3) / 1000;
        
        // Water cut breakthrough starts near zero, then ramps up past 80%
        const waterCut = normalizedIdx < 0.12 ? 0 : Math.min(96, Math.round(98 / (1 + Math.exp(-6 * (normalizedIdx - 0.25))) + getPureNoise(i + 1) * 2));
        
        // Pressures decline
        const bhp = Math.round(2800 - 850 * Math.pow(normalizedIdx, 0.45) + getPureNoise(i + 2) * 30);
        const thp = Math.round(950 - 680 * normalizedIdx + getPureNoise(i + 3) * 25);
        
        // Gas lift starts after year 15-16
        const gasLift = normalizedIdx > 0.15 ? Math.round(750 + Math.sin(normalizedIdx * 9) * 200 + getPureNoise(i + 4) * 40) : 0;
        
        // GOR rises matching depletion gas cap breakthrough
        const gor = Math.round(480 + 800 * Math.sqrt(normalizedIdx) + getPureNoise(i + 5) * 70);
        
        // Step-like choke sizing
        const choke = normalizedIdx < 0.15 ? 24 : normalizedIdx < 0.4 ? 48 : normalizedIdx < 0.75 ? 64 : 80;

        fakeHistory.push({
          month: dateStr,
          oilRate,
          oilCum: Math.round(cumulativeOil),
          waterCut,
          bottomHolePressure: bhp,
          wellheadPressure: thp,
          gor,
          gasLift,
          choke
        });
    }
    return fakeHistory;
  }, [selectedWell]);

  // Dynamic bounds and scales mapping the historical database to pristine units
  const ranges = useMemo(() => {
    let maxOilRate = 100;
    let maxOilCum = 100;
    let maxPressure = 100;
    let maxGasLift = 150;
    let maxGor = 100;

    const formattedData = [];
    let tempCum = 0;

    for (let idx = 0; idx < plotHistory.length; idx++) {
      const item = plotHistory[idx];
      let itemCum = item.oilCum;
      
      if (itemCum === undefined) {
        tempCum += (item.oilRate * 30.4) / 1000;
        itemCum = tempCum;
      } else {
        tempCum = itemCum;
      }

      const rate = item.oilRate || 0;
      const bhp = item.bottomHolePressure || 0;
      const thp = item.wellheadPressure !== undefined ? item.wellheadPressure : Math.round(bhp * 0.25);
      const gl = item.gasLift !== undefined ? item.gasLift : (selectedWell.liftType === 'Gas Lift' ? 850 : 0);
      const gorValue = item.gor !== undefined ? item.gor : (selectedWell.gor || 350);
      const chokeValue = item.choke !== undefined ? item.choke : (selectedWell.chokeSize || 48);

      if (rate > maxOilRate) maxOilRate = rate;
      if (itemCum > maxOilCum) maxOilCum = itemCum;
      if (bhp > maxPressure) maxPressure = bhp;
      if (thp > maxPressure) maxPressure = thp;
      if (gl > maxGasLift) maxGasLift = gl;
      if (gorValue > maxGor) maxGor = gorValue;

      formattedData.push({
        ...item,
        oilCum: itemCum,
        wellheadPressure: thp,
        gor: gorValue,
        gasLift: gl,
        choke: chokeValue
      });
    }

    // Clean ticks dividers
    const cleanMaxOilRate = Math.max(500, Math.ceil(maxOilRate / 500) * 500);
    const cleanMaxOilCum = Math.max(100, Math.ceil(maxOilCum / 200) * 200);
    const cleanMaxPressure = Math.max(1000, Math.ceil(maxPressure / 500) * 500);
    const cleanMaxGasLift = Math.max(100, Math.ceil(maxGasLift / 200) * 200);
    const cleanMaxGor = Math.max(500, Math.ceil(maxGor / 500) * 500);

    return {
      data: formattedData,
      maxOilRate: cleanMaxOilRate,
      maxOilCum: cleanMaxOilCum,
      maxPressure: cleanMaxPressure,
      maxGasLift: cleanMaxGasLift,
      maxGor: cleanMaxGor
    };
  }, [plotHistory, selectedWell]);

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

        {/* HISTORICAL WELL PERFORMANCE SURVEILLANCE PLOT */}
        {(() => {
          const leftMargin = 85;
          const rightMargin = 85;
          const plotWidth = 830;
          
          const yMin1 = 40;
          const yMax1 = 240;
          const yMin2 = 290;
          const yMax2 = 490;
          const yMin3 = 540;
          const yMax3 = 740;
          const yHeight = 200;

          const getX = (index: number, total: number) => {
            if (total <= 1) return leftMargin;
            return leftMargin + (index / (total - 1)) * plotWidth;
          };

          const getY1Left = (val: number) => yMax1 - (val / (ranges.maxOilRate || 2500)) * yHeight;
          const getY1Right = (val: number) => yMax1 - (val / (ranges.maxOilCum || 1400)) * yHeight;
          
          const getY2Left = (val: number) => yMax2 - (val / (ranges.maxPressure || 3500)) * yHeight;
          const getY2Right = (val: number) => yMax2 - (val / (ranges.maxGasLift || 1400)) * yHeight;
          
          const getY3Left = (val: number) => yMax3 - (val / (ranges.maxGor || 4000)) * yHeight;
          const getY3Right = (val: number) => yMax3 - (val / 100) * yHeight;

          // Build SVG Paths
          let oilRateArea = "";
          if (ranges.data.length > 0) {
            oilRateArea = `M ${leftMargin} ${yMax1} `;
            ranges.data.forEach((d, i) => {
              oilRateArea += `L ${getX(i, ranges.data.length)} ${getY1Left(d.oilRate)} `;
            });
            oilRateArea += `L ${leftMargin + plotWidth} ${yMax1} Z`;
          }

          let oilCumLine = "";
          if (ranges.data.length > 0) {
            ranges.data.forEach((d, i) => {
              const cmd = i === 0 ? 'M' : 'L';
              oilCumLine += `${cmd} ${getX(i, ranges.data.length)} ${getY1Right(d.oilCum)} `;
            });
          }

          let bhpLine = "";
          if (ranges.data.length > 0) {
            ranges.data.forEach((d, i) => {
              const cmd = i === 0 ? 'M' : 'L';
              bhpLine += `${cmd} ${getX(i, ranges.data.length)} ${getY2Left(d.bottomHolePressure)} `;
            });
          }

          let thpLine = "";
          if (ranges.data.length > 0) {
            ranges.data.forEach((d, i) => {
              const cmd = i === 0 ? 'M' : 'L';
              thpLine += `${cmd} ${getX(i, ranges.data.length)} ${getY2Left(d.wellheadPressure)} `;
            });
          }

          let gasLiftLine = "";
          if (ranges.data.length > 0) {
            ranges.data.forEach((d, i) => {
              const cmd = i === 0 ? 'M' : 'L';
              gasLiftLine += `${cmd} ${getX(i, ranges.data.length)} ${getY2Right(d.gasLift)} `;
            });
          }

          let gorLine = "";
          if (ranges.data.length > 0) {
            ranges.data.forEach((d, i) => {
              const cmd = i === 0 ? 'M' : 'L';
              gorLine += `${cmd} ${getX(i, ranges.data.length)} ${getY3Left(d.gor)} `;
            });
          }

          let waterCutLine = "";
          if (ranges.data.length > 0) {
            ranges.data.forEach((d, i) => {
              const cmd = i === 0 ? 'M' : 'L';
              waterCutLine += `${cmd} ${getX(i, ranges.data.length)} ${getY3Right(d.waterCut)} `;
            });
          }

          let chokeLine = "";
          if (ranges.data.length > 0) {
            ranges.data.forEach((d, i) => {
              const x = getX(i, ranges.data.length);
              const y = getY3Right(d.choke);
              if (i === 0) {
                chokeLine += `M ${x} ${y} `;
              } else {
                const prevX = getX(i - 1, ranges.data.length);
                const prevY = getY3Right(ranges.data[i - 1].choke);
                chokeLine += `L ${x} ${prevY} L ${x} ${y} `;
              }
            });
          }

          // Grid & Ticks loops
          const ticksCount = 5;
          const leftTicks1 = [];
          for (let i = 0; i <= ticksCount; i++) {
            const val = Math.round((ranges.maxOilRate / ticksCount) * i);
            leftTicks1.push({ val, y: getY1Left(val) });
          }
          const rightTicks1 = [];
          for (let i = 0; i <= ticksCount; i++) {
            const val = Math.round((ranges.maxOilCum / ticksCount) * i);
            rightTicks1.push({ val, y: getY1Right(val) });
          }

          const leftTicks2 = [];
          for (let i = 0; i <= ticksCount; i++) {
            const val = Math.round((ranges.maxPressure / ticksCount) * i);
            leftTicks2.push({ val, y: getY2Left(val) });
          }
          const rightTicks2 = [];
          for (let i = 0; i <= ticksCount; i++) {
            const val = Math.round((ranges.maxGasLift / ticksCount) * i);
            rightTicks2.push({ val, y: getY2Right(val) });
          }

          const leftTicks3 = [];
          for (let i = 0; i <= ticksCount; i++) {
            const val = Math.round((ranges.maxGor / ticksCount) * i);
            leftTicks3.push({ val, y: getY3Left(val) });
          }
          const rightTicks3 = [];
          for (let i = 0; i <= ticksCount; i++) {
            const val = Math.round((100 / ticksCount) * i);
            rightTicks3.push({ val, y: getY3Right(val) });
          }

          // Build clean X ticks representing yearly interval start as in image.png
          const xTicks: { idx: number; label: string }[] = [];
          if (ranges.data.length > 0) {
            const junIndices: number[] = [];
            const seenYears = new Set<string>();
            
            ranges.data.forEach((d, idx) => {
              const monthStr = d.month.toLowerCase();
              const isJune = monthStr.includes('jun') || 
                             monthStr.includes('thg 06') || 
                             /[-/]0?6[-/]/.test(monthStr) ||
                             (monthStr.split(/[-/ ]+/).length === 3 && parseInt(monthStr.split(/[-/ ]+/)[1], 10) === 6);
              
              if (isJune) {
                const parts = monthStr.split(/[-/ ]+/);
                let yr = '';
                if (parts.length === 3) {
                  if (parts[0].length === 4) yr = parts[0];
                  else if (parts[2].length === 4 || parts[2].length === 2) yr = parts[2];
                }
                const yearKey = yr || d.month;
                if (!seenYears.has(yearKey)) {
                  seenYears.add(yearKey);
                  junIndices.push(idx);
                }
              }
            });

            if (junIndices.length >= 2) {
              junIndices.forEach(idx => {
                xTicks.push({ idx, label: formatXAxisDate(ranges.data[idx].month) });
              });
            } else {
              const xTicksCount = 6;
              const step = Math.max(1, Math.floor(ranges.data.length / xTicksCount));
              for (let i = 0; i < ranges.data.length; i += step) {
                xTicks.push({ idx: i, label: formatXAxisDate(ranges.data[i].month) });
              }
              if (xTicks[xTicks.length - 1]?.idx !== ranges.data.length - 1) {
                xTicks.push({ idx: ranges.data.length - 1, label: formatXAxisDate(ranges.data[ranges.data.length - 1].month) });
              }
            }
          }

          const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
            const svg = e.currentTarget;
            const rect = svg.getBoundingClientRect();
            const x = e.clientX - rect.left;
            
            const viewBoxWidth = 1000;
            const relativeX = (x / rect.width) * viewBoxWidth;
            
            if (relativeX >= leftMargin && relativeX <= leftMargin + plotWidth) {
              const pct = (relativeX - leftMargin) / plotWidth;
              const index = Math.round(pct * (ranges.data.length - 1));
              if (index >= 0 && index < ranges.data.length) {
                setHoverIndex(index);
              }
            } else {
              setHoverIndex(null);
            }
          };

          return (
            <div className="bg-[#0B1120] border border-slate-800 p-5 rounded-xl select-none relative">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Historic Reservoir SCADA Surveillance Plot ({selectedWell.name})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Aligns Oil rates, bottomhole pressure (BHP), wellhead pressure (THP), Water cut, and GOR directly from the well database hierarchy.
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-slate-400">
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 bg-[#10b981] rounded-sm"></span>
                    <span>Oil Rate</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-3.5 h-0.5 bg-[#047857]"></span>
                    <span>Oil Cum</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-3.5 h-0.5 bg-white"></span>
                    <span>BHP</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-3.5 h-0.5 bg-[#ef4444]"></span>
                    <span>THP</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-3.5 h-0.5 bg-[#f59e0b] border-t border-dashed"></span>
                    <span>Gas Lift / GL</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-0.5 bg-[#f43f5e]"></span>
                    <span>GOR</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-[#2563eb]">▲</span>
                    <span>Water Cut / WCT</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-3.5 h-0.5 bg-[#c084fc]"></span>
                    <span>Choke</span>
                  </div>
                </div>
              </div>

              {/* Main SVG workspace */}
              <div className="relative w-full overflow-hidden">
                <svg 
                  viewBox="0 0 1000 800" 
                  className="w-full h-auto cursor-crosshair overflow-visible"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHoverIndex(null)}
                >
                  {/* --- PANEL 1 grids & background rect --- */}
                  <rect x={leftMargin} y={yMin1} width={plotWidth} height={yHeight} fill="#050812" fillOpacity="0.4" stroke="#334155" strokeWidth="0.5" />
                  {leftTicks1.map((tick, i) => (
                    <g key={i}>
                      <line x1={leftMargin} y1={tick.y} x2={leftMargin + plotWidth} y2={tick.y} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                      <text x={leftMargin - 10} y={tick.y + 4} fill="#10b981" fontSize="10" fontFamily="monospace" textAnchor="end">{tick.val}</text>
                    </g>
                  ))}
                  {rightTicks1.map((tick, i) => (
                    <g key={i}>
                      <text x={leftMargin + plotWidth + 10} y={tick.y + 4} fill="#047857" fontSize="10" fontFamily="monospace" textAnchor="start">{tick.val}</text>
                    </g>
                  ))}
                  <text x={20} y={(yMin1 + yMax1) / 2} fill="#10b981" fontSize="11" fontFamily="sans-serif" textAnchor="middle" transform={`rotate(-90, 20, ${(yMin1 + yMax1) / 2})`}>Oil rate (bopd)</text>
                  <text x={1000 - 20} y={(yMin1 + yMax1) / 2} fill="#047857" fontSize="11" fontFamily="sans-serif" textAnchor="middle" transform={`rotate(90, 1000 - 20, ${(yMin1 + yMax1) / 2})`}>Oil cumulative (Mstb)</text>

                  {/* --- PANEL 2 grids & background rect --- */}
                  <rect x={leftMargin} y={yMin2} width={plotWidth} height={yHeight} fill="#050812" fillOpacity="0.4" stroke="#334155" strokeWidth="0.5" />
                  {leftTicks2.map((tick, i) => (
                    <g key={i}>
                      <line x1={leftMargin} y1={tick.y} x2={leftMargin + plotWidth} y2={tick.y} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                      <text x={leftMargin - 10} y={tick.y + 4} fill="#cbd5e1" fontSize="10" fontFamily="monospace" textAnchor="end">{tick.val}</text>
                    </g>
                  ))}
                  {rightTicks2.map((tick, i) => (
                    <g key={i}>
                      <text x={leftMargin + plotWidth + 10} y={tick.y + 4} fill="#f59e0b" fontSize="10" fontFamily="monospace" textAnchor="start">{tick.val}</text>
                    </g>
                  ))}
                  <text x={20} y={(yMin2 + yMax2) / 2} fill="#cbd5e1" fontSize="11" fontFamily="sans-serif" textAnchor="middle" transform={`rotate(-90, 20, ${(yMin2 + yMax2) / 2})`}>BHP &amp; THP (Psi)</text>
                  <text x={1000 - 20} y={(yMin2 + yMax2) / 2} fill="#f59e0b" fontSize="11" fontFamily="sans-serif" textAnchor="middle" transform={`rotate(90, 1000 - 20, ${(yMin2 + yMax2) / 2})`}>Gas lift (Mscf/d)</text>

                  {/* --- PANEL 3 grids & background rect --- */}
                  <rect x={leftMargin} y={yMin3} width={plotWidth} height={yHeight} fill="#050812" fillOpacity="0.4" stroke="#334155" strokeWidth="0.5" />
                  {leftTicks3.map((tick, i) => (
                    <g key={i}>
                      <line x1={leftMargin} y1={tick.y} x2={leftMargin + plotWidth} y2={tick.y} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                      <text x={leftMargin - 10} y={tick.y + 4} fill="#f43f5e" fontSize="10" fontFamily="monospace" textAnchor="end">{tick.val}</text>
                    </g>
                  ))}
                  {rightTicks3.map((tick, i) => (
                    <g key={i}>
                      <text x={leftMargin + plotWidth + 10} y={tick.y + 4} fill="#cbd5e1" fontSize="10" fontFamily="monospace" textAnchor="start">{tick.val}%</text>
                    </g>
                  ))}
                  <text x={20} y={(yMin3 + yMax3) / 2} fill="#f43f5e" fontSize="11" fontFamily="sans-serif" textAnchor="middle" transform={`rotate(-90, 20, ${(yMin3 + yMax3) / 2})`}>GOR (Mscf/stb)</text>
                  <text x={1000 - 20} y={(yMin3 + yMax3) / 2} fill="#cbd5e1" fontSize="11" fontFamily="sans-serif" textAnchor="middle" transform={`rotate(90, 1000 - 20, ${(yMin3 + yMax3) / 2})`}>Wct (%) - Choke (1/64&apos;)</text>

                  {/* --- PLOT DATA PATHS --- */}
                  {/* Panel 1 Areas/Lines */}
                  {oilRateArea && <path d={oilRateArea} fill="#10b981" fillOpacity="0.8" />}
                  {oilCumLine && <path d={oilCumLine} fill="none" stroke="#047857" strokeWidth="2.5" />}

                  {/* Panel 2 Lines */}
                  {bhpLine && <path d={bhpLine} fill="none" stroke="#ffffff" strokeWidth="2" />}
                  {thpLine && <path d={thpLine} fill="none" stroke="#ef4444" strokeWidth="1.8" />}
                  {gasLiftLine && <path d={gasLiftLine} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,4" />}

                  {/* Panel 3 Lines & Steps */}
                  {gorLine && <path d={gorLine} fill="none" stroke="#f43f5e" strokeWidth="1.5" />}
                  {waterCutLine && <path d={waterCutLine} fill="none" stroke="#2563eb" strokeWidth="1.5" />}
                  {chokeLine && <path d={chokeLine} fill="none" stroke="#c084fc" strokeWidth="1.5" />}

                  {/* Panel 3 Interactive Points Markers */}
                  {ranges.data.map((d, i) => (
                    <circle key={`gor-${i}`} cx={getX(i, ranges.data.length)} cy={getY3Left(d.gor)} r="2" fill="#f43f5e" />
                  ))}
                  {ranges.data.map((d, i) => (
                    <polygon key={`wct-${i}`} points={`${getX(i, ranges.data.length)},${getY3Right(d.waterCut) - 3} ${getX(i, ranges.data.length) - 3},${getY3Right(d.waterCut) + 3} ${getX(i, ranges.data.length) + 3},${getY3Right(d.waterCut) + 3}`} fill="#2563eb" />
                  ))}

                   {/* --- BOTTOM X AXIS DATE TICK LABELING --- */}
                  {xTicks.map((tick, i) => {
                    const x = getX(tick.idx, ranges.data.length);
                    const y = yMax3 + 15;
                    return (
                      <g key={i}>
                        <line x1={x} y1={yMax3} x2={x} y2={yMax3 + 6} stroke="#334155" strokeWidth="1" />
                        <text 
                          x={x} 
                          y={y} 
                          fill="#94a3b8" 
                          fontSize="9.5" 
                          fontFamily="monospace" 
                          textAnchor="start"
                          transform={`rotate(40, ${x}, ${y})`}
                        >
                          {tick.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* --- ACTIVE HOVER TRACKER dashed lines & circles --- */}
                  {hoverIndex !== null && ranges.data[hoverIndex] && (
                    <g>
                      <line x1={getX(hoverIndex, ranges.data.length)} y1={yMin1 - 10} x2={getX(hoverIndex, ranges.data.length)} y2={yMax3 + 10} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,3" />
                      
                      {/* Intersects markers */}
                      <circle cx={getX(hoverIndex, ranges.data.length)} cy={getY1Left(ranges.data[hoverIndex].oilRate)} r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                      <circle cx={getX(hoverIndex, ranges.data.length)} cy={getY1Right(ranges.data[hoverIndex].oilCum)} r="4.5" fill="#047857" stroke="#ffffff" strokeWidth="1.5" />
                      
                      <circle cx={getX(hoverIndex, ranges.data.length)} cy={getY2Left(ranges.data[hoverIndex].bottomHolePressure)} r="4.5" fill="#ffffff" stroke="#050812" strokeWidth="1.5" />
                      <circle cx={getX(hoverIndex, ranges.data.length)} cy={getY2Left(ranges.data[hoverIndex].wellheadPressure)} r="4.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                      {ranges.data[hoverIndex].gasLift > 0 && (
                        <circle cx={getX(hoverIndex, ranges.data.length)} cy={getY2Right(ranges.data[hoverIndex].gasLift)} r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                      )}
                      
                      <circle cx={getX(hoverIndex, ranges.data.length)} cy={getY3Left(ranges.data[hoverIndex].gor)} r="4.5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
                      <circle cx={getX(hoverIndex, ranges.data.length)} cy={getY3Right(ranges.data[hoverIndex].waterCut)} r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
                      <circle cx={getX(hoverIndex, ranges.data.length)} cy={getY3Right(ranges.data[hoverIndex].choke)} r="4.5" fill="#c084fc" stroke="#ffffff" strokeWidth="1.5" />
                    </g>
                  )}
                </svg>
              </div>

              {/* FLOATING HOVER INTERACTIVE TOOLTIP */}
              {hoverIndex !== null && ranges.data[hoverIndex] && (
                <div 
                  className="absolute top-16 pointer-events-none bg-slate-950/95 border border-slate-700 p-4 rounded-lg shadow-2xl text-[11px] font-mono w-60 z-30 transition-all duration-75 text-left border-l-4 border-l-cyan-500 backdrop-blur-sm"
                  style={{
                    left: `${getX(hoverIndex, ranges.data.length) > 500 ? getX(hoverIndex, ranges.data.length) - 260 : getX(hoverIndex, ranges.data.length) + 20}px`
                  }}
                >
                  <p className="font-bold text-slate-100 border-b border-slate-800 pb-1.5 mb-2 flex justify-between text-xs">
                    <span>⏱️ SCADA Index:</span>
                    <span className="text-cyan-400 capitalize font-bold">{formatXAxisDate(ranges.data[hoverIndex].month)}</span>
                  </p>
                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Oil Rate:</span>
                      <span className="text-emerald-400 font-bold">{ranges.data[hoverIndex].oilRate.toLocaleString()} bopd</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Oil Cumulative:</span>
                      <span className="text-[#10b981] font-bold">{Math.round(ranges.data[hoverIndex].oilCum).toLocaleString()} Mstb</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-900/80 pt-1.5 mt-1">
                      <span className="text-slate-400 font-medium text-[10px]">BHP (Pressure):</span>
                      <span className="text-white font-bold">{ranges.data[hoverIndex].bottomHolePressure.toLocaleString()} psi</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium text-[10px]">THP (Wellhead):</span>
                      <span className="text-red-400 font-bold">{ranges.data[hoverIndex].wellheadPressure.toLocaleString()} psi</span>
                    </div>
                    {ranges.data[hoverIndex].gasLift > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Gas Injection:</span>
                        <span className="text-amber-400 font-bold">{ranges.data[hoverIndex].gasLift.toLocaleString()} mscf/d</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-900/80 pt-1.5 mt-1">
                      <span className="text-slate-400">GOR:</span>
                      <span className="text-rose-400 font-bold">{ranges.data[hoverIndex].gor.toLocaleString()} scf/stb</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Water Cut (WCT):</span>
                      <span className="text-blue-400 font-semibold">{ranges.data[hoverIndex].waterCut}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Choke Setting:</span>
                      <span className="text-purple-400 font-semibold">{ranges.data[hoverIndex].choke}/64&quot;</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

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
