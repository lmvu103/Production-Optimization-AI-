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
    wellheadPressure?: number;
    gor?: number;
    gasLift?: number;
    choke?: number;
    oilCum?: number;
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

export const DUMMY_FALLBACK_WELL: Well = {
  id: 'well-none',
  name: 'No Well Selected',
  status: 'DOWN',
  liftType: 'Natural Flow',
  measuredDepth: 0,
  reservoirPressure: 0,
  wellheadPressure: 0,
  reservoirDepth: 0,
  tubingID: 0,
  liquidRate: 0,
  oilRate: 0,
  waterCut: 0,
  gor: 0,
  productivityIndex: 0,
  skinFactor: 0,
  bubblePointPressure: 0,
  activeAlerts: ['No Production Database Loaded'],
  diagnosticComments: 'Vui lòng upload tệp cơ sở dữ liệu giếng tại tab "Data Upload" để thực hiện tính toán và phân tích.',
  history: []
};

export const WELLS_DATA: Well[] = [];

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
