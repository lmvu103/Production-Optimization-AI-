'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useMemo, useEffect } from 'react';
import { forecastDecline, estimateReserves, calculateEconBenefit, solveOperatingPoint } from '../lib/engineeringMath';
import { AreaChart, Calculator, DollarSign, ListFilter, TrendingDown, Percent, Settings, Download, Activity } from 'lucide-react';
import { Well } from '../lib/oilfieldData';

/**
 * Robust date parser supporting DD-MM-YYYY, YYYY-MM-DD, Excel serial format, and month strings.
 */
const robustParseDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const clean = dateStr.trim();

  // Try parsing built-in Javascript Date, but exclude pure numbers
  const parsedDate = new Date(clean);
  if (!isNaN(parsedDate.getTime()) && !/^\d+$/.test(clean)) {
    return parsedDate;
  }

  // Handle numeric representation
  const numericVal = Number(clean);
  if (!isNaN(numericVal) && clean !== '') {
    if (numericVal > 30000 && numericVal < 100000) {
      // Excel serial date number
      return new Date((numericVal - 25569) * 86400 * 1000);
    } else if (numericVal > 100000000000) {
      // Unix timestamp in milliseconds
      return new Date(numericVal);
    } else if (numericVal > 10000000 && numericVal < 100000000) {
      // YYYYMMDD
      const yr = parseInt(clean.substring(0, 4), 10);
      const mo = parseInt(clean.substring(4, 6), 10);
      const dy = parseInt(clean.substring(6, 8), 10);
      return new Date(yr, mo - 1, dy);
    } else {
      // Assume unix seconds
      return new Date(numericVal * 1000);
    }
  }

  const normalized = clean.toLowerCase()
    .replace(/thg\s*/g, '')
    .replace(/tháng\s*/g, '')
    .replace(/thang\s*/g, '')
    .trim();

  const parts = normalized.split(/[-/ ]+/);
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    '01': 0, '02': 1, '03': 2, '04': 3, '05': 4, '06': 5, '07': 6, '08': 7, '09': 8, '10': 9, '11': 10, '12': 11,
    '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8
  };

  if (parts.length === 3) {
    // Check if YYYY-MM-DD
    if (parts[0].length === 4) {
      const yr = parseInt(parts[0], 10);
      const mStr = parts[1];
      const dy = parseInt(parts[2], 10);
      let mo = monthMap[mStr] !== undefined ? monthMap[mStr] : parseInt(mStr, 10) - 1;
      return new Date(yr, mo, dy);
    } else {
      // Assume DD-MM-YYYY or DD-MMM-YY
      const dy = parseInt(parts[0], 10);
      const mStr = parts[1];
      let yrStr = parts[2];
      let yr = parseInt(yrStr, 10);
      if (yrStr.length === 2) {
        yr = 2000 + yr;
      }
      let mo = monthMap[mStr] !== undefined ? monthMap[mStr] : parseInt(mStr, 10) - 1;
      return new Date(yr, mo, dy);
    }
  }

  if (parts.length === 2) {
    const p0 = parts[0];
    const p1 = parts[1];
    let mo = 0;
    let yr = 2026;
    if (monthMap[p0] !== undefined) {
      mo = monthMap[p0];
      yr = parseInt(p1, 10);
    } else if (monthMap[p1] !== undefined) {
      mo = monthMap[p1];
      yr = parseInt(p0, 10);
    }
    if (yr < 100) yr = 2000 + yr;
    return new Date(yr, mo, 1);
  }

  return new Date();
};

interface TechnicalCalculatorsProps {
  wells: Well[];
  selectedWell: Well;
  onSelectWell: (id: string) => void;
  onAudit: (action: string, details: string) => void;
}

export default function TechnicalCalculators({ wells, selectedWell, onSelectWell, onAudit }: TechnicalCalculatorsProps) {
  const [language, setLanguage] = useState<'en' | 'vi'>('vi');
  const [activeTab, setActiveTab] = useState<'DCA' | 'NODAL' | 'SKIN_PI' | 'ECON'>('DCA');

  // --- DCA State ---
  const [q0, setQ0] = useState<number>(850);
  const [declineRate, setDeclineRate] = useState<number>(1.8); // 1.8% monthly initial default
  const [declineType, setDeclineType] = useState<'EXPONENTIAL' | 'HARMONIC' | 'HYPERBOLIC'>('EXPONENTIAL');
  const [bParam, setBParam] = useState<number>(0.5);
  const [abRate, setAbRate] = useState<number>(40);
  const [forecastDuration, setForecastDuration] = useState<number>(24); // default to 24 months for dynamic forecast

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

  // --- NODAL State ---
  const [nodalPr, setNodalPr] = useState<number>(3000);
  const [nodalPb, setNodalPb] = useState<number>(1500);
  const [nodalPi, setNodalPi] = useState<number>(2.0);
  const [nodalWhp, setNodalWhp] = useState<number>(200);
  const [nodalDepth, setNodalDepth] = useState<number>(8000);
  const [nodalWaterCut, setNodalWaterCut] = useState<number>(30);
  const [nodalTubingID, setNodalTubingID] = useState<number>(2.441);
  const [nodalChoke, setNodalChoke] = useState<number>(48);
  const [nodalEspHz, setNodalEspHz] = useState<number>(50);
  const [nodalGasLift, setNodalGasLift] = useState<number>(0.5);
  const [iprMatchFactor, setIprMatchFactor] = useState<number>(1.0);
  const [vlpMatchFactor, setVlpMatchFactor] = useState<number>(1.0);
  const [matchStatus, setMatchStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [matchMessage, setMatchMessage] = useState<string>('');

  // Synchronize with selectedWell data
  useEffect(() => {
    if (!selectedWell || selectedWell.id === 'well-none') return;

    // 1. DCA
    const hasHistory = selectedWell.history && selectedWell.history.length > 0;
    const initRate = hasHistory 
      ? Math.max(10, selectedWell.history[0].oilRate) 
      : Math.max(10, selectedWell.oilRate || 100);
    setQ0(initRate);

    let computedDecline = 1.8;
    if (selectedWell.history && selectedWell.history.length > 1) {
      const firstPoint = selectedWell.history[0];
      const lastPoint = selectedWell.history[selectedWell.history.length - 1];
      
      // Determine if the history is daily or monthly dynamically
      let isDaily = false;
      const parseMonthYearForInit = robustParseDate;

      const parsedDates = selectedWell.history.map(p => parseMonthYearForInit(p.month));
      const diffs: number[] = [];
      for (let i = 1; i < parsedDates.length; i++) {
        const diffDays = Math.round(Math.abs(parsedDates[i].getTime() - parsedDates[i - 1].getTime()) / (1000 * 60 * 60 * 24));
        diffs.push(diffDays);
      }
      diffs.sort((a, b) => a - b);
      const medianDiff = diffs[Math.floor(diffs.length / 2)];
      if (medianDiff < 15 && medianDiff > 0) {
        isDaily = true;
      }

      const t_index = selectedWell.history.length - 1;
      const t_months = t_index * (isDaily ? (1 / 30.416) : 1);
      
      if (firstPoint.oilRate > 0 && lastPoint.oilRate > 0 && firstPoint.oilRate > lastPoint.oilRate && t_months > 0) {
        // Exponential matched monthly nominal decline
        const nominalMonthly = -Math.log(lastPoint.oilRate / firstPoint.oilRate) / t_months;
        computedDecline = parseFloat((nominalMonthly * 100).toFixed(2));
        computedDecline = Math.max(0.1, Math.min(50, computedDecline));
      }
    }
    setDeclineRate(computedDecline);

    const computedAbRate = Math.max(5, Math.round(initRate * 0.1 || 15));
    setAbRate(computedAbRate);

    // 2. SKIN & PI
    const testLiquid = Math.max(10, selectedWell.liquidRate || 100);
    setQTest(testLiquid);

    const resPressure = Math.max(100, selectedWell.reservoirPressure || 1000);
    setPrPressure(resPressure);

    let pwf = Math.round(resPressure * 0.75);
    if (selectedWell.history && selectedWell.history.length > 0) {
      const lastPoint = selectedWell.history[selectedWell.history.length - 1];
      if (lastPoint.bottomHolePressure > 0) {
        pwf = lastPoint.bottomHolePressure;
      }
    }
    if (pwf >= resPressure) {
      pwf = Math.round(resPressure * 0.75);
    }
    setPwfPressure(pwf);

    const computedIdealPi = parseFloat((selectedWell.productivityIndex * (Math.max(0, selectedWell.skinFactor) / 7.5 + 1)).toFixed(2));
    setIdealPi(Math.max(0.1, computedIdealPi || 2.5));

    // 3. Economy
    const estimatedGain = selectedWell.skinFactor > 0 
      ? Math.round(selectedWell.oilRate * (selectedWell.skinFactor / 7.5)) 
      : (selectedWell.id === 'well-04' || selectedWell.oilRate === 0 ? 250 : 100);
    setIncBopd(Math.max(20, estimatedGain));

    let defaultCapex = 120000;
    if (selectedWell.skinFactor > 8) {
      defaultCapex = 110000; // Acid job
    } else if (selectedWell.id === 'well-04' || selectedWell.status === 'DOWN') {
      defaultCapex = 180000; // Workover retrofit
    } else if (selectedWell.liftType === 'ESP') {
      defaultCapex = 95000; // ESP swap
    } else if (selectedWell.liftType === 'Gas Lift') {
      defaultCapex = 75000; // GL tuning
    }
    setCapex(defaultCapex);

    // 4. NODAL
    setNodalPr(selectedWell.reservoirPressure || 3000);
    setNodalPb(selectedWell.bubblePointPressure || 1500);
    setNodalPi(selectedWell.productivityIndex || 2.0);
    setNodalWhp(selectedWell.wellheadPressure || 200);
    setNodalDepth(selectedWell.reservoirDepth || 8000);
    setNodalWaterCut(selectedWell.waterCut || 30);
    setNodalTubingID(selectedWell.tubingID || 2.441);
    setNodalChoke(selectedWell.chokeSize || 48);
    setNodalEspHz(selectedWell.espHz || 50);
    setNodalGasLift(selectedWell.gasLiftInjectionRate || 0.5);
    setIprMatchFactor(1.0);
    setVlpMatchFactor(1.0);
    setMatchStatus('idle');
    setMatchMessage('');
  }, [selectedWell]);

  // 1. DCA computations
  const dcaCalculations = useMemo(() => {
    const decDecimal_monthly = declineRate / 100;
    
    const historyPoints = selectedWell.history || [];
    const N_h = historyPoints.length;

    // Determine isDaily
    let isDaily = false;
    if (historyPoints.length >= 2) {
      const parsedHistoryDates = historyPoints.map(p => robustParseDate(p.month));
      const diffs: number[] = [];
      for (let i = 1; i < parsedHistoryDates.length; i++) {
        const diffDays = Math.round(Math.abs(parsedHistoryDates[i].getTime() - parsedHistoryDates[i - 1].getTime()) / (1000 * 60 * 60 * 24));
        diffs.push(diffDays);
      }
      diffs.sort((a, b) => a - b);
      const medianDiff = diffs[Math.floor(diffs.length / 2)];
      if (medianDiff < 15 && medianDiff > 0) {
        isDaily = true;
      }
    } else if (historyPoints.length > 0) {
      if (historyPoints[0].month.split(/[\-\/\s]+/).length === 3 || historyPoints[0].month.includes('-')) {
        isDaily = true;
      }
    }

    const timeStepDays = isDaily ? 1 : 30.416;

    // 1. Reserves hiện tại (Actual produced cumulative from history)
    let historyReserves = 0;
    const finalPoint = historyPoints[historyPoints.length - 1];
    if (finalPoint && finalPoint.oilCum !== undefined) {
      historyReserves = finalPoint.oilCum;
    } else if (historyPoints.length > 0) {
      let tempCum = 0;
      for (let idx = 0; idx < historyPoints.length; idx++) {
        const item = historyPoints[idx];
        if (item.oilCum !== undefined) {
          tempCum = item.oilCum;
        } else {
          tempCum += (item.oilRate * timeStepDays) / 1000;
        }
      }
      historyReserves = tempCum;
    }

    // Solve for q_current (theoretical model rate at end of history)
    const t_end = N_h * (isDaily ? (1 / 30.416) : 1);
    let q_current = q0;
    if (N_h > 0) {
      if (declineType === 'EXPONENTIAL') {
        q_current = q0 * Math.exp(-decDecimal_monthly * t_end);
      } else if (declineType === 'HARMONIC') {
        q_current = q0 / (1 + decDecimal_monthly * t_end);
      } else {
        const b = Math.max(0.01, Math.min(0.99, bParam));
        q_current = q0 / Math.pow(1 + b * decDecimal_monthly * t_end, 1 / b);
      }
    }

    // Solve for forecast rates correctly matching the future forecast starting from end of history (t_end)
    const forecastStepRates: number[] = [];
    const t_start_forecast = N_h * (isDaily ? (1 / 30.416) : 1);
    for (let idx = 1; idx <= forecastDuration; idx++) {
      let modelVal = 0;
      const t_months = t_start_forecast + idx;
      if (declineType === 'EXPONENTIAL') {
        modelVal = q0 * Math.exp(-decDecimal_monthly * t_months);
      } else if (declineType === 'HARMONIC') {
        modelVal = q0 / (1 + decDecimal_monthly * t_months);
      } else {
        const b = Math.max(0.01, Math.min(0.99, bParam));
        modelVal = q0 / Math.pow(1 + b * decDecimal_monthly * t_months, 1 / b);
      }
      forecastStepRates.push(Math.round(Math.max(0, modelVal)));
    }
    const forecastReserves = forecastStepRates.reduce((sum, rate) => sum + (rate * timeStepDays) / 1000, 0);

    // Starting rate for remaining operating life is the ACTUAL live rate at the end of history if available,
    // which represents exact real-world conditions correctly.
    const q_start = (historyPoints.length > 0) ? (historyPoints[historyPoints.length - 1].oilRate) : q_current;

    // 3. Remaining Reserves and Years to operate starting from TODAY
    const d_annual = decDecimal_monthly * 12;
    let remainingCalculated = 0;
    let yearsToAbandon = 0;

    if (d_annual > 0 && q_start > abRate) {
      if (declineType === 'EXPONENTIAL') {
        const npBarrels = (q_start - abRate) * 365 / d_annual;
        remainingCalculated = npBarrels / 1000;
        yearsToAbandon = Math.log(q_start / abRate) / d_annual;
      } else if (declineType === 'HARMONIC') {
        const npBarrels = (q_start * 365 / d_annual) * Math.log(q_start / abRate);
        remainingCalculated = npBarrels / 1000;
        yearsToAbandon = ((q_start / abRate) - 1) / d_annual;
      } else {
        const b = Math.max(0.01, Math.min(0.99, bParam));
        const npBarrels = (Math.pow(q_start, b) * 365 / (d_annual * (1 - b))) * 
                          (Math.pow(q_start, 1 - b) - Math.pow(abRate, 1 - b));
        remainingCalculated = npBarrels / 1000;
        yearsToAbandon = (Math.pow(q_start / abRate, b) - 1) / (b * d_annual);
      }
    }

    const trueEur = historyReserves + remainingCalculated;

    return { 
      forecast: forecastStepRates, 
      reserves: {
        eur: parseFloat(trueEur.toFixed(2)),
        remainingReservesMbo: parseFloat(remainingCalculated.toFixed(2)),
        yearsToAbandon: parseFloat(yearsToAbandon.toFixed(1)),
        historyReservesMbo: parseFloat(historyReserves.toFixed(2)),
        forecastReservesMbo: parseFloat(forecastReserves.toFixed(2))
      } 
    };
  }, [q0, declineRate, declineType, bParam, abRate, forecastDuration, selectedWell]);

  // 1.1 DCA SVG drawing logic
  const dcaSvgData = useMemo(() => {
    const width = 500;
    const height = 220;
    const padX_left = 50;
    const padX_right = 25;
    const padY_top = 25;
    const padY_bottom = 35;

    const historyPoints = selectedWell.history || [];
    const N_h = historyPoints.length;
    const decDecimal = declineRate / 100;

    const parseMonthYear = robustParseDate;

    const parsedHistoryDates = historyPoints.map(p => parseMonthYear(p.month));
    let isDaily = false;
    if (parsedHistoryDates.length >= 2) {
      const diffs: number[] = [];
      for (let i = 1; i < parsedHistoryDates.length; i++) {
        const diffDays = Math.round(Math.abs(parsedHistoryDates[i].getTime() - parsedHistoryDates[i - 1].getTime()) / (1000 * 60 * 60 * 24));
        diffs.push(diffDays);
      }
      diffs.sort((a, b) => a - b);
      const medianDiff = diffs[Math.floor(diffs.length / 2)];
      if (medianDiff < 15 && medianDiff > 0) {
        isDaily = true;
      }
    } else if (historyPoints.length > 0) {
      const parts = historyPoints[0].month.split(/[\-\/\s]+/);
      if (parts.length === 3 || historyPoints[0].month.includes('-')) {
        isDaily = true;
      }
    }

    const formatLabel = (date: Date): string => {
      const ref = lastHistoryLabel || '';
      const cleanRef = ref.trim();
      
      // Pattern 1: DD-MM-YYYY style
      if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(cleanRef)) {
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return `${d}-${m}-${y}`;
      }
      
      // Pattern 2: DD/MM/YYYY style
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanRef)) {
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
      }

      // Pattern 3: MMM YY style (e.g. "Jun 25", "May 26")
      const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (/^[A-Za-z]{3}\s+\d{2}$/.test(cleanRef)) {
        const mName = monthsShort[date.getMonth()];
        const yTwoDigit = String(date.getFullYear()).substring(2);
        return `${mName} ${yTwoDigit}`;
      }

      // Pattern 4: MMM-YY style (e.g. "Jun-25")
      if (/^[A-Za-z]{3}-\d{2}$/.test(cleanRef)) {
        const mName = monthsShort[date.getMonth()];
        const yTwoDigit = String(date.getFullYear()).substring(2);
        return `${mName}-${yTwoDigit}`;
      }

      // Default fallback
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}-${m}-${y}`;
    };

    const lastHistoryLabel = N_h > 0 ? historyPoints[N_h - 1].month : 'May 26';
    const lastHistoryDate = parseMonthYear(lastHistoryLabel);

    const plotPoints: {
      t: number;
      label: string;
      actualRate: number | null;
      modelRate: number;
      isForecast: boolean;
    }[] = [];

    const decDecimal_monthly = declineRate / 100;

    if (N_h > 0) {
      // 1. Matched Model over History (t_months continuous scaling from 0 to N_h-1)
      for (let t = 0; t < N_h; t++) {
        const histVal = historyPoints[t].oilRate;
        const timeInMonths = t * (isDaily ? (1 / 30.416) : 1);
        let modelVal = 0;
        if (declineType === 'EXPONENTIAL') {
          modelVal = q0 * Math.exp(-decDecimal_monthly * timeInMonths);
        } else if (declineType === 'HARMONIC') {
          modelVal = q0 / (1 + decDecimal_monthly * timeInMonths);
        } else {
          const b = Math.max(0.01, Math.min(0.99, bParam));
          modelVal = q0 / Math.pow(1 + b * decDecimal_monthly * timeInMonths, 1 / b);
        }

        const labelStr = historyPoints[t].month;

        plotPoints.push({
          t,
          label: labelStr,
          actualRate: histVal,
          modelRate: Math.max(0, Math.round(modelVal)),
          isForecast: false,
        });
      }

      // 2. Future Forecast continuation starting from end of history
      for (let idx = 0; idx < forecastDuration; idx++) {
        const countOffset = idx + 1;
        const timeInMonths = ((N_h - 1) * (isDaily ? (1 / 30.416) : 1)) + countOffset;
        
        let modelVal = 0;
        if (declineType === 'EXPONENTIAL') {
          modelVal = q0 * Math.exp(-decDecimal_monthly * timeInMonths);
        } else if (declineType === 'HARMONIC') {
          modelVal = q0 / (1 + decDecimal_monthly * timeInMonths);
        } else {
          const b = Math.max(0.01, Math.min(0.99, bParam));
          modelVal = q0 / Math.pow(1 + b * decDecimal_monthly * timeInMonths, 1 / b);
        }

        let forecastDate: Date;
        if (isDaily) {
          forecastDate = new Date(lastHistoryDate.getTime() + countOffset * 30.416 * 24 * 60 * 60 * 1000);
        } else {
          forecastDate = new Date(lastHistoryDate.getFullYear(), lastHistoryDate.getMonth() + countOffset, 1);
        }
        const labelStr = formatLabel(forecastDate);

        plotPoints.push({
          t: N_h + idx,
          label: labelStr,
          actualRate: null,
          modelRate: Math.max(0, Math.round(modelVal)),
          isForecast: true,
        });
      }
    } else {
      // Fallback if no history exists (pure forecastDuration-month forecast starting at base May 2026)
      const baseDate = parseMonthYear('May 26');
      for (let t = 0; t < forecastDuration; t++) {
        let modelVal = 0;
        if (declineType === 'EXPONENTIAL') {
          modelVal = q0 * Math.exp(-decDecimal_monthly * t);
        } else if (declineType === 'HARMONIC') {
          modelVal = q0 / (1 + decDecimal_monthly * t);
        } else {
          const b = Math.max(0.01, Math.min(0.99, bParam));
          modelVal = q0 / Math.pow(1 + b * decDecimal_monthly * t, 1 / b);
        }

        const forecastDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + t, 1);
        const labelStr = formatLabel(forecastDate);

        plotPoints.push({
          t,
          label: labelStr,
          actualRate: null,
          modelRate: Math.max(0, Math.round(modelVal)),
          isForecast: true,
        });
      }
    }

    const allRates = plotPoints.flatMap(p => [p.actualRate || 0, p.modelRate]);
    const maxVal = Math.max(100, ...allRates, q0) * 1.1;

    const points = plotPoints.map((p, idx) => {
      const x = padX_left + (idx / (plotPoints.length - 1)) * (width - padX_left - padX_right);
      const y = height - padY_bottom - (p.modelRate / maxVal) * (height - padY_top - padY_bottom);
      const actualY = p.actualRate !== null 
        ? height - padY_bottom - (p.actualRate / maxVal) * (height - padY_top - padY_bottom)
        : 0;

      return {
        ...p,
        x,
        y,
        actualY,
      };
    });

    const actualPoints = points.filter(p => p.actualRate !== null);
    const actualLinePath = actualPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.actualY}`).join(' ');

    const matchedHistoryPoints = points.filter(p => !p.isForecast);
    const matchedLinePath = matchedHistoryPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const forecastPoints = points.filter(p => p.isForecast);
    const fullForecastPoints = matchedHistoryPoints.length > 0
      ? [matchedHistoryPoints[matchedHistoryPoints.length - 1], ...forecastPoints]
      : forecastPoints;

    const forecastLinePath = fullForecastPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const forecastAreaPath = fullForecastPoints.length > 0
      ? `${forecastLinePath} L ${fullForecastPoints[fullForecastPoints.length - 1].x} ${height - padY_bottom} L ${fullForecastPoints[0].x} ${height - padY_bottom} Z`
      : '';

    return {
      points,
      actualPoints,
      matchedHistoryPoints,
      forecastPoints,
      actualLinePath,
      matchedLinePath,
      forecastLinePath,
      forecastAreaPath,
      width,
      height,
      padX_left,
      padX_right,
      padY_top,
      padY_bottom,
      maxVal,
    };
  }, [selectedWell, declineRate, declineType, bParam, q0, forecastDuration]);

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

  // --- NODAL CALCULATIONS & MODELS ---
  
  // Computed Matched IPR Curve
  const nodalIprCurve = useMemo(() => {
    const steps = 25;
    const curve: { q: number; pwf: number }[] = [];
    
    for (let i = 0; i <= steps; i++) {
      const pwf = Math.round((nodalPr * (steps - i)) / steps);
      let q = 0;
      
      if (pwf >= nodalPb) {
        q = nodalPi * (nodalPr - pwf);
      } else {
        if (nodalPr > nodalPb) {
          const q_pb = nodalPi * (nodalPr - nodalPb);
          const j_vogel = nodalPi;
          const drawdownFraction = pwf / nodalPb;
          const vogelReduction = 1 - 0.2 * drawdownFraction - 0.8 * Math.pow(drawdownFraction, 2);
          const q_below_pb_max = (j_vogel * nodalPb) / 1.8;
          q = q_pb + q_below_pb_max * vogelReduction;
        } else {
          const drawdownFraction = pwf / nodalPr;
          const vogelReduction = 1 - 0.2 * drawdownFraction - 0.8 * Math.pow(drawdownFraction, 2);
          const qMaxVogel = (nodalPi * nodalPr) / 1.8;
          q = qMaxVogel * vogelReduction;
        }
      }
      
      const matchedQ = q * iprMatchFactor;
      curve.push({ q: Math.round(Math.max(0, matchedQ)), pwf });
    }
    return curve;
  }, [nodalPr, nodalPb, nodalPi, iprMatchFactor]);

  // Computed Matched VLP Curve
  const nodalVlpCurve = useMemo(() => {
    const steps = 25;
    const curve: { q: number; pwf: number }[] = [];

    const baseWaterDensityGradient = 0.435; // psi/ft
    const baseOilDensityGradient = 0.35; // psi/ft
    const averageLiquidGradient = (nodalWaterCut / 100) * baseWaterDensityGradient + (1 - nodalWaterCut / 100) * baseOilDensityGradient;
    
    const gl = selectedWell.liftType === 'Gas Lift' ? nodalGasLift : 0;
    const hz = selectedWell.liftType === 'ESP' ? nodalEspHz : 0;

    const gasRatioFactor = gl > 0 ? Math.min(0.35, 0.12 * gl) : 0;
    const effectiveGradient = averageLiquidGradient * (1 - gasRatioFactor);
    
    const chokeFactor = Math.pow(64 / Math.max(12, nodalChoke), 1.8);
    const extraChokeBackpressure = nodalChoke < 64 ? 50 * chokeFactor : 0;
    
    const espHead = hz > 0 ? (Math.pow(hz / 60, 2) * 1200) : 0;
    
    const estMaxIprRate = nodalPr * nodalPi * iprMatchFactor;
    const maxWellRate = Math.max(1000, Math.ceil(estMaxIprRate / 500) * 500 + 500);

    for (let qStep = 1; qStep <= steps; qStep++) {
      const q = (maxWellRate * qStep) / steps;
      
      const hydrostaticP = nodalDepth * effectiveGradient;
      const tubingSizeFactor = Math.pow(2.875 / nodalTubingID, 4.5);
      const frictionFactor = 0.00003 * tubingSizeFactor;
      const frictionP = q * q * frictionFactor;
      
      const rawLosses = hydrostaticP + frictionP;
      const matchedLosses = rawLosses * vlpMatchFactor;

      let pwfOut = nodalWhp + matchedLosses + extraChokeBackpressure - espHead;
      pwfOut = Math.round(Math.max(nodalWhp, pwfOut));
      
      curve.push({ q: Math.round(q), pwf: pwfOut });
    }
    return curve;
  }, [selectedWell.liftType, nodalWhp, nodalDepth, nodalWaterCut, nodalTubingID, nodalChoke, nodalEspHz, nodalGasLift, nodalPr, nodalPi, iprMatchFactor, vlpMatchFactor]);

  // Intersection operating point
  const nodalOperatingPoint = useMemo(() => {
    return solveOperatingPoint(nodalIprCurve, nodalVlpCurve);
  }, [nodalIprCurve, nodalVlpCurve]);

  // Map to SVG paths (width = 500, height = 280)
  const nodalSvgCoordinates = useMemo(() => {
    const width = 500;
    const height = 285;
    const padding = 42;

    const maxIprQ = nodalIprCurve.length > 0 ? Math.max(...nodalIprCurve.map(pt => pt.q)) : 4000;
    const maxQ = Math.max(1000, Math.ceil(maxIprQ / 500) * 500 + 500);
    const maxP = Math.max(1500, Math.ceil((nodalPr || 4000) / 500) * 500 + 500);

    const translatePoint = (q: number, p: number) => {
      const x = padding + (q / maxQ) * (width - padding * 2);
      const y = height - padding - (p / maxP) * (height - padding * 2);
      return { x, y };
    };

    const iprPath = nodalIprCurve.map((pt, idx) => {
      const { x, y } = translatePoint(pt.q, pt.pwf);
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const vlpPath = nodalVlpCurve.map((pt, idx) => {
      const { x, y } = translatePoint(pt.q, pt.pwf);
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const opPoint = nodalOperatingPoint ? translatePoint(nodalOperatingPoint.q, nodalOperatingPoint.pwf) : null;
    
    const actualPwf = selectedWell.history && selectedWell.history.length > 0
      ? selectedWell.history[selectedWell.history.length - 1].bottomHolePressure
      : Math.round(selectedWell.reservoirPressure * 0.7);
    const actualQ = selectedWell.liquidRate || 1000;
    const actualPoint = translatePoint(actualQ, actualPwf);

    const qStepVal = Math.max(250, Math.ceil((maxQ / 4) / 250) * 250);
    const qLabels: { val: number; x: number }[] = [];
    for (let qVal = qStepVal; qVal < maxQ; qVal += qStepVal) {
      qLabels.push({
        val: qVal,
        x: padding + (qVal / maxQ) * (width - padding * 2)
      });
    }

    const pStepVal = Math.max(250, Math.ceil((maxP / 4) / 550) * 500);
    const pLabels: { val: number; y: number }[] = [];
    for (let pVal = pStepVal; pVal < maxP; pVal += pStepVal) {
      pLabels.push({
        val: pVal,
        y: height - padding - (pVal / maxP) * (height - padding * 2)
      });
    }

    return { iprPath, vlpPath, opPoint, actualPoint, qLabels, pLabels, padding, width, height, actualQ, actualPwf, maxQ, maxP };
  }, [nodalIprCurve, nodalVlpCurve, nodalOperatingPoint, nodalPr, selectedWell]);

  // CALIBRATION & MATCHING ENGINE RUNNER
  const handleAutoMatch = () => {
    if (!selectedWell || selectedWell.id === 'well-none') return;
    
    const actualPwf = selectedWell.history && selectedWell.history.length > 0
      ? selectedWell.history[selectedWell.history.length - 1].bottomHolePressure
      : Math.round(selectedWell.reservoirPressure * 0.7);
    const qActual = selectedWell.liquidRate || 1000;

    let qUnscaled = 0;
    if (actualPwf >= nodalPb) {
      qUnscaled = nodalPi * (nodalPr - actualPwf);
    } else {
      if (nodalPr > nodalPb) {
        const q_pb = nodalPi * (nodalPr - nodalPb);
        const j_vogel = nodalPi;
        const drawdownFraction = actualPwf / nodalPb;
        const vogelReduction = 1 - 0.2 * drawdownFraction - 0.8 * Math.pow(drawdownFraction, 2);
        const q_below_pb_max = (j_vogel * nodalPb) / 1.8;
        qUnscaled = q_pb + q_below_pb_max * vogelReduction;
      } else {
        const drawdownFraction = actualPwf / nodalPr;
        const vogelReduction = 1 - 0.2 * drawdownFraction - 0.8 * Math.pow(drawdownFraction, 2);
        const qMaxVogel = (nodalPi * nodalPr) / 1.8;
        qUnscaled = qMaxVogel * vogelReduction;
      }
    }

    let calculatedIprFactor = 1.0;
    if (qUnscaled > 0) {
      calculatedIprFactor = qActual / qUnscaled;
    }
    const matchedIprFactor = Math.max(0.1, Math.min(3.0, parseFloat(calculatedIprFactor.toFixed(3))));

    const baseWaterDensityGradient = 0.435;
    const baseOilDensityGradient = 0.35;
    const averageLiquidGradient = (nodalWaterCut / 100) * baseWaterDensityGradient + (1 - nodalWaterCut / 100) * baseOilDensityGradient;
    
    const gl = selectedWell.liftType === 'Gas Lift' ? nodalGasLift : 0;
    const hz = selectedWell.liftType === 'ESP' ? nodalEspHz : 0;

    const gasRatioFactor = gl > 0 ? Math.min(0.35, 0.12 * gl) : 0;
    const effectiveGradient = averageLiquidGradient * (1 - gasRatioFactor);
    
    const chokeFactor = Math.pow(64 / Math.max(12, nodalChoke), 1.8);
    const extraChokeBackpressure = nodalChoke < 64 ? 50 * chokeFactor : 0;
    const espHead = hz > 0 ? (Math.pow(hz / 60, 2) * 1200) : 0;
    
    const hydrostaticP = nodalDepth * effectiveGradient;
    const tubingSizeFactor = Math.pow(2.875 / nodalTubingID, 4.5);
    const frictionFactor = 0.00003 * tubingSizeFactor;
    const frictionP = qActual * qActual * frictionFactor;
    
    const rawLosses = hydrostaticP + frictionP;
    const targetLosses = actualPwf - nodalWhp - extraChokeBackpressure + espHead;

    let calculatedVlpFactor = 1.0;
    if (rawLosses > 0 && targetLosses > 0) {
      calculatedVlpFactor = targetLosses / rawLosses;
    } else {
      calculatedVlpFactor = (actualPwf > nodalWhp) ? ((actualPwf - nodalWhp) / (hydrostaticP || 1)) : 1.0;
    }
    const matchedVlpFactor = Math.max(0.2, Math.min(3.0, parseFloat(calculatedVlpFactor.toFixed(3))));

    setIprMatchFactor(matchedIprFactor);
    setVlpMatchFactor(matchedVlpFactor);
    setMatchStatus('success');
    setMatchMessage(`Sự hòa hợp hoàn hảo! Hệ số Inflow (IPR) đã được đặt thành ${matchedIprFactor} và Outflow (VLP) thành ${matchedVlpFactor}. Mô hình đã khớp chính xác với điểm SCADA thực tế.`);
    onAudit('Nodal Calibration Model Math Success', `Automatically matched IPR scale to ${matchedIprFactor} and VLP scale to ${matchedVlpFactor} for ${selectedWell.name} at actual flow rate ${qActual} bpd / BHP ${actualPwf} psi.`);
  };

  const recordNodalAudit = () => {
    onAudit('Nodal Model Manual Optimization Saved', `Calibrated manually: IPR Factor=${iprMatchFactor}, VLP Factor=${vlpMatchFactor}. Solved intersection: ${nodalOperatingPoint ? `${nodalOperatingPoint.q} bpd / ${nodalOperatingPoint.pwf} psi` : 'UNSTABLE FLOW'}`);
  };

  const recordDCAAudit = () => {
    onAudit('Arps DCA Forecast Simulated', `Forecast q0=${q0}, dec=${declineRate}%, type=${declineType}. Solved EUR = ${dcaCalculations.reserves.eur} Mbo.`);
  };

  const autoFitHistory = () => {
    if (!selectedWell.history || selectedWell.history.length < 2) {
      onAudit('DCA Fit Failed', 'Not enough production history to perform auto-fit.');
      return;
    }

    const history = selectedWell.history;
    const n = history.length;

    // Detect if history is daily or monthly dynamically to scale independent variable (t) to MONTHS
    let isDaily = false;
    const parseMonthYearForFit = robustParseDate;

    const parsedDates = history.map(p => parseMonthYearForFit(p.month));
    const diffs: number[] = [];
    for (let i = 1; i < parsedDates.length; i++) {
      const diffDays = Math.round(Math.abs(parsedDates[i].getTime() - parsedDates[i - 1].getTime()) / (1000 * 60 * 60 * 24));
      diffs.push(diffDays);
    }
    diffs.sort((a, b) => a - b);
    const medianDiff = diffs[Math.floor(diffs.length / 2)];
    if (medianDiff < 15 && medianDiff > 0) {
      isDaily = true;
    }

    // Linear regression on exponential decline model:
    // ln(q_t) = ln(q_0) - D_i * t (where t is always in MONTHS)
    let sumT = 0;
    let sumY = 0;
    let sumT2 = 0;
    let sumTY = 0;
    let validCount = 0;

    for (let t = 0; t < n; t++) {
      const q = history[t].oilRate;
      if (q > 0) {
        const t_months = t * (isDaily ? (1 / 30.416) : 1);
        const y = Math.log(q);
        sumT += t_months;
        sumY += y;
        sumT2 += t_months * t_months;
        sumTY += t_months * y;
        validCount++;
      }
    }

    if (validCount < 2) {
      onAudit('DCA Fit Failed', 'Insufficient non-zero history points to perform fit.');
      return;
    }

    const meanT = sumT / validCount;
    const meanY = sumY / validCount;

    let num = 0;
    let den = 0;
    for (let t = 0; t < n; t++) {
      const q = history[t].oilRate;
      if (q > 0) {
        const t_months = t * (isDaily ? (1 / 30.416) : 1);
        num += (t_months - meanT) * (Math.log(q) - meanY);
        den += (t_months - meanT) * (t_months - meanT);
      }
    }

    let fittedQ0 = q0;
    let fittedDecline = declineRate;

    if (den > 0) {
      const slope = num / den; // slope = -d (monthly nominal decline)
      const intercept = meanY - slope * meanT; // intercept = ln(q0)

      const nominalDecline = -slope;
      fittedQ0 = Math.exp(intercept);
      fittedDecline = nominalDecline * 100; // in percent per month
    } else {
      const sumRates = history.reduce((sum, h) => sum + h.oilRate, 0);
      fittedQ0 = sumRates / n;
      fittedDecline = 1.0;
    }

    // Clip to sensible values
    fittedQ0 = Math.max(1, Math.round(fittedQ0));
    fittedDecline = Math.max(0.01, Math.min(50, parseFloat(fittedDecline.toFixed(3))));

    if (declineType === 'EXPONENTIAL') {
      setQ0(fittedQ0);
      setDeclineRate(fittedDecline);
    } else if (declineType === 'HARMONIC') {
      // Harmonic regression: y = 1 / q = A + B * t
      let hSumT = 0;
      let hSumY = 0;
      let hCount = 0;

      for (let t = 0; t < n; t++) {
        const q = history[t].oilRate;
        if (q > 0) {
          hSumT += t;
          hSumY += 1 / q;
          hCount++;
        }
      }

      if (hCount >= 2) {
        const hMeanT = hSumT / hCount;
        const hMeanY = hSumY / hCount;
        let hNum = 0;
        let hDen = 0;
        for (let t = 0; t < n; t++) {
          const q = history[t].oilRate;
          if (q > 0) {
            hNum += (t - hMeanT) * ((1 / q) - hMeanY);
            hDen += (t - hMeanT) * (t - hMeanT);
          }
        }
        if (hDen > 0) {
          const B = hNum / hDen;
          const A = hMeanY - B * hMeanT;
          const estQ0 = A > 0 ? 1 / A : history[0].oilRate;
          const estDecline = B * estQ0 * 100;
          setQ0(Math.max(1, Math.round(estQ0)));
          setDeclineRate(Math.max(0.01, Math.min(50, parseFloat(estDecline.toFixed(3)))));
        }
      }
    } else {
      // Hyperbolic
      // We optimize over the best exponent b matching actual rates
      let bestB = bParam;
      let bestQ0 = fittedQ0;
      let bestDecline = fittedDecline;
      let minRmse = Infinity;

      for (let b = 0.1; b <= 0.9; b += 0.1) {
        let sumT = 0;
        let sumY = 0;
        let count = 0;
        for (let t = 0; t < n; t++) {
          const q = history[t].oilRate;
          if (q > 0) {
            sumT += t;
            sumY += Math.pow(q, -b);
            count++;
          }
        }
        if (count >= 2) {
          const meanT = sumT / count;
          const meanY = sumY / count;
          let num = 0;
          let den = 0;
          for (let t = 0; t < n; t++) {
            const q = history[t].oilRate;
            if (q > 0) {
              num += (t - meanT) * (Math.pow(q, -b) - meanY);
              den += (t - meanT) * (t - meanT);
            }
          }
          if (den > 0) {
            const B = num / den;
            const A = meanY - B * meanT;
            if (A > 0) {
              const estQ0 = Math.pow(A, -1 / b);
              const estDecline = (B / (A * b)) * 100;
              
              let rmseSum = 0;
              for (let t = 0; t < n; t++) {
                const qActual = history[t].oilRate;
                const qModel = estQ0 / Math.pow(1 + b * (estDecline/100) * t, 1 / b);
                rmseSum += Math.pow(qActual - qModel, 2);
              }
              const rmse = Math.sqrt(rmseSum / n);
              if (rmse < minRmse) {
                minRmse = rmse;
                bestB = parseFloat(b.toFixed(2));
                bestQ0 = Math.round(estQ0);
                bestDecline = parseFloat(estDecline.toFixed(3));
              }
            }
          }
        }
      }
      setQ0(Math.max(1, bestQ0));
      setDeclineRate(Math.max(0.01, Math.min(50, bestDecline)));
      setBParam(bestB);
    }

    onAudit(
      'Arps Production History Fitted', 
      `Matched ${selectedWell.name} history. Fitted q0=${fittedQ0} BOPD, Decline=${fittedDecline}%/mo on ${declineType} model.`
    );
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
          onClick={() => setActiveTab('NODAL')}
          className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-lg transition-all flex items-center justify-center space-x-1 border cursor-pointer ${
            activeTab === 'NODAL' 
              ? 'bg-[#0B1120] text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border-transparent'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          <span>Nodal Analysis Plot</span>
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

      {/* Dynamic Selected Well Context Bar */}
      {wells && wells.length > 0 && (
        <div id="calculator-well-selector-bar" className="bg-[#0B1120] border-b border-slate-800/60 px-6 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center space-x-3">
            <span className="text-[9px] bg-cyan-950/50 text-cyan-400 font-mono px-2 py-0.5 rounded border border-cyan-900/60 font-bold uppercase tracking-wider">Active Well Context</span>
            <strong className="text-sm font-bold text-slate-200 uppercase font-mono tracking-tight">{selectedWell.name}</strong>
            <span className={`h-2.5 w-2.5 rounded-full ring-2 ring-[#0B1120] ${
              selectedWell.status === 'OPTIMAL' ? 'bg-emerald-500' :
              selectedWell.status === 'UNDERPERFORMER' ? 'bg-amber-500' :
              selectedWell.status === 'CRITICAL' ? 'bg-rose-500' : 'bg-slate-500'
            }`} />
            <span className="text-[10px] text-slate-450 font-mono tracking-wide">({selectedWell.status} | {selectedWell.liftType})</span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase whitespace-nowrap">Select Production Target:</span>
            <select
              value={selectedWell.id}
              onChange={(e) => onSelectWell(e.target.value)}
              className="bg-[#050812] border border-slate-800 text-xs text-slate-200 px-3 py-1.5 rounded-lg focus:border-cyan-500 focus:outline-none font-mono cursor-pointer hover:border-slate-700 transition-colors w-full sm:w-48"
            >
              {wells.map(w => (
                <option key={w.id} value={w.id} className="bg-[#050812] font-mono text-xs">
                  {w.name} ({w.liftType})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

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
                  <label className="text-[10px] text-slate-400 font-mono">MONTHLY DECLINE RATE (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={declineRate}
                    onChange={(e) => setDeclineRate(Math.max(0.01, parseFloat(e.target.value) || 0))}
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono uppercase">ABANDONMENT CUTOFF (BOPD)</label>
                  <input
                    type="number"
                    value={abRate}
                    onChange={(e) => setAbRate(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-[#050812] border border-slate-800 px-3 py-1.5 rounded text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-cyan-400 font-mono font-bold">DCA FORECAST DURATION</label>
                  <select
                    value={forecastDuration}
                    onChange={(e) => setForecastDuration(parseInt(e.target.value))}
                    className="w-full bg-[#050812] border border-slate-800 px-3 py-1.5 rounded text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none cursor-pointer"
                  >
                    <option value="6">6 Months</option>
                    <option value="12">12 Months (1 Yr)</option>
                    <option value="24">24 Months (2 Yrs)</option>
                    <option value="36">36 Months (3 Yrs)</option>
                    <option value="48">48 Months (4 Yrs)</option>
                    <option value="60">60 Months (5 Yrs)</option>
                  </select>
                </div>
              </div>

              <button
                id="dca-project-action-btn"
                onClick={autoFitHistory}
                className="w-full bg-[#00f2fe]/10 hover:bg-[#00f2fe]/20 text-[#00f2fe] hover:shadow-[0_0_15px_rgba(0,242,254,0.15)] text-xs font-mono font-bold py-2.5 rounded-lg border border-[#00f2fe]/30 hover:border-[#00f2fe]/50 transition-all cursor-pointer shadow-lg active:scale-95 text-center flex items-center justify-center gap-2"
              >
                <Activity className="w-4 h-4 animate-pulse text-[#00f2fe]" /> Auto matching production history
              </button>
            </div>

            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-semibold tracking-wider text-slate-400 font-mono uppercase">Production History Match &amp; Forecast Plot</h3>
                  <span className="text-[10px] text-cyan-500 font-mono">History ({selectedWell.history?.length || 0}M) + Forecast (+{forecastDuration}M)</span>
                </div>
                
                {/* Visualizer container */}
                <div className="bg-[#050812] p-4 rounded-lg border border-slate-850">
                  <svg width="100%" height={dcaSvgData.height} viewBox={`0 0 ${dcaSvgData.width} ${dcaSvgData.height}`} className="overflow-visible">
                    {/* Gridlines */}
                    {[0.25, 0.5, 0.75].map((fac, idx) => (
                      <line
                        key={idx}
                        x1={dcaSvgData.padX_left}
                        y1={dcaSvgData.padY_top + fac * (dcaSvgData.height - dcaSvgData.padY_top - dcaSvgData.padY_bottom)}
                        x2={dcaSvgData.width - dcaSvgData.padX_right}
                        y2={dcaSvgData.padY_top + fac * (dcaSvgData.height - dcaSvgData.padY_top - dcaSvgData.padY_bottom)}
                        stroke="#1e293b"
                        strokeWidth="0.5"
                        strokeDasharray="2"
                      />
                    ))}

                    {/* Y-Axis labels */}
                    {[0, 0.25, 0.5, 0.75, 1].map((fac, idx) => {
                      const val = Math.round(dcaSvgData.maxVal * fac);
                      const y = dcaSvgData.height - dcaSvgData.padY_bottom - fac * (dcaSvgData.height - dcaSvgData.padY_top - dcaSvgData.padY_bottom);
                      return (
                        <text
                          key={idx}
                          x={dcaSvgData.padX_left - 8}
                          y={y + 3}
                          fill="#64748b"
                          fontSize="8"
                          fontFamily="monospace"
                          textAnchor="end"
                        >
                          {val}
                        </text>
                      );
                    })}

                    {/* Abandonment Rate Limit Line */}
                    {abRate < dcaSvgData.maxVal && (
                      <g>
                        <line
                          x1={dcaSvgData.padX_left}
                          y1={dcaSvgData.height - dcaSvgData.padY_bottom - (abRate / dcaSvgData.maxVal) * (dcaSvgData.height - dcaSvgData.padY_top - dcaSvgData.padY_bottom)}
                          x2={dcaSvgData.width - dcaSvgData.padX_right}
                          y2={dcaSvgData.height - dcaSvgData.padY_bottom - (abRate / dcaSvgData.maxVal) * (dcaSvgData.height - dcaSvgData.padY_top - dcaSvgData.padY_bottom)}
                          stroke="#ef4444"
                          strokeDasharray="3"
                          strokeWidth="1.2"
                          opacity="0.8"
                        />
                        <text
                          x={dcaSvgData.width - dcaSvgData.padX_right - 5}
                          y={dcaSvgData.height - dcaSvgData.padY_bottom - (abRate / dcaSvgData.maxVal) * (dcaSvgData.height - dcaSvgData.padY_top - dcaSvgData.padY_bottom) - 4}
                          fill="#f87171"
                          fontSize="7"
                          fontFamily="monospace"
                          textAnchor="end"
                        >
                          Cutoff: {abRate} bopd
                        </text>
                      </g>
                    )}

                    {/* SVG Gradient Areas */}
                    {dcaSvgData.forecastAreaPath && (
                      <path
                        d={dcaSvgData.forecastAreaPath}
                        fill="url(#area-gradient-fc)"
                        opacity="0.12"
                      />
                    )}

                    {/* Path 1: Matched Model Over History Period (Dashed emerald/green line) */}
                    {dcaSvgData.matchedLinePath && (
                      <path
                        d={dcaSvgData.matchedLinePath}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                      />
                    )}

                    {/* Path 2: Future Forecast Outlook (Solid glowing cyan line) */}
                    {dcaSvgData.forecastLinePath && (
                      <path
                        d={dcaSvgData.forecastLinePath}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2.5"
                      />
                    )}

                    {/* Path 3: Actual Production Trend (Thicker solid amber/orange line) */}
                    {dcaSvgData.actualLinePath && (
                      <path
                        d={dcaSvgData.actualLinePath}
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="3"
                      />
                    )}

                    {/* Render actual data node points (Orange circle with border) */}
                    {dcaSvgData.actualPoints.map((p, idx) => (
                      <g key={`act-${idx}`}>
                        <circle
                          cx={p.x}
                          cy={p.actualY}
                          r="3.5"
                          fill="#f97316"
                          stroke="#020617"
                          strokeWidth="1.2"
                        />
                        {/* Always display first and last rate labels */}
                        {(idx === 0 || idx === dcaSvgData.actualPoints.length - 1) && (
                          <text
                            x={p.x}
                            y={p.actualY - 9}
                            fill="#fdba74"
                            fontSize="8"
                            fontFamily="monospace"
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            {Math.round(p.actualRate!)}
                          </text>
                        )}
                      </g>
                    ))}

                    {/* Render future forecast nodes (Small cyan circles) */}
                    {dcaSvgData.forecastPoints.map((p, idx) => (
                      <g key={`fc-${idx}`}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="2.5"
                          fill="#06b6d4"
                          stroke="#020617"
                          strokeWidth="1"
                        />
                        {/* Display final prediction rate at the tail */}
                        {idx === dcaSvgData.forecastPoints.length - 1 && (
                          <text
                            x={p.x}
                            y={p.y - 10}
                            fill="#22d3ee"
                            fontSize="8"
                            fontFamily="monospace"
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            {Math.round(p.modelRate)}
                          </text>
                        )}
                      </g>
                    ))}

                    {/* X-Axis rule line */}
                    <line
                      x1={dcaSvgData.padX_left}
                      y1={dcaSvgData.height - dcaSvgData.padY_bottom}
                      x2={dcaSvgData.width - dcaSvgData.padX_right}
                      y2={dcaSvgData.height - dcaSvgData.padY_bottom}
                      stroke="#475569"
                      strokeWidth="1"
                    />

                     {/* X-Axis labels */}
                     {dcaSvgData.points.map((p, idx) => {
                       const totalCount = dcaSvgData.points.length;
                       const stepToShow = Math.max(2, Math.ceil(totalCount / 6));
                       if (idx === 0 || idx === totalCount - 1 || idx % stepToShow === 0) {
                         const rotateAngle = 20;
                         const labelY = dcaSvgData.height - dcaSvgData.padY_bottom + 14;
                         return (
                           <text
                             key={idx}
                             x={p.x}
                             y={labelY}
                             fill="#64748b"
                             fontSize="7.5"
                             fontFamily="monospace"
                             textAnchor="middle"
                             transform={`rotate(${rotateAngle}, ${p.x}, ${labelY})`}
                           >
                             {p.label}
                           </text>
                         );
                       }
                       return null;
                     })}

                    <defs>
                      <linearGradient id="area-gradient-fc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Legend container */}
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-1 text-[10px] font-mono border-t border-slate-900 pt-2 bg-slate-950/30 p-2.5 rounded">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-5 h-1.5 bg-[#f97316] rounded-sm inline-block"></span>
                    <span className="text-orange-400 font-bold">Thực tế (Actual Oil)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-5 h-0.5 border-t border-dashed border-[#10b981] inline-block"></span>
                    <span className="text-emerald-400">Khắp Arps (Matched Model)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-5 h-1.5 bg-[#06b6d4] rounded-sm inline-block"></span>
                    <span className="text-cyan-400 font-bold">Dự báo (Arps Forecast)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-5 h-0.5 border-t border-dashed border-[#ef4444] inline-block"></span>
                    <span className="text-red-400">Ngưỡng giới hạn (Cutoff)</span>
                  </div>
                </div>
              </div>

              {/* Economic stats resolved display */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-950 p-4 rounded-lg border border-slate-850">
                <div className="p-2.5 rounded bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono block font-semibold">
                    {language === 'en' ? 'Current Produced' : 'Sản Lượng Lũy Kế'}
                  </span>
                  <p className="text-sm font-bold text-slate-100 font-mono mt-1">
                    {dcaCalculations.reserves.historyReservesMbo.toLocaleString()} Mbo
                  </p>
                  <span className="text-[8px] text-orange-400 font-mono mt-0.5 block leading-tight">
                    {language === 'en' ? 'Cumulative active history' : 'Reserves hiện tại'}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
                  <span className="text-[9px] text-cyan-400 uppercase tracking-widest font-mono block font-semibold">
                    {language === 'en' ? `Forecast (${forecastDuration}M)` : `Dự Báo (${forecastDuration}T)`}
                  </span>
                  <p className="text-sm font-bold text-cyan-400 font-mono mt-1">
                    {dcaCalculations.reserves.forecastReservesMbo.toLocaleString()} Mbo
                  </p>
                  <span className="text-[8px] text-slate-500 font-mono mt-0.5 block leading-tight">
                    {language === 'en' ? 'In selected forecast period' : 'Sản lượng tới mốc forecast'}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
                  <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-mono block font-semibold">
                    {language === 'en' ? 'Remaining Reserves' : 'Trữ Lượng Còn Lại'}
                  </span>
                  <p className="text-sm font-bold text-emerald-400 font-mono mt-1">
                    {dcaCalculations.reserves.remainingReservesMbo.toLocaleString()} Mbo
                  </p>
                  <span className="text-[8px] text-slate-500 font-mono mt-0.5 block leading-tight">
                    {language === 'en' ? 'To economic cutoff rate' : 'Còn lại đến giới hạn khống'}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono block font-semibold">
                    {language === 'en' ? 'Years to Operate' : 'Thời Gian Còn Lại'}
                  </span>
                  <p className="text-sm font-bold text-slate-100 font-mono mt-1">
                    {dcaCalculations.reserves.yearsToAbandon} {language === 'en' ? 'Yrs' : 'Năm'}
                  </p>
                  <span className="text-[8px] text-slate-500 font-mono mt-0.5 block leading-tight">
                    {language === 'en' ? 'Until abandonment limit' : 'Thời gian đến giới hạn đóng mỏ'}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-900/50 border border-cyan-900/30 flex flex-col justify-between col-span-2 md:col-span-1">
                  <span className="text-[9px] text-[#00f2fe] uppercase tracking-widest font-mono block font-semibold">
                    {language === 'en' ? 'Ultimate EUR' : 'Trữ Lượng EUR'}
                  </span>
                  <p className="text-sm font-bold text-[#00f2fe] font-mono mt-1 text-cyan-400">
                    {dcaCalculations.reserves.eur.toLocaleString()} Mbo
                  </p>
                  <span className="text-[8px] text-slate-400 font-mono mt-0.5 block leading-tight">
                    {language === 'en' ? 'Ultimate Recovery (Cum+Rem)' : 'Tổng EUR ước tính'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: NODAL ANALYSIS */}
        {activeTab === 'NODAL' && (
          <div id="nodal-analysis-workspace" className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Settings & Calibration Panel (5cols) */}
              <div className="lg:col-span-12 xl:col-span-5 space-y-5">
                
                {/* 1. Inflow (IPR) Tool */}
                <div className="bg-[#050812] border border-slate-800/80 p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                    <h4 className="text-xs font-bold text-cyan-400 font-mono tracking-wider flex items-center gap-1.5 uppercase">
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></span>
                      1. Inflow (IPR) Calculator
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">Vogel / Darcy Model</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-mono">RESERVOIR PRESS. (PSI)</label>
                      <input
                        type="number"
                        min="500"
                        max="8000"
                        value={nodalPr}
                        onChange={(e) => setNodalPr(Math.max(100, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-950 border border-slate-800 px-2 py-1 rounded text-slate-200 font-mono focus:border-cyan-500 focus:outline-none text-[11px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-mono">BUBBLE POINT (PSI)</label>
                      <input
                        type="number"
                        min="100"
                        max="5000"
                        value={nodalPb}
                        onChange={(e) => setNodalPb(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-950 border border-slate-800 px-2 py-1 rounded text-slate-200 font-mono focus:border-cyan-500 focus:outline-none text-[11px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-400">PRODUCTIVITY INDEX PI:</span>
                      <span className="text-slate-200 font-bold">{nodalPi} bpd/psi</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="10"
                      step="0.05"
                      value={nodalPi}
                      onChange={(e) => setNodalPi(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                </div>

                {/* 2. Outflow (VLP) Tool */}
                <div className="bg-[#050812] border border-slate-800/80 p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                    <h4 className="text-xs font-bold text-rose-400 font-mono tracking-wider flex items-center gap-1.5 uppercase">
                      <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-ping"></span>
                      2. Outflow (VLP) Calculator
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">Tubing Gradient Model</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-mono">DEPTH OF ZONE (FT)</label>
                      <input
                        type="number"
                        min="2000"
                        max="15000"
                        value={nodalDepth}
                        onChange={(e) => setNodalDepth(Math.max(100, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-950 border border-slate-800 px-2 py-1 rounded text-slate-200 font-mono focus:border-cyan-500 focus:outline-none text-[11px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-mono">WELLHEAD PRESS (WHP)</label>
                      <input
                        type="number"
                        min="20"
                        max="1000"
                        value={nodalWhp}
                        onChange={(e) => setNodalWhp(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-950 border border-slate-800 px-2 py-1 rounded text-slate-200 font-mono focus:border-cyan-500 focus:outline-none text-[11px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-mono">TUBING SIZE ID (IN)</label>
                      <select
                        value={nodalTubingID}
                        onChange={(e) => setNodalTubingID(parseFloat(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 px-2 py-1 rounded text-slate-200 font-mono focus:border-cyan-500 focus:outline-none text-[11px] h-[30px]"
                      >
                        <option value={1.995}>2.0&quot; (1.995&quot; ID)</option>
                        <option value={2.441}>2.5&quot; (2.441&quot; ID)</option>
                        <option value={2.992}>3.0&quot; (2.992&quot; ID)</option>
                        <option value={3.476}>3.5&quot; (3.476&quot; ID)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-mono">WATER CUT (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={nodalWaterCut}
                        onChange={(e) => setNodalWaterCut(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                        className="w-full bg-slate-950 border border-slate-800 px-2 py-1 rounded text-slate-200 font-mono focus:border-cyan-500 focus:outline-none text-[11px]"
                      />
                    </div>
                  </div>

                  {/* Lift Mechanism specific settings */}
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-900 mt-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-mono">ACTIVE ARTIFICIAL LIFT:</span>
                      <span className="text-[10px] bg-cyan-950/80 text-cyan-400 font-bold font-mono px-1.5 py-0.5 rounded border border-cyan-800/40">{selectedWell.liftType}</span>
                    </div>

                    {selectedWell.liftType === 'ESP' && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-400">ESP MOTOR FREQUENCY:</span>
                          <span className="text-cyan-400 font-bold">{nodalEspHz} Hz</span>
                        </div>
                        <input
                          type="range"
                          min="30"
                          max="70"
                          step="1"
                          value={nodalEspHz}
                          onChange={(e) => setNodalEspHz(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
                        />
                      </div>
                    )}

                    {selectedWell.liftType === 'Gas Lift' && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-400">GAS LIFT INJECTION RATE:</span>
                          <span className="text-rose-400 font-bold">{nodalGasLift} MMscf/D</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="4"
                          step="0.1"
                          value={nodalGasLift}
                          onChange={(e) => setNodalGasLift(parseFloat(e.target.value))}
                          className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-rose-500"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-400">SURFACE CHOKE VALVE DESIGN:</span>
                        <span className="text-slate-200 font-bold">{nodalChoke}/64&quot; Choke</span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="64"
                        step="1"
                        value={nodalChoke}
                        onChange={(e) => setNodalChoke(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Matching & Calibration Sensitivity Tuner */}
                <div className="bg-[#050812] border border-orange-500/10 p-4 rounded-lg space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-orange-500/15 pb-1.5">
                    <h4 className="text-xs font-bold text-orange-400 font-mono tracking-wider flex items-center gap-1.5 uppercase">
                      <Settings className="w-3.5 h-3.5 text-orange-400" />
                      3. SCADA Calibration Matcher
                    </h4>
                    <span className="text-[9px] bg-orange-950/60 text-orange-400 border border-orange-900/50 px-1 rounded font-mono font-bold uppercase font-sans">Calibration Toolkit</span>
                  </div>

                  <div className="bg-slate-950 px-2.5 py-1.5 rounded border border-orange-950/40 text-[10px] font-mono text-slate-300">
                    <div className="grid grid-cols-2 gap-y-1">
                      <div>SCADA Liquid rate Actual:</div>
                      <div className="text-right text-orange-400 font-bold">{nodalSvgCoordinates.actualQ} bpd</div>
                      <div>SCADA BHP (Pwf) Actual:</div>
                      <div className="text-right text-orange-400 font-bold">{nodalSvgCoordinates.actualPwf} psi</div>
                    </div>
                  </div>

                  {/* Sensitivity Manual Sliders */}
                  <div className="space-y-2 pt-1 text-[10px] font-mono">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Inflow Scale Matcher (β-IPR):</span>
                        <span className="text-cyan-400 font-bold">{iprMatchFactor}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="3.0"
                        step="0.05"
                        value={iprMatchFactor}
                        onChange={(e) => {
                          setIprMatchFactor(parseFloat(e.target.value));
                          setMatchStatus('idle');
                        }}
                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Outflow Loss Scale Matcher (α-VLP):</span>
                        <span className="text-rose-400 font-bold">{vlpMatchFactor}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="3.0"
                        step="0.05"
                        value={vlpMatchFactor}
                        onChange={(e) => {
                          setVlpMatchFactor(parseFloat(e.target.value));
                          setMatchStatus('idle');
                        }}
                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-rose-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={handleAutoMatch}
                      className="bg-orange-600 hover:bg-orange-500 text-slate-100 text-[10px] font-bold font-mono py-1.5 px-3 rounded text-center transition-all cursor-pointer border border-orange-500 shadow-sm"
                    >
                      Auto-Calibrate To Actuals
                    </button>
                    <button
                      onClick={() => {
                        setIprMatchFactor(1.0);
                        setVlpMatchFactor(1.0);
                        setMatchStatus('idle');
                        setMatchMessage('');
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-slate-400 text-[10px] font-mono py-1.5 px-3 rounded transition-all cursor-pointer border border-slate-800 text-center"
                    >
                      Reset Tuners
                    </button>
                  </div>

                  {matchStatus === 'success' && (
                    <div className="bg-emerald-950/80 border border-emerald-500/20 px-2.5 py-1.5 rounded text-[10px] text-emerald-300 font-mono leading-relaxed mt-1">
                      {matchMessage}
                    </div>
                  )}
                </div>

              </div>
              
              {/* Right Coordinate Display & SVG Nodal Plot (7cols) */}
              <div className="lg:col-span-12 xl:col-span-7 flex flex-col justify-between space-y-4">
                
                {/* Visualizer header */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-xs font-semibold tracking-wider text-slate-400 font-mono uppercase">System Nodal Analysis Diagram</h3>
                    <span className="text-[10px] text-slate-500 font-mono">Matched to Measured SCADA Limits</span>
                  </div>

                  {/* SVG Plot box */}
                  <div className="bg-[#050812] p-4 rounded-lg border border-slate-850 relative">
                    
                    <svg
                      width="100%"
                      height={nodalSvgCoordinates.height}
                      viewBox={`0 0 ${nodalSvgCoordinates.width} ${nodalSvgCoordinates.height}`}
                      className="overflow-visible"
                    >
                      {/* Gridlines */}
                      {nodalSvgCoordinates.qLabels.map((q, i) => (
                        <g key={`q-grid-${i}`}>
                          <line
                            x1={q.x}
                            y1={nodalSvgCoordinates.padding}
                            x2={q.x}
                            y2={nodalSvgCoordinates.height - nodalSvgCoordinates.padding}
                            stroke="#1e293b"
                            strokeWidth="0.5"
                            strokeDasharray="2"
                          />
                          <text
                            x={q.x}
                            y={nodalSvgCoordinates.height - nodalSvgCoordinates.padding + 14}
                            fill="#64748b"
                            fontSize="9"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {q.val}
                          </text>
                        </g>
                      ))}

                      {nodalSvgCoordinates.pLabels.map((p, i) => (
                        <g key={`p-grid-${i}`}>
                          <line
                            x1={nodalSvgCoordinates.padding}
                            y1={p.y}
                            x2={nodalSvgCoordinates.width - nodalSvgCoordinates.padding}
                            y2={p.y}
                            stroke="#1e293b"
                            strokeWidth="0.5"
                            strokeDasharray="2"
                          />
                          <text
                            x={nodalSvgCoordinates.padding - 8}
                            y={p.y + 3}
                            fill="#64748b"
                            fontSize="9"
                            fontFamily="monospace"
                            textAnchor="end"
                          >
                            {p.val}
                          </text>
                        </g>
                      ))}

                      {/* Axis Borders */}
                      <line
                        x1={nodalSvgCoordinates.padding}
                        y1={nodalSvgCoordinates.height - nodalSvgCoordinates.padding}
                        x2={nodalSvgCoordinates.width - nodalSvgCoordinates.padding}
                        y2={nodalSvgCoordinates.height - nodalSvgCoordinates.padding}
                        stroke="#475569"
                        strokeWidth="1.2"
                      />
                      <line
                        x1={nodalSvgCoordinates.padding}
                        y1={nodalSvgCoordinates.padding}
                        x2={nodalSvgCoordinates.padding}
                        y2={nodalSvgCoordinates.height - nodalSvgCoordinates.padding}
                        stroke="#475569"
                        strokeWidth="1.2"
                      />

                      {/* Title Labels */}
                      <text
                        x={nodalSvgCoordinates.width / 2}
                        y={nodalSvgCoordinates.height - 4}
                        fill="#94a3b8"
                        fontSize="9"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        Liquid Production Flow Rate Q (STB/D)
                      </text>
                      
                      <text
                        x="10"
                        y={nodalSvgCoordinates.height / 2}
                        fill="#94a3b8"
                        fontSize="9"
                        fontFamily="monospace"
                        textAnchor="middle"
                        transform={`rotate(-90 10 ${nodalSvgCoordinates.height / 2})`}
                      >
                        Bottom Hole Pressure Pwf (PSI)
                      </text>

                      {/* Curves - IPR Inflow */}
                      <path
                        d={nodalSvgCoordinates.iprPath}
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="2.2"
                      />

                      {/* Curves - VLP Outflow */}
                      <path
                        d={nodalSvgCoordinates.vlpPath}
                        fill="none"
                        stroke="#f87171"
                        strokeWidth="2.2"
                      />

                      {/* Operating Point solved Indicator */}
                      {nodalSvgCoordinates.opPoint && (
                        <g>
                          <circle
                            cx={nodalSvgCoordinates.opPoint.x}
                            cy={nodalSvgCoordinates.opPoint.y}
                            r="5"
                            fill="#10b981"
                            stroke="#0b1120"
                            strokeWidth="1.5"
                          />
                          <line
                            x1={nodalSvgCoordinates.opPoint.x}
                            y1={nodalSvgCoordinates.opPoint.y}
                            x2={nodalSvgCoordinates.opPoint.x}
                            y2={nodalSvgCoordinates.height - nodalSvgCoordinates.padding}
                            stroke="#10b981"
                            strokeWidth="0.8"
                            strokeDasharray="3"
                          />
                          <line
                            x1={nodalSvgCoordinates.padding}
                            y1={nodalSvgCoordinates.opPoint.y}
                            x2={nodalSvgCoordinates.opPoint.x}
                            y2={nodalSvgCoordinates.opPoint.y}
                            stroke="#10b981"
                            strokeWidth="0.8"
                            strokeDasharray="3"
                          />
                        </g>
                      )}

                      {/* SCADA Measure Point indicator */}
                      <g>
                        <circle
                          cx={nodalSvgCoordinates.actualPoint.x}
                          cy={nodalSvgCoordinates.actualPoint.y}
                          r="6"
                          fill="#f97316"
                          stroke="#0b1120"
                          strokeWidth="1.5"
                          className="animate-pulse"
                        />
                        <line
                          x1={nodalSvgCoordinates.actualPoint.x}
                          y1={nodalSvgCoordinates.actualPoint.y}
                          x2={nodalSvgCoordinates.actualPoint.x}
                          y2={nodalSvgCoordinates.height - nodalSvgCoordinates.padding}
                          stroke="#f97316"
                          strokeWidth="0.8"
                          strokeDasharray="2"
                        />
                        <line
                          x1={nodalSvgCoordinates.padding}
                          y1={nodalSvgCoordinates.actualPoint.y}
                          x2={nodalSvgCoordinates.actualPoint.x}
                          y2={nodalSvgCoordinates.actualPoint.y}
                          stroke="#f97316"
                          strokeWidth="0.8"
                          strokeDasharray="2"
                        />
                      </g>

                    </svg>

                    {!nodalOperatingPoint && (
                      <div className="absolute inset-0 bg-slate-950/80 flex flex-col justify-center items-center p-4 rounded-lg">
                        <Activity className="w-10 h-10 text-rose-500 mb-2 animate-bounce animate-pulse" />
                        <p className="text-xs font-bold text-rose-300 font-mono uppercase">Unresolved Nodal Balance</p>
                        <p className="text-[10px] text-slate-400 text-center leading-relaxed mt-1 max-w-sm">
                          Hydrostatic or well friction pressure overrides formation potential. Check tubing values or adjust reservoir parameters to achieve flow state intersection.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Legends */}
                  <div className="flex flex-wrap items-center justify-center gap-[#8px] mt-1 text-[10px] font-mono border-t border-slate-900 pt-2 bg-slate-950/30 p-2 text-slate-400">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-4 h-1.5 bg-[#22d3ee] rounded-sm inline-block"></span>
                      <span className="text-cyan-400">IPR Inflow Curve (Formation)</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-4 h-1.5 bg-[#f87171] rounded-sm inline-block"></span>
                      <span className="text-rose-400">VLP Outflow Curve (Tubing Lift)</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-4 h-4 rounded-full bg-[#10b981] border border-slate-900 inline-block"></span>
                      <span className="text-emerald-400 font-bold">Solved System Point</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-4 h-4 rounded-full bg-[#f97316] border border-slate-900 inline-block animate-pulse"></span>
                      <span className="text-orange-400 font-bold">SCADA Real Measurement</span>
                    </div>
                  </div>

                </div>

                {/* Comparative breakdown stats box */}
                <div className="grid grid-cols-2 md:grid-cols-2 gap-3 bg-slate-950 p-4.5 rounded-lg border border-slate-850">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Solved Operating State</span>
                    <p className="text-[13px] font-bold text-emerald-400 font-mono leading-tight">
                      {nodalOperatingPoint ? (
                        <>
                          Rate: {nodalOperatingPoint.q} bpd<br />
                          BHP: {nodalOperatingPoint.pwf} psi
                        </>
                      ) : (
                        <span className="text-rose-400">SHUT-IN occurred</span>
                      )}
                    </p>
                  </div>
                  <div className="space-y-1 border-l border-slate-850 pl-3">
                    <span className="text-[10px] text-orange-400 font-mono uppercase font-bold">SCADA Real-world Limits</span>
                    <p className="text-[13px] font-bold text-orange-500 font-mono leading-tight">
                      Rate: {nodalSvgCoordinates.actualQ} bpd<br />
                      BHP: {nodalSvgCoordinates.actualPwf} psi
                    </p>
                  </div>
                </div>

                <button
                  id="nodal-commit-action-btn"
                  onClick={recordNodalAudit}
                  className="w-full bg-rose-600 hover:bg-rose-500 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] text-slate-950 text-xs font-mono font-bold py-2.5 rounded-lg border border-rose-450/20 transition-all cursor-pointer shadow-lg active:scale-95 text-center"
                >
                  Commit Nodal Calibration Log
                </button>

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
                id="skin-solve-action-btn"
                onClick={recordSkinAudit}
                className="w-full bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] text-slate-100 text-xs font-mono font-bold py-2.5 rounded-lg border border-indigo-500/20 transition-all cursor-pointer shadow-lg active:scale-95 text-center"
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
                id="econ-perform-action-btn"
                onClick={recordEconAudit}
                className="w-full bg-emerald-600 hover:bg-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] text-slate-950 text-xs font-mono font-bold py-2.5 rounded-lg border border-emerald-500/20 transition-all cursor-pointer shadow-lg active:scale-95 text-center"
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
