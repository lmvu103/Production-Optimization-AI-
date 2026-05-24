import { Well } from './oilfieldData';

/**
 * Arps Decline Curve Equations
 */
export function forecastDecline(
  q0: number, // Initial rate (bopd or bpdf)
  declineRateAnnual: number, // % annual nominal decline (e.g. 0.15 for 15%)
  type: 'EXPONENTIAL' | 'HARMONIC' | 'HYPERBOLIC',
  bParameter: number = 0.5, // hyperbolic exponent (0 < b < 1)
  months: number = 12
): number[] {
  const d_nominal = declineRateAnnual; // annual
  const d_monthly = d_nominal / 12; // monthly base nominal decline
  const forecast: number[] = [];

  for (let t = 1; t <= months; t++) {
    let qt = 0;
    if (type === 'EXPONENTIAL') {
      qt = q0 * Math.exp(-d_monthly * t);
    } else if (type === 'HARMONIC') {
      qt = q0 / (1 + d_monthly * t);
    } else {
      // Hyperbolic
      const b = Math.max(0.01, Math.min(0.99, bParameter));
      qt = q0 / Math.pow(1 + b * d_monthly * t, 1 / b);
    }
    forecast.push(Math.round(Math.max(0, qt)));
  }

  return forecast;
}

/**
 * Calculates Estimated Ultimate Recovery (EUR) and remaining reserves
 */
export function estimateReserves(
  currentRate: number,
  abandonmentRate: number,
  declineRateAnnual: number,
  type: 'EXPONENTIAL' | 'HARMONIC' | 'HYPERBOLIC',
  bParameter: number = 0.5
): { eur: number; remainingReservesMbo: number; yearsToAbandon: number } {
  const d_nominal = declineRateAnnual; // annual nominal
  if (d_nominal <= 0 || currentRate <= abandonmentRate) {
    return { eur: 0, remainingReservesMbo: 0, yearsToAbandon: 0 };
  }

  let cumulativeProductionMb = 0;
  let yearsToAbandon = 0;

  if (type === 'EXPONENTIAL') {
    // Np = (q0 - q) / D
    const npBarrels = (currentRate - abandonmentRate) * 365 / d_nominal;
    cumulativeProductionMb = npBarrels / 1000;
    yearsToAbandon = Math.log(currentRate / abandonmentRate) / d_nominal;
  } else if (type === 'HARMONIC') {
    // Np = (q0 / D) * ln(q0 / q)
    const npBarrels = (currentRate * 365 / d_nominal) * Math.log(currentRate / abandonmentRate);
    cumulativeProductionMb = npBarrels / 1000;
    yearsToAbandon = ((currentRate / abandonmentRate) - 1) / d_nominal;
  } else {
    // Hyperbolic
    const b = Math.max(0.01, Math.min(0.99, bParameter));
    // Np = (q0^b / (D * (1-b))) * (q0^(1-b) - q^(1-b))
    const npBarrels = (Math.pow(currentRate, b) * 365 / (d_nominal * (1 - b))) * 
                      (Math.pow(currentRate, 1 - b) - Math.pow(abandonmentRate, 1 - b));
    cumulativeProductionMb = npBarrels / 1000;
    yearsToAbandon = (Math.pow(currentRate / abandonmentRate, b) - 1) / (b * d_nominal);
  }

  return {
    eur: Math.round(cumulativeProductionMb),
    remainingReservesMbo: Math.round(cumulativeProductionMb),
    yearsToAbandon: parseFloat(yearsToAbandon.toFixed(1))
  };
}

/**
 * Multi-phase Inflow Performance Relationship (IPR) Curve Generator
 * Vogel Corrected for multiphase flow below bubble point
 */
export function getIPRCurve(well: Well, steps: number = 20): { q: number; pwf: number }[] {
  const pr = well.reservoirPressure;
  const pb = well.bubblePointPressure;
  const pi = well.productivityIndex;
  
  const curve: { q: number; pwf: number }[] = [];
  
  // Maximum theoretical liquid rate (drawdown = 0 to reservoir pressure)
  // q_max = J * Pr / (1 + 0.2*(Pb/Pr) + 0.8*(Pb/Pr)^2) or similar
  const qMaxStraight = pi * pr;
  
  for (let i = 0; i <= steps; i++) {
    const pwf = Math.round((pr * (steps - i)) / steps);
    let q = 0;
    
    if (pwf >= pb) {
      // Single-phase Darcy (straight-line IPR)
      q = pi * (pr - pwf);
    } else {
      // Multiphase Vogel equation
      // If reservoir pressure is above bubble point:
      if (pr > pb) {
        const q_pb = pi * (pr - pb);
        const j_vogel = pi; // J-derivative
        // Vogel's fraction below bubble-point
        const drawdownFraction = pwf / pb;
        const vogelReduction = 1 - 0.2 * drawdownFraction - 0.8 * Math.pow(drawdownFraction, 2);
        // Max rate below Bubble Point
        const q_below_pb_max = (j_vogel * pb) / 1.8;
        q = q_pb + q_below_pb_max * vogelReduction;
      } else {
        // Reservoir already saturated (Pr < Pb)
        const drawdownFraction = pwf / pr;
        const vogelReduction = 1 - 0.2 * drawdownFraction - 0.8 * Math.pow(drawdownFraction, 2);
        const qMaxVogel = (pi * pr) / 1.8;
        q = qMaxVogel * vogelReduction;
      }
    }
    
    curve.push({ q: Math.round(Math.max(0, q)), pwf });
  }
  
  return curve;
}

/**
 * Vertical Lift Performance (VLP) Curve Generator
 * Tailored simplified physical multi-phase model accounting for GL Injection, ESP frequency, Choke restricts
 */
export function getVLPCurve(
  well: Well, 
  customGasLift?: number, 
  customEspHz?: number, 
  customChoke?: number,
  steps: number = 20
): { q: number; pwf: number }[] {
  // Config variables
  const gl = customGasLift !== undefined ? customGasLift : (well.gasLiftInjectionRate || 0);
  const hz = customEspHz !== undefined ? customEspHz : (well.espHz || 0);
  const choke = customChoke !== undefined ? customChoke : (well.chokeSize || 64);
  const whp = well.wellheadPressure;
  const depth = well.reservoirDepth;
  const waterCut = well.waterCut;
  
  const curve: { q: number; pwf: number }[] = [];
  
  // Density of water is ~0.433 psi/ft, oil ~0.34 psi/ft
  const baseWaterDensityGradient = 0.435; // psi/ft
  const baseOilDensityGradient = 0.35; // psi/ft
  const averageLiquidGradient = (waterCut / 100) * baseWaterDensityGradient + (1 - waterCut / 100) * baseOilDensityGradient;
  
  // Calculate gas lift density reduction factor
  // More gas lift injection = less liquid density, but there is a friction penalty at high flows
  const gasRatioFactor = gl > 0 ? Math.min(0.35, 0.12 * gl) : 0;
  const effectiveGradient = averageLiquidGradient * (1 - gasRatioFactor);
  
  // Calculate Choke backpressure effect
  // Choke is in 64ths. 64 = wide open. Lower values throttle, creating severe tubing backpressure
  const chokeFactor = Math.pow(64 / Math.max(12, choke), 1.8);
  const extraChokeBackpressure = choke < 64 ? 50 * chokeFactor : 0;
  
  // ESP adds dynamic lifting head (adds energy, effectively lowering bottomhole pressure required for flow)
  // Pwf = WHP + Hydrostatic + Friction - ESP_Head
  // At Hz = 0, ESP restriction increases friction. Hz = 55-60 boosts pressure.
  const espHead = hz > 0 ? (Math.pow(hz / 60, 2) * 1200) : 0;

  for (let qStep = 1; qStep <= steps; qStep++) {
    // Generate flow rates from 50 to 4000 bpd
    const q = (4000 * qStep) / steps;
    
    // Hydrostatic head (psi)
    const hydrostaticP = depth * effectiveGradient;
    
    // Friction loss (psi) - increases exponentially with flow rate q
    // Friction is higher in smaller tubing strings
    const tubingSizeFactor = Math.pow(2.875 / well.tubingID, 4.5);
    const frictionFactor = 0.00003 * tubingSizeFactor;
    const frictionP = q * q * frictionFactor;
    
    // Net bottomhole pressure for outflow
    let pwfOut = whp + hydrostaticP + frictionP + extraChokeBackpressure - espHead;
    
    // Pressure constraints (cannot drop below wellhead backpressure)
    pwfOut = Math.round(Math.max(whp, pwfOut));
    
    curve.push({ q: Math.round(q), pwf: pwfOut });
  }
  
  return curve;
}

/**
 * Solves for the intersection point of IPR and VLP (The Operating Point)
 */
export function solveOperatingPoint(
  ipr: { q: number; pwf: number }[],
  vlp: { q: number; pwf: number }[]
): { q: number; pwf: number } | null {
  // Find operating point where IPR and VLP curves intersect
  // Since both lists are discrete, find closest q where Pwf(IPR) - Pwf(VLP) changes sign
  let minDiff = Infinity;
  let operatingPoint: { q: number; pwf: number } | null = null;
  
  for (const iprPt of ipr) {
    // find closest VLP point in flow rate
    const vlpPt = vlp.reduce((prev, curr) => Math.abs(curr.q - iprPt.q) < Math.abs(prev.q - iprPt.q) ? curr : prev);
    
    const diff = Math.abs(iprPt.pwf - vlpPt.pwf);
    if (diff < minDiff && iprPt.pwf >= vlpPt.pwf) { 
      minDiff = diff;
      operatingPoint = { q: iprPt.q, pwf: Math.round((iprPt.pwf + vlpPt.pwf) / 2) };
    }
  }
  
  // If no intersection, well cannot flow naturally/with lift
  return operatingPoint;
}

/**
 * Economic evaluation panel
 */
export interface EconStats {
  incrementalOilTotalBarrels: number;
  grossRevenueUsd: number;
  netRevenueUsd: number;
  capexUsd: number;
  opexUsd: number;
  npvUsd: number;
  roiPercent: number;
  paybackMonths: number;
}

export function calculateEconBenefit(
  incrementalOilBopd: number,
  workoverCapex: number,
  oilPrice: number = 75,
  treatmentLongevityMonths: number = 12,
  inflationRateAnnual: number = 0.05
): EconStats {
  const incrementalOilTotalBarrels = incrementalOilBopd * 30.4 * treatmentLongevityMonths;
  const grossRevenueUsd = incrementalOilTotalBarrels * oilPrice;
  
  // Deduct 12.5% royalties and 8% production tax
  const taxAndRoyaltyRate = 0.205;
  const netRevenueUsd = grossRevenueUsd * (1 - taxAndRoyaltyRate);
  
  // OPEX overhead (handling extra fluid / chemicals / water disposal)
  const opexPerBblLiquid = 8; // $8 / bbl liquid average
  const estimatedOpexUsd = incrementalOilTotalBarrels * 1.5 * opexPerBblLiquid; 
  
  // Discount cash flows to present value (monthly rate equivalent of 10% discount rate)
  const discountRateMonthly = 0.10 / 12;
  let npvUsd = -workoverCapex;
  
  let accumulatedCashFlow = -workoverCapex;
  let paybackMonths = 99;
  
  for (let m = 1; m <= treatmentLongevityMonths; m++) {
    const monthlyBarrels = incrementalOilBopd * 30.4;
    const monthlyGross = monthlyBarrels * oilPrice;
    const monthlyNet = monthlyGross * (1 - taxAndRoyaltyRate) - (monthlyBarrels * 1.5 * opexPerBblLiquid);
    
    // Discounting
    const discountedMonthlyCashflow = monthlyNet / Math.pow(1 + discountRateMonthly, m);
    npvUsd += discountedMonthlyCashflow;
    
    accumulatedCashFlow += monthlyNet;
    if (accumulatedCashFlow >= 0 && paybackMonths === 99) {
      paybackMonths = m;
    }
  }
  
  const roiPercent = workoverCapex > 0 ? (npvUsd / workoverCapex) * 100 : 0;
  
  return {
    incrementalOilTotalBarrels: Math.round(incrementalOilTotalBarrels),
    grossRevenueUsd: Math.round(grossRevenueUsd),
    netRevenueUsd: Math.round(netRevenueUsd),
    capexUsd: workoverCapex,
    opexUsd: Math.round(estimatedOpexUsd),
    npvUsd: Math.round(npvUsd),
    roiPercent: parseFloat(roiPercent.toFixed(1)),
    paybackMonths: paybackMonths === 99 ? treatmentLongevityMonths : paybackMonths
  };
}
