export interface Well {
  id: string;
  name: string;
  status: 'OPTIMAL' | 'UNDERPERFORMER' | 'DOWN' | 'CRITICAL';
  liftType: 'ESP' | 'Gas Lift' | 'Natural Flow' | 'Plunger Lift';
  measuredDepth: number; // ft
  reservoirPressure: number; // psi
  wellheadPressure: number; // psi
  reservoirDepth: number; // ft
  tubingID: number; // inches
  
  // Production metrics
  liquidRate: number; // bpd
  oilRate: number; // bopd
  waterCut: number; // %
  gor: number; // scf/stb
  productivityIndex: number; // bpd/psi
  skinFactor: number;
  bubblePointPressure: number; // psi
  
  // Lift specific variables
  espHz?: number;
  gasLiftInjectionRate?: number; // MMscf/d
  chokeSize?: number; // 64ths of an inch

  // 12-month production history
  history: {
    month: string;
    oilRate: number;
    waterCut: number;
    bottomHolePressure: number;
  }[];

  // Specific issues
  activeAlerts: string[];
  diagnosticComments: string;
}

export interface SPEPaper {
  id: string;
  code: string;
  title: string;
  authors: string;
  year: number;
  summary: string;
  category: 'Gas Lift' | 'ESP' | 'Reservoir Management' | 'Flow Assurance' | 'Well Intervention' | 'EOR';
  guidelines: string[];
}

export const WELLS_DATA: Well[] = [
  {
    id: 'well-01',
    name: 'PROD-01 (ESP)',
    status: 'OPTIMAL',
    liftType: 'ESP',
    measuredDepth: 9400,
    reservoirPressure: 3200,
    wellheadPressure: 180,
    reservoirDepth: 9200,
    tubingID: 2.875,
    liquidRate: 2800,
    oilRate: 700,
    waterCut: 75,
    gor: 320,
    productivityIndex: 3.8,
    skinFactor: 1.2,
    bubblePointPressure: 1100,
    espHz: 55,
    chokeSize: 48,
    history: [
      { month: 'Jun 25', oilRate: 850, waterCut: 68, bottomHolePressure: 2420 },
      { month: 'Jul 25', oilRate: 820, waterCut: 69, bottomHolePressure: 2430 },
      { month: 'Aug 25', oilRate: 800, waterCut: 70, bottomHolePressure: 2440 },
      { month: 'Sep 25', oilRate: 780, waterCut: 71, bottomHolePressure: 2450 },
      { month: 'Oct 25', oilRate: 760, waterCut: 72, bottomHolePressure: 2460 },
      { month: 'Nov 25', oilRate: 750, waterCut: 73, bottomHolePressure: 2460 },
      { month: 'Dec 25', oilRate: 730, waterCut: 74, bottomHolePressure: 2470 },
      { month: 'Jan 26', oilRate: 720, waterCut: 74, bottomHolePressure: 2470 },
      { month: 'Feb 26', oilRate: 710, waterCut: 75, bottomHolePressure: 2480 },
      { month: 'Mar 26', oilRate: 705, waterCut: 75, bottomHolePressure: 2480 },
      { month: 'Apr 26', oilRate: 700, waterCut: 75, bottomHolePressure: 2485 },
      { month: 'May 26', oilRate: 700, waterCut: 75, bottomHolePressure: 2485 },
    ],
    activeAlerts: [],
    diagnosticComments: 'ESP operating in stable zone (55Hz). Motor temperature stable at 185°F. Vibration metrics optimal. High water cut is aquifer driven.'
  },
  {
    id: 'well-02',
    name: 'PROD-02 (Gas Lift)',
    status: 'UNDERPERFORMER',
    liftType: 'Gas Lift',
    measuredDepth: 10200,
    reservoirPressure: 2900,
    wellheadPressure: 120,
    reservoirDepth: 10000,
    tubingID: 3.5,
    liquidRate: 1900,
    oilRate: 380,
    waterCut: 80,
    gor: 450,
    productivityIndex: 2.2,
    skinFactor: 2.5,
    bubblePointPressure: 1400,
    gasLiftInjectionRate: 1.2,
    chokeSize: 40,
    history: [
      { month: 'Jun 25', oilRate: 980, waterCut: 42, bottomHolePressure: 1980 },
      { month: 'Jul 25', oilRate: 920, waterCut: 45, bottomHolePressure: 1995 },
      { month: 'Aug 25', oilRate: 850, waterCut: 50, bottomHolePressure: 2010 },
      { month: 'Sep 25', oilRate: 720, waterCut: 58, bottomHolePressure: 2030 },
      { month: 'Oct 25', oilRate: 650, waterCut: 64, bottomHolePressure: 2045 },
      { month: 'Nov 25', oilRate: 590, waterCut: 69, bottomHolePressure: 2060 },
      { month: 'Dec 25', oilRate: 510, waterCut: 73, bottomHolePressure: 2075 },
      { month: 'Jan 26', oilRate: 460, waterCut: 76, bottomHolePressure: 2090 },
      { month: 'Feb 26', oilRate: 420, waterCut: 78, bottomHolePressure: 2110 },
      { month: 'Mar 26', oilRate: 400, waterCut: 79, bottomHolePressure: 2120 },
      { month: 'Apr 26', oilRate: 385, waterCut: 80, bottomHolePressure: 2130 },
      { month: 'May 26', oilRate: 380, waterCut: 80, bottomHolePressure: 2135 },
    ],
    activeAlerts: ['High Water Cut Alarm', 'Sub-optimal GL Injection Allocation'],
    diagnosticComments: 'Recent water breakthrough has heavily slugged production. Nodal analysis shows high lifting gradient due to low GL injection efficiency.'
  },
  {
    id: 'well-03',
    name: 'PROD-03 (Skin Damage)',
    status: 'CRITICAL',
    liftType: 'Natural Flow',
    measuredDepth: 8800,
    reservoirPressure: 3400,
    wellheadPressure: 320,
    reservoirDepth: 8600,
    tubingID: 2.875,
    liquidRate: 600,
    oilRate: 570,
    waterCut: 5,
    gor: 550,
    productivityIndex: 0.9,
    skinFactor: 14.8,
    bubblePointPressure: 1600,
    chokeSize: 24,
    history: [
      { month: 'Jun 25', oilRate: 1200, waterCut: 4, bottomHolePressure: 2600 },
      { month: 'Jul 25', oilRate: 1150, waterCut: 4, bottomHolePressure: 2630 },
      { month: 'Aug 25', oilRate: 1100, waterCut: 4, bottomHolePressure: 2660 },
      { month: 'Sep 25', oilRate: 1020, waterCut: 4, bottomHolePressure: 2700 },
      { month: 'Oct 25', oilRate: 950, waterCut: 4, bottomHolePressure: 2750 },
      { month: 'Nov 25', oilRate: 880, waterCut: 5, bottomHolePressure: 2800 },
      { month: 'Dec 25', oilRate: 800, waterCut: 5, bottomHolePressure: 2850 },
      { month: 'Jan 26', oilRate: 740, waterCut: 5, bottomHolePressure: 2900 },
      { month: 'Feb 26', oilRate: 690, waterCut: 5, bottomHolePressure: 2950 },
      { month: 'Mar 26', oilRate: 640, waterCut: 5, bottomHolePressure: 3000 },
      { month: 'Apr 26', oilRate: 600, waterCut: 5, bottomHolePressure: 3050 },
      { month: 'May 26', oilRate: 570, waterCut: 5, bottomHolePressure: 3100 },
    ],
    activeAlerts: ['Skin Factor Damage (Skin > 10)', 'Severe Productivity Decline'],
    diagnosticComments: 'PI has decreased from 2.5 to 0.9. High head loss across wellbore interface suggests sand pack plugging or mud cake baking. Primed candidate for a matrix acid wash or reperforation.'
  },
  {
    id: 'well-04',
    name: 'PROD-04 (Liquid Loaded)',
    status: 'DOWN',
    liftType: 'Natural Flow',
    measuredDepth: 11200,
    reservoirPressure: 2400,
    wellheadPressure: 45,
    reservoirDepth: 11000,
    tubingID: 2.375,
    liquidRate: 80,
    oilRate: 40,
    waterCut: 50,
    gor: 1200,
    productivityIndex: 0.5,
    skinFactor: 3.2,
    bubblePointPressure: 1800,
    chokeSize: 16,
    history: [
      { month: 'Jun 25', oilRate: 410, waterCut: 15, bottomHolePressure: 2000 },
      { month: 'Jul 25', oilRate: 380, waterCut: 18, bottomHolePressure: 2030 },
      { month: 'Aug 25', oilRate: 350, waterCut: 22, bottomHolePressure: 2060 },
      { month: 'Sep 25', oilRate: 310, waterCut: 28, bottomHolePressure: 2100 },
      { month: 'Oct 25', oilRate: 260, waterCut: 35, bottomHolePressure: 2150 },
      { month: 'Nov 25', oilRate: 190, waterCut: 40, bottomHolePressure: 2200 },
      { month: 'Dec 25', oilRate: 120, waterCut: 45, bottomHolePressure: 2250 },
      { month: 'Jan 26', oilRate: 80, waterCut: 48, bottomHolePressure: 2310 },
      { month: 'Feb 26', oilRate: 48, waterCut: 50, bottomHolePressure: 2350 },
      { month: 'Mar 26', oilRate: 40, waterCut: 50, bottomHolePressure: 2380 },
      { month: 'Apr 26', oilRate: 0, waterCut: 0, bottomHolePressure: 2400 },
      { month: 'May 26', oilRate: 0, waterCut: 0, bottomHolePressure: 2400 },
    ],
    activeAlerts: ['Well Liquid Loaded (Unloaded/Ceased Flow)'],
    diagnosticComments: 'Well has loading issues and ceased natural flow in Apr 26 due to liquid loading in the deep tubing string. Velocity string, Gas lift retrofit, or Plunger Lift induction is highly recommended.'
  }
];

export const SPE_KNOWLEDGE_BASE: SPEPaper[] = [
  {
    id: 'spe-01',
    code: 'SPE-181232-MS',
    title: 'Optimization of Continuous Gas Lift Systems in Complex High Water Cut Reservoirs',
    authors: 'Al-Khafaji, M., & Martinez, J.',
    year: 2018,
    category: 'Gas Lift',
    summary: 'This classic paper covers how to mathematically evaluate the critical lifting gas volume of a well when water cut exceeds 70%. It discusses the gas lift performance curve (GLPC) where injecting too much gas causes friction pressure drops to restrict liquid flow, resulting in water/gas slugging and decline.',
    guidelines: [
      'Optimal gas injection should stay within 5-10% of the maximum peak of the Gas Lift Performance Curve.',
      'For high water cuts, fluid density increases, requiring an elevated injection pressure or deeper injection orifice depth.',
      'Check dual-point completions for cross-flow leaks if injection gas lift pressure fluctuates wildly.'
    ]
  },
  {
    id: 'spe-02',
    code: 'SPE-195450-MS',
    title: 'Root Cause Failure Analysis and Performance Optimization of ESPs in Sand-Producing Formations',
    authors: 'Bates, D., Chen, Y., & Kovalenko, S.',
    year: 2020,
    category: 'ESP',
    summary: 'Provides a troubleshooting tree for electrical submersible pumps facing sand erosion, motor cooling failures, and scale deposition. Recommends running Variable Speed Drives (VSD) instead of fixed choke down-throttling to maintain the motor temperature below standard insulation limits.',
    guidelines: [
      'Maintain frequency above 45 Hz to prevent pump down-thrust and below 65 Hz to avoid severe cavitation or pump up-thrust.',
      'Severe power spikes typically represent scaling or mechanical binding. Run chemical scale wash immediately.',
      'Keep motor temperature below 200°F (93°C) for standard Class F insulation lifetimes.'
    ]
  },
  {
    id: 'spe-03',
    code: 'SPE-166254-PA',
    title: 'High-Temperature Matrix Acidizing of Damaged Sandstones: Well Selection and Optimization Guidelines',
    authors: 'Hassan, A. K., & Al-Duailij, M.',
    year: 2015,
    category: 'Well Intervention',
    summary: 'A definitive study on mud-acid sandstone matrix treatments. Proves that wells with Skin Factor (S) > +8 and pressure reserve > 60% of original SBHP have an 85% success rate of regaining original productivity indexes (PI). Outlines mud-acid concentration stages (12% HCl - 3% HF).',
    guidelines: [
      'Calculate Skin Factor before acidizing. If Skin is primarily positive damage (> +5), acid wash can trigger massive gains.',
      'Ensure wellhead pressure can safely accommodate fluid disposal rates without breaking fracturing limits.',
      'Over-displacing with ammonium chloride (NH4Cl) is critical to prevent secondary calcium-fluoride precipitation.'
    ]
  },
  {
    id: 'spe-04',
    code: 'SPE-201988-MS',
    title: 'Flow Assurance Challenges: Diagnosing and Remediation of Near-Wellbore Organic Scaling & Paraffin Wax',
    authors: 'Gomez, L., & Smith, T.',
    year: 2021,
    category: 'Flow Assurance',
    summary: 'Outlines standard surveillance checklists to distinguish paraffin wax blockages from mineral carbonate scaling. Carbonate scaling occurs inside the tubing where drop-in reservoir pressure causes carbon dioxide release, whereas paraffin wax deposits primarily when the crude temperature falls below the Cloud Point.',
    guidelines: [
      'A gradual decrease in tubing pressure paired with a steady oil rate loss is typically wax build-up.',
      'Carbonate scales often cause severe PI decreases over multiple months with immediate BHP drops.',
      'Utilize electric chemical injection pumps to inject scale/paraffin inhibitors at the lowest intake packers.'
    ]
  }
];

export interface AuditTrail {
  timestamp: string;
  action: string;
  agent: string;
  details: string;
}

export const INITIAL_AUDIT_TRAIL: AuditTrail[] = [
  {
    timestamp: '2026-05-24 08:30:00',
    action: 'System Booted',
    agent: 'Coordinator Agent',
    details: 'AI Simulation platform and SCADA data ingestion pipeline initialized.'
  },
  {
    timestamp: '2026-05-24 09:12:15',
    action: 'Anomalies Detected',
    agent: 'Surveillance Agent',
    details: 'Alert triggered for Well PROD-02: Water cut exceeded daily threshold (80.1%).'
  },
  {
    timestamp: '2026-05-24 10:05:44',
    action: 'Candidate Evaluation Completed',
    agent: 'Recommendation Agent',
    details: 'Evaluated 4 wells for diagnostic prioritization. PROD-03 recognized as premium acid optimization candidate.'
  }
];
