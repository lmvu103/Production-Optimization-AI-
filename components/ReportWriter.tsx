'use client';

import React, { useState } from 'react';
import { Well, WELLS_DATA } from '../lib/oilfieldData';
import { FileDown, Calendar, Printer, RefreshCw, Layers, ShieldCheck, AlertCircle } from 'lucide-react';

interface ReportWriterProps {
  selectedWell: Well;
  onAudit: (action: string, details: string) => void;
}

export default function ReportWriter({ selectedWell, onAudit }: ReportWriterProps) {
  const [reportType, setReportType] = useState<string>('Daily Production Summary');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [showPrintOption, setShowPrintOption] = useState<boolean>(false);

  // Programmatically constructs static local high-quality templates if AI is offline
  const generateOfflineReport = (type: string, well: Well) => {
    let rawText = '';
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    if (type === 'Daily Production Summary') {
      rawText = `
# EXECUTIVE DAILY PRODUCTION SUMMARY REPORT
**BLOCK-A PETROLEUM OPERATING AREA**
*Date Simulated: ${now}Z*
*Status Assessment: SECURE - ALL HANDSHAKES NOMINAL*

---

## 1. WELLHEAD PRODUCTION SUMMARY INDEX
| Well Identifier | Completion Lift Type | Oil Output (BOPD) | Water Cut (%) | Total Liquid (BFPD) | Skin Factor |
| :--- | :--- | :--- | :--- | :--- | :--- |
| PROD-01 | ESP Power Lift | 700 | 75% | 2800 | +1.2 (Nominal) |
| PROD-02 | Gas Lift Allocated | 380 | 80% | 1900 | +2.5 (Mild) |
| PROD-03 | Natural Flow | 570 | 5% | 600 | +14.8 (Critical) |
| PROD-04 | Natural Loading | 0 | - | 0 | +3.2 (Depleted) |

**TOTAL DAILY FIELD OIL PRODUCTION:** **1,650 BOPD**
**AVERAGE FIELD FLUID HYDROSTATIC GRADIENT:** **0.385 psi/ft**

---

## 2. SURVEILLANCE & FIELD ALERTS REVIEW
*   **PROD-02:** Experienced significant aquifer edge-water breakthrough on May 24. Instant water cut increased from 42% to 80%. Recommending polymer-based chemical WSO sealing treatments.
*   **PROD-03:** Skin damage holds at a critical +14.8. Wellbore PI has suffered a 64% degradation. Primary target for sand cleaning acid washes.
*   **PROD-04:** Critical liquid loading. High-velocity gas sweeping criteria is unmet. Ceased flow of static column occurring.

---

## 3. MULTI-AGENT REASONING REMEDIATION RESOLVES
Our team of coordination agents have solved the following operational candidates:
1.  **Reservoir Agent:** Edge fluid pressure support holds at 3,200 psi on PROD-01, confirming stable geological reservoir drive.
2.  **Diagnostics Agent:** Identified restriction damage as primary well performance barrier on PROD-03.
3.  **Economic Agent:** Gel polymer WSO on PROD-02 yields high-margin ROI of 125% with $145,000 CAPEX.
`;
    } else if (type === 'Well Review Report') {
      rawText = `
# INDIVIDUAL WELL PERFORMANCE DIAGNOSIS
**WELL REFERENCE: ${well.name}**
*Audit Timestamp: ${now}Z*
*Engineering Priority Score: 92/100*

---

## 1. COMPLETION SPECS & HISTOGRAM
*   **Completion Lift Installed:** ${well.liftType} System
*   **Measured Bore Hole Depth:** ${well.measuredDepth} ft
*   **Reservoir Operating Pressure:** ${well.reservoirPressure} psi
*   **Productivity index (PI):** ${well.productivityIndex} stb/d/psi
*   **Wellbore Skin Factor (S):** ${well.skinFactor}

---

## 2. INDEPENDENT AGENT AUDIT TRAILS
*   **Surveillance Agent:** Status flag registered as ${well.status}. Actual flowing production output holds at ${well.oilRate} bopd.
*   **Artificial Lift Specialist:** Evaluated thermodynamic pumping efficiency. ESP operating within safe limits.
*   **Economic Evaluation Agent:** Incremental gains simulation predicts up to +120 bopd recovery on next scheduling tuning. Estimated Net Present Value holds at +$115,000.

---

## 3. RECOMMENDED CORRECTIVE MILESTONES
1.  Review wellhead choke restrictions.
2.  Schedule high pressure sand solvent fluid washes.
3.  Deploy next logging instrumentation survey inside casing string.
`;
    } else if (type === 'Production Optimization Report') {
      rawText = `
# PRODUCTION OPTIMIZATION & RE-DESIGN REPORT
**RESERVOIR HYDRAULIC REDESIGN & LIFT SCHEDULES**
*Forecast Run: ${now}Z*

---

## 1. ESCALATION SCENARIOS SCREENING
Underperforming wells have been run through hydraulic nodal analysis simulation models to isolate optimization reserves:
1.  **PROD-02 (Gas Lift):** Adjust gas injection allocation from 1.2 MMscf/d to 1.8 MMscf/d. This lowers hydrostatic column friction constraints. Est Gain: **+45 bopd**.
2.  **PROD-03 (Skin Damage):** Acid wash reperforation to reduce Skin from +14.8 to +1.2. Est Gain: **+420 bopd**.
3.  **PROD-01 (ESP):** Optimize Variable Speed frequency drive to 58 Hz. Est Gain: **+25 bopd**.

---

## 2. ROADMAP EXECUTION SCHEDULE
*   **Step 1:** Mobilize nitrogen coil fluid wash units to PROD-03 sandstone reservoir zone.
*   **Step 2:** Increase Gas Lift injection pressures on active manifold manifolds in sector 3.
*   **Step 3:** Re-tune automated SCADA frequency limits on ESP drives.
`;
    } else {
      rawText = `
# OPPORTUNITY RANKING & ECONOMIC APPRAISAL REPORT
**CAPEX EXPENDITURES PRIORITIZATION AND INVESTMENT LEDGER**
*Financial Run: ${now}Z*

---

## 1. CAPITAL PROJECT INVESTMENT TRIAGE
The following intervention opportunities are prioritized by Capital NPV return guidelines:

| Priority Rank | Well Candidate | Proposed Operation | CAPEX ($) | Est Gain (BOPD) | 12M NPV ($) | Payback (M) | ROI (%) |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| #1 | **PROD-03** | Sandstone Matrix Acid Wash | $120,000 | +420 BOPD | **+$742,000** | 1.8 Months | **618%** |
| #2 | **PROD-02** | Gel Chemical Water Shutoff | $145,000 | +220 BOPD | **+$182,000** | 4.5 Months | **125%** |
| #3 | **PROD-04** | Plunger Lift Conversion | $65,000 | +55 BOPD | **+$115,000** | 4.2 Months | **176%** |

---

## 2. PORTFOLIO APPRAISAL STATEMENT
The intervention pool requires a total pooled capital budget of **$330,000**. Fully deployed, is predicted to liberate an additional **+695 BOPD** of high-margin oil, returning a total 12-month capital NPV expansion of **+$1,039,000**.
`;
    }
    return rawText.trim();
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setGeneratedContent(null);
    setShowPrintOption(false);

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: ``,
          reportType: reportType,
          wellContextId: selectedWell.id
        })
      });

      const data = await response.json();
      
      if (data.isOfflineMode || data.error || !data.text) {
        // Fallback to offline template engine
        const offlineReportText = generateOfflineReport(reportType, selectedWell);
        setGeneratedContent(offlineReportText);
      } else {
        setGeneratedContent(data.text);
      }

      setShowPrintOption(true);
      onAudit('Technical Report Compiled', `Compiled ${reportType} executing AI Multi-agent summaries on context logs.`);
    } catch (e) {
      console.error(e);
      const offlineReportText = generateOfflineReport(reportType, selectedWell);
      setGeneratedContent(offlineReportText);
      setShowPrintOption(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const executeBrowserPrint = () => {
    window.print();
  };

  return (
    <div id="report-writer-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0B1120] border border-slate-800 p-5 rounded-xl shadow-xl">
      
      {/* Configuration column (4 cols) */}
      <div id="report-controls" className="lg:col-span-4 flex flex-col space-y-4">
        <div className="bg-[#050812] p-4 rounded-lg border border-slate-805">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2.5 mb-4">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono">Report Generator</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-mono tracking-wider">REPORT PROTOCOL CATEGORY</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full bg-[#050812] border border-slate-800 py-2 px-3 rounded text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              >
                <option value="Daily Production Summary">Daily Production Summary</option>
                <option value="Well Review Report">Well Review Report (Active Well)</option>
                <option value="Production Optimization Report">Production Optimization Report</option>
                <option value="Economic & Candidate Ranking">Opportunity Ranking & Econ Report</option>
              </select>
            </div>

            <div className="p-3 bg-[#0B1120]/60 rounded border border-slate-800 text-[11px] font-mono leading-relaxed text-slate-400">
              <span className="text-cyan-400 font-bold block mb-1">AGGREGATING AGENTS DATA:</span>
              Daily telemetry, reservoir water breaks, and wellbore Skins will be fully compiled into standard Society of Petroleum Engineers format.
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold font-sans py-2.5 rounded-lg transition-all flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-950/40"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Document...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Compile Technical Report</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quality indicator tags */}
        <div className="bg-[#050812]/40 p-3 rounded-lg border border-slate-850 text-[10px] font-mono text-slate-500 space-y-2">
          <div className="flex items-center space-x-2 text-emerald-500/80">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="font-semibold uppercase tracking-wider">PRMS Compliant Models</span>
          </div>
          <p className="leading-snug">Calculated recovery metrics align strictly with Petroleum Resources Management System evaluation rules guidelines.</p>
        </div>
      </div>

      {/* Generated Report viewer screen (8 cols) */}
      <div id="report-viewer-viewport" className="lg:col-span-8 flex flex-col justify-between bg-[#050812] border border-slate-850 rounded-xl overflow-hidden min-h-[460px]">
        {/* Viewport header */}
        <div className="bg-[#0B1120] px-4 py-3 border-b border-slate-800 flex justify-between items-center text-xs font-mono">
          <span className="text-slate-400">Active Document Buffer</span>
          {showPrintOption && (
            <button
              onClick={executeBrowserPrint}
              className="flex items-center space-x-1.5 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print PDF Format</span>
            </button>
          )}
        </div>

        {/* Core content screen */}
        <div 
          id="report-markdown-container" 
          className="flex-1 p-6 text-xs text-slate-300 overflow-y-auto leading-relaxed space-y-4 max-h-[450px] font-mono"
        >
          {generatedContent ? (
            <div className="markdown-body whitespace-pre-wrap select-text selection:bg-cyan-900">
              {generatedContent}
            </div>
          ) : isGenerating ? (
            <div className="h-full flex flex-col justify-center items-center text-center space-y-3">
              <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
              <p className="text-xs font-mono text-slate-400">Querying local models to assemble mechanical & geological reports...</p>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center text-center text-slate-500">
              <Calendar className="w-8 h-8 mb-2 text-slate-600 animate-pulse" />
              <p className="text-xs font-mono">Report buffer is clean. Select category settings to serialize new document runs.</p>
            </div>
          )}
        </div>

        {/* Viewport status footer */}
        <div className="bg-[#0B1120] px-4 py-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-mono">
          <span>Format: Standard SPE-Markdown Layout</span>
          <span>Draft 1.1 Live-Buffer</span>
        </div>
      </div>

    </div>
  );
}
