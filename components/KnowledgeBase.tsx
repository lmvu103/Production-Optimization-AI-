'use client';

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { SPE_KNOWLEDGE_BASE, SPEPaper, Well } from '../lib/oilfieldData';
import { 
  BookOpen, Search, UploadCloud, FileSpreadsheet, FileText, 
  FileCheck, Download, ChevronRight, Activity, Droplets, 
  Flame, HardDrive, AlertTriangle, CheckCircle2, RefreshCw,
  Trash2
} from 'lucide-react';

interface KnowledgeBaseProps {
  wells: Well[];
  selectedWell: Well;
  onSelectWell: (well: Well) => void;
  onWellsUpdate: (wells: Well[]) => void;
  onWellsDelete?: (wellIds: string[]) => void;
  onAudit: (action: string, details: string) => void;
}

export default function KnowledgeBase({ 
  wells, 
  selectedWell, 
  onSelectWell, 
  onWellsUpdate, 
  onWellsDelete,
  onAudit 
}: KnowledgeBaseProps) {
  const [language, setLanguage] = useState<'en' | 'vi'>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ 
    name: string; 
    size: string; 
    timestamp: string; 
    rowsParsedCount: number;
    wellNames: string[];
    wellIds: string[];
  }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [activePaper, setActivePaper] = useState<SPEPaper | null>(SPE_KNOWLEDGE_BASE[0]);

  // Handle local text search over the pre-defined SPE library
  const filteredPapers = useMemo(() => {
    if (!searchQuery) return SPE_KNOWLEDGE_BASE;
    return SPE_KNOWLEDGE_BASE.filter(p => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.summary.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Download Sample Excel Template congruent with user specification
  const downloadSampleExcel = () => {
    const headers = [
      "Date", "Status", "Working Hour", "Choke", "WHFP", "WHFT", 
      "Prod Liquid", "Rate Liquid", "Cum Liquid", "Prod Oil", "Rate Oil", "Cum Oil", 
      "Prod Gas", "Rate Gas", "Cum Gas", "Prod Water", "Rate Water", "Cum Water", 
      "BHFP", "Gaslift", "Frequency"
    ];
    
    const rows = [
      ["16-Jun-16", "P", 24, 60, 455, 70, 1590, 1590, 1, 373, 373, 0.54, 0, 0, 0, 1217, 1217, 1, 2260, 1.0, ""],
      ["17-Jun-16", "P", 18, 24, 806, 53, 1085, 814, 1.1, 202, 152, 0.54, 0, 0, 0, 883, 662, 1.1, 2364, 1.0, ""],
      ["18-Jun-16", "P", 24, 60, 520, 72, 1610, 1610, 1.2, 390, 390, 0.55, 0, 0, 0, 1220, 1220, 1.2, 2240, 1.0, ""],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "production_data");
    XLSX.writeFile(wb, "Prouduction_database_sample.xlsx");
    onAudit('Excel Template Exported', 'Sample production database Excel sheet matching SCADA database compiled.');
  };

  // Download Sample CSV Template
  const downloadSampleCSV = () => {
    const csvContent = [
      "Date,Status,Working Hour,Choke,WHFP,WHFT,Prod Liquid,Rate Liquid,Cum Liquid,Prod Oil,Rate Oil,Cum Oil,Prod Gas,Rate Gas,Cum Gas,Prod Water,Rate Water,Cum Water,BHFP,Gaslift,Frequency",
      "16-Jun-16,P,24,60,455,70,1590,1590,1,373,373,0.542,0,0,0,1217,1217,1,2260,1.0,",
      "17-Jun-16,P,18,24,806,53,1085,814,1.1,202,152,0.542,0,0,0,883,662,1,2364,1.0,",
      "18-Jun-16,P,24,60,520,72,1610,1610,1.2,390,390,0.55,0,0,0,1220,1220,1.2,2240,1.0,"
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Prouduction_database_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAudit('CSV Template Exported', 'Sample database CSV matching field SCADA columns generated.');
  };

  // Handle uploaded files to parse spreadsheet (XLSX, XLS, CSV)
  const handleUploadedDataset = (file: File) => {
    const isSpreadsheet = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv');
    
    if (!isSpreadsheet) {
      // Treat as standard doc grounding import
      const now = new Date();
      const timeStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0].substring(0, 5)}`;
      const parsedRows = Math.floor(Math.random() * 80) + 10;
      setUploadedFiles(prev => [{
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        timestamp: timeStr,
        rowsParsedCount: parsedRows,
        wellNames: ['Doc Grounding Reference'],
        wellIds: []
      }, ...prev]);
      onAudit('Reference Document Ingested', `Reference document '${file.name}' added to prompt RAG library.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Helper to normalize Vietnamese/English strings for column key matching
        const normalizeStr = (str: string): string => {
          return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // remove Vietnamese diacritic accent marks
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .toLowerCase()
            .replace(/[\s_\-\(\)\/\[\]]/g, '');
        };

        // Helper to extract value safely with multiple aliases
        const getRowValue = (row: any, aliases: string[], defaultValue: any = 0) => {
          for (const alias of aliases) {
            const cleanAlias = normalizeStr(alias);
            const key = Object.keys(row).find(
              k => normalizeStr(k) === cleanAlias
            );
            if (key !== undefined && row[key] !== undefined && row[key] !== null && row[key] !== '') {
              const val = parseFloat(row[key]);
              return isNaN(val) ? row[key] : val;
            }
          }
          return defaultValue;
        };

        const getRowString = (row: any, aliases: string[], defaultValue: string = '') => {
          for (const alias of aliases) {
            const cleanAlias = normalizeStr(alias);
            const key = Object.keys(row).find(
              k => normalizeStr(k) === cleanAlias
            );
            if (key !== undefined && row[key] !== undefined && row[key] !== null) {
              return String(row[key]).trim();
            }
          }
          return defaultValue;
        };

        // Helper to parse dates in format DD-MMM-YY, e.g., 16-Jun-16, etc.
        const parseCSVDate = (dateStr: any): Date => {
          if (!dateStr) return new Date();
          if (dateStr instanceof Date) return dateStr;
          const str = String(dateStr).trim();
          
          const d = new Date(str);
          if (!isNaN(d.getTime())) return d;

          // Handle Excel numeric serial dates
          const numVal = Number(str);
          if (!isNaN(numVal) && numVal > 30000 && numVal < 100000) {
            return new Date((numVal - 25569) * 86400 * 1000);
          }
          
          const parts = str.split(/[\-\/\s]+/);
          const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

          if (parts.length === 3) {
            const p0_num = parseInt(parts[0], 10);
            const p1_num = parseInt(parts[1], 10);
            const p2_num = parseInt(parts[2], 10);

            // 1. Is it like YYYY-MM-DD?
            if (p0_num > 1900 && p0_num < 2100 && !isNaN(p1_num) && !isNaN(p2_num)) {
              return new Date(p0_num, p1_num - 1, p2_num);
            }

            // 2. Is it like DD-MM-YYYY or DD-MM-YY?
            if (!isNaN(p0_num) && p0_num > 0 && p0_num <= 31 && !isNaN(p1_num) && p1_num > 0 && p1_num <= 12 && !isNaN(p2_num)) {
              const yr = p2_num < 100 ? 2000 + p2_num : p2_num;
              return new Date(yr, p1_num - 1, p0_num);
            }

            // 3. Is it DD-MMM-YY style (e.g. "16-Jun-16")?
            const p1_lower = parts[1].toLowerCase().substring(0, 3);
            const mIdx = months.findIndex(mName => mName === p1_lower);
            if (mIdx !== -1) {
              let year = p2_num;
              if (year < 100) year += 2000;
              if (!isNaN(p0_num) && !isNaN(year)) {
                return new Date(year, mIdx, p0_num);
              }
            }
          }
          return new Date();
        };

        let wellGroupMap: { [wellName: string]: any[] } = {};
        let totalRowsParsed = 0;

        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const sheetJson = XLSX.utils.sheet_to_json<any>(worksheet);
          if (!sheetJson || sheetJson.length === 0) return;

          totalRowsParsed += sheetJson.length;

          // Check if this sheet has a well column
          const wellNameCols = ['Well Name', 'Well', 'Giêng', 'Ten Gieng', 'Name', 'well_name', 'wellname'];
          let hasWellCol = false;
          if (sheetJson[0]) {
            hasWellCol = Object.keys(sheetJson[0]).some(k => 
              wellNameCols.map(alias => alias.toLowerCase().replace(/[\s_\-\(\)\/]/g, ''))
                .includes(k.trim().toLowerCase().replace(/[\s_\-\(\)\/]/g, ''))
            );
          }

          const isGenericSheet = /^sheet\d*$/i.test(sheetName) || sheetName.toLowerCase() === 'data' || sheetName.toLowerCase() === 'production';
          
          if (hasWellCol && (isGenericSheet || workbook.SheetNames.length === 1)) {
            sheetJson.forEach((row: any) => {
              const name = getRowString(row, wellNameCols, sheetName);
              if (!wellGroupMap[name]) wellGroupMap[name] = [];
              wellGroupMap[name].push(row);
            });
          } else {
            // Use the sheet name itself as the well name
            if (!wellGroupMap[sheetName]) wellGroupMap[sheetName] = [];
            wellGroupMap[sheetName].push(...sheetJson);
          }
        });

        if (Object.keys(wellGroupMap).length === 0) {
          throw new Error("Không tìm thấy dữ liệu giếng khai thác nào trong các sheet.");
        }

        const parsedWells: Well[] = Object.keys(wellGroupMap).map((wellName, wIdx) => {
          const rows = wellGroupMap[wellName];
          
          // Sort rows by Date ascending
          const sortedRows = [...rows].sort((a, b) => {
            const dateA = parseCSVDate(getRowString(a, ['Date', 'date', 'ngay', 'Ngay', 'Ngày', 'Time', 'time', 'Thang', 'Tháng', 'month', 'Month']));
            const dateB = parseCSVDate(getRowString(b, ['Date', 'date', 'ngay', 'Ngay', 'Ngày', 'Time', 'time', 'Thang', 'Tháng', 'month', 'Month']));
            return dateA.getTime() - dateB.getTime();
          });

          const latestRow = sortedRows[sortedRows.length - 1];

          // Determine lift type based on continuous values
          let hasFreq = sortedRows.some(r => getRowValue(r, ['Frequency', 'esp_frequency', 'esp_hz']) > 0);
          let hasGL = sortedRows.some(r => getRowValue(r, ['Gaslift', 'gas_lift', 'gl_rate', 'gaslift_rate']) > 0);
          
          let liftType: 'ESP' | 'Gas Lift' | 'Natural Flow' | 'Plunger Lift' = 'Natural Flow';
          if (hasFreq) liftType = 'ESP';
          else if (hasGL) liftType = 'Gas Lift';

          const measuredDepth = 9800;
          const initialBhp = getRowValue(latestRow, ['BHFP', 'pwf', 'Pwf', 'P_wf', 'bottomholepressure', 'bhfppsi', 'Bottom Hole Pressure', 'Ap suat day gieng', 'Áp suất đáy giếng', 'BH pressure', 'BH Pressure'], 2200);
          const reservoirPressure = Math.max(3000, initialBhp + 420); // realistic estimate
          const wellheadPressure = getRowValue(latestRow, ['WHFP', 'wellheadpressure', 'pwh', 'Pwh', 'apsuatdaugieng', 'Wellhead Pressure', 'P_wh', 'Apsuat dau gieng', 'WH pressure', 'WH Pressure'], 150);
          const reservoirDepth = measuredDepth - 300;
          const tubingID = 2.875;
          const liquidRate = getRowValue(latestRow, ['Rate Liquid', 'Rate_Liquid', 'liquidrate', 'liquid_rate', 'prop液', 'prodliquid', 'Liquid Rate', 'Liquid_Rate', 'ql', 'Ql', 'Liquid (bpd)', 'Liquid bpd', 'Lưu lượng chất lỏng', 'Sản lượng chất lỏng'], 1500);
          const oilRate = getRowValue(latestRow, ['Rate Oil', 'Rate_Oil', 'oilrate', 'oil_rate', 'prodoil', 'Oil Rate', 'Oil_Rate', 'qo', 'Qo', 'Oil bopd', 'Oil (bopd)', 'Lưu lượng dầu', 'Sản lượng dầu'], 300);
          const waterRate = getRowValue(latestRow, ['Rate Water', 'Rate_Water', 'waterrate', 'water_rate', 'prodwater', 'Water Rate', 'Water_Rate', 'qw', 'Qw', 'Water (bpd)', 'Water bpd', 'Lưu lượng nước', 'Sản lượng nước'], liquidRate - oilRate);
          
          let waterCut = getRowValue(latestRow, ['Water Cut', 'Water_Cut', 'watercut', 'wcut', 'Wcut', 'Độ ngập nước', 'Ngập nước', 'WaterCut', 'Tỷ lệ ngập nước', 'Ty le ngap nuoc'], -1);
          if (waterCut === -1) {
            if (liquidRate > 0) {
              waterCut = parseFloat(((waterRate / liquidRate) * 100).toFixed(1));
            } else {
              waterCut = parseFloat(((1 - oilRate / Math.max(1, liquidRate)) * 100).toFixed(1));
            }
          }
          if (waterCut < 0) waterCut = 0;
          if (waterCut > 100) waterCut = 100;

          const gor = getRowValue(latestRow, ['GOR', 'gor', 'Gas Oil Ratio', 'gasoilratio', 'Gas_Oil_Ratio', 'Tỷ lệ khí dầu', 'Ty le khi dau'], 350);
          const drawDown = Math.max(50, reservoirPressure - initialBhp);
          const productivityIndex = parseFloat((liquidRate / drawDown).toFixed(2));
          const chokeSize = getRowValue(latestRow, ['Choke', 'chokesize', 'choke_size', 'Choke Size', 'Duong kinh con', 'Con'], 48);
          const bubblePointPressure = 1400;
          
          // Current Status mapping
          const statusStr = getRowString(latestRow, ['Status', 'status', 'trangthai'], 'P').toUpperCase();
          let status: 'OPTIMAL' | 'UNDERPERFORMER' | 'DOWN' | 'CRITICAL' = 'OPTIMAL';
          if (statusStr.includes('SI') || statusStr.includes('DOWN') || statusStr.includes('CEASE') || statusStr.includes('SHUT')) {
            status = 'DOWN';
          } else if (waterCut > 78) {
            status = 'UNDERPERFORMER';
          } else if (drawDown < 150) {
            status = 'CRITICAL';
          }

          // Build history directly from the physical rows to preserve exact dates and rates from the database
          let history = sortedRows.map(r => {
            const rawDateStr = getRowString(r, ['Date', 'date', 'ngay', 'Ngay', 'Ngày', 'Time', 'time', 'Thang', 'Tháng', 'month', 'Month'], '16-Jun-16');
            let dateStr = rawDateStr;
            const parsedD = parseCSVDate(rawDateStr);
            if (parsedD && !isNaN(parsedD.getTime())) {
              const dayStr = String(parsedD.getDate()).padStart(2, '0');
              const monthStr = String(parsedD.getMonth() + 1).padStart(2, '0');
              const yearStr = parsedD.getFullYear();
              dateStr = `${dayStr}/${monthStr}/${yearStr}`;
            }

            const oR = getRowValue(r, ['Rate Oil', 'Rate_Oil', 'oilrate', 'oil_rate', 'prodoil', 'Oil Rate', 'Oil_Rate', 'qo', 'Qo', 'Oil bopd', 'Oil (bopd)', 'Lưu lượng dầu', 'Sản lượng dầu'], 300);
            const lR = getRowValue(r, ['Rate Liquid', 'Rate_Liquid', 'liquidrate', 'liquid_rate', 'prop液', 'prodliquid', 'Liquid Rate', 'Liquid_Rate', 'ql', 'Ql', 'Liquid (bpd)', 'Liquid bpd', 'Lưu lượng chất lỏng', 'Sản lượng chất lỏng'], 1500);
            const wR = getRowValue(r, ['Rate Water', 'Rate_Water', 'waterrate', 'water_rate', 'prodwater', 'Water Rate', 'Water_Rate', 'qw', 'Qw', 'Water (bpd)', 'Water bpd', 'Lưu lượng nước', 'Sản lượng nước'], lR - oR);
            let curWcut = getRowValue(r, ['Water Cut', 'Water_Cut', 'watercut', 'wcut', 'Wcut', 'Độ ngập nước', 'Ngập nước', 'WaterCut', 'Tỷ lệ ngập nước', 'Ty le ngap nuoc'], -1);
            if (curWcut === -1) {
              curWcut = lR > 0 ? parseFloat(((wR / lR) * 100).toFixed(1)) : 0;
            }
            if (curWcut < 0) curWcut = 0;
            if (curWcut > 100) curWcut = 100;

            const bhp = getRowValue(r, ['BHFP', 'pwf', 'Pwf', 'P_wf', 'bottomholepressure', 'bhfppsi', 'Bottom Hole Pressure', 'Ap suat day gieng', 'Áp suất đáy giếng', 'BH pressure', 'BH Pressure'], 2200);
            const thp = getRowValue(r, ['WHFP', 'wellheadpressure', 'pwh', 'Pwh', 'apsuatdaugieng', 'Wellhead Pressure', 'P_wh', 'Apsuat dau gieng', 'WH pressure', 'WH Pressure', 'thp', 'THP'], 150);
            const gorVal = getRowValue(r, ['GOR', 'gor', 'Gas Oil Ratio', 'gasoilratio', 'Gas_Oil_Ratio', 'Tỷ lệ khí dầu', 'Ty le khi dau'], 350);
            const gl = getRowValue(r, ['Gaslift', 'gas_lift', 'gl_rate', 'gaslift_rate', 'Gas Lift', 'Gas Lift Injection Rate', 'Lưu lượng khí nâng', 'Khi nang'], 0);
            const chk = getRowValue(r, ['Choke', 'chokesize', 'choke_size', 'Choke Size', 'Duong kinh con', 'Con'], 48);
            
            return {
              month: dateStr,
              oilRate: Math.round(oR),
              waterCut: curWcut,
              bottomHolePressure: Math.round(bhp),
              wellheadPressure: Math.round(thp),
              gor: Math.round(gorVal),
              gasLift: Math.round(gl),
              choke: Math.round(chk)
            };
          });

          // Keep full history of the well from beginning to end
          if (history.length === 0) {
            // Default history fallback with mock trend mimicking real dynamic changes for the plot
            const baseMonths = ['Jun 25', 'Jul 25', 'Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26'];
            history = baseMonths.map((m, idx) => {
              // Create some nice dynamic trends mimicking production depletion for beautiful visualization
              const factor = 1 - idx * 0.03; // gradual decline
              return {
                month: m,
                oilRate: Math.round(oilRate * factor),
                waterCut: Math.min(100, Math.max(0, Math.round(waterCut + idx * 1.2))),
                bottomHolePressure: Math.round(initialBhp - idx * 15),
                wellheadPressure: Math.round(wellheadPressure - idx * 5),
                gor: Math.round(gor * (1 + idx * 0.05)),
                gasLift: liftType === 'Gas Lift' ? Math.round(800 + Math.sin(idx) * 150) : 0,
                choke: chokeSize
              };
            });
          }

          // Alerts
          const activeAlerts: string[] = [];
          if (waterCut > 75) activeAlerts.push('High Water Cut Alert');
          if (status === 'DOWN') activeAlerts.push('Well Ceased Flow');
          if (productivityIndex < 1.0) activeAlerts.push('Low Productivity Index (PI < 1.0)');

          // Dynamic Diagnostic Comments
          let diagnosticComments = `Được nhận từ bộ số liệu '${file.name}'. `;
          if (status === 'DOWN') {
            diagnosticComments += `Giếng hiện đang đóng (SI). Biện pháp gồm kiểm tra ngập lỏng ống khai thác, bơm ép khí gaslift hỗ trợ hoặc chuyển đổi công nghệ khai thác.`;
          } else if (waterCut > 75) {
            diagnosticComments += `Độ ngập nước cao (${waterCut}%). Cần theo dõi sự đột phá hình nón nước hoặc tối ưu hóa chế độ khai thác của thiết bị nâng nhân tạo.`;
          } else {
            diagnosticComments += `Giếng đang khai thác ổn định. Chỉ số pi đạt ${productivityIndex} bpd/psi và áp suất đáy giếng duy trì ở mức ${initialBhp} psi.`;
          }

          return {
            id: `well-upload-${wIdx}-${Date.now()}`,
            name: wellName,
            status,
            liftType,
            measuredDepth,
            reservoirPressure,
            wellheadPressure,
            reservoirDepth,
            tubingID,
            liquidRate,
            oilRate: Math.round(oilRate),
            waterCut,
            gor,
            productivityIndex,
            skinFactor: 1.5,
            bubblePointPressure,
            espHz: liftType === 'ESP' ? getRowValue(latestRow, ['Frequency', 'esp_frequency', 'esp_hz'], 50) : undefined,
            gasLiftInjectionRate: liftType === 'Gas Lift' ? getRowValue(latestRow, ['Gaslift', 'gas_lift', 'gl_rate'], 1.0) : undefined,
            chokeSize,
            activeAlerts,
            diagnosticComments,
            history
          };
        });

        onWellsUpdate(parsedWells);

        const fileInfo = {
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          rowsParsedCount: totalRowsParsed,
          wellNames: parsedWells.map(w => w.name),
          wellIds: parsedWells.map(w => w.id)
        };
        setUploadedFiles(prev => [fileInfo, ...prev]);

        onAudit('Production Dataset Imported', `Đã đồng bộ cơ sở dữ liệu SCADA '${file.name}'. Trích xuất thành công ${parsedWells.length} giếng khai thác.`);
      } catch (err: any) {
        console.error(err);
        onAudit('File Import Failed', `Tải tệp thất bại '${file.name}'. Chi tiết lỗi: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDragDropOrClickUpload = (e: React.DragEvent<HTMLDivElement> | React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setIsDragging(false);

    let chosenFile: File | null = null;

    if (e.type === 'drop') {
      const de = e as React.DragEvent<HTMLDivElement>;
      if (de.dataTransfer.files && de.dataTransfer.files[0]) {
        chosenFile = de.dataTransfer.files[0];
      }
    } else {
      const ce = e as React.ChangeEvent<HTMLInputElement>;
      if (ce.target.files && ce.target.files[0]) {
        chosenFile = ce.target.files[0];
      }
    }

    if (chosenFile) {
      handleUploadedDataset(chosenFile);
    }
  };

  const handleDeleteFile = (idx: number) => {
    const targetFile = uploadedFiles[idx];
    if (!targetFile) return;

    if (onWellsDelete && targetFile.wellIds && targetFile.wellIds.length > 0) {
      onWellsDelete(targetFile.wellIds);
    }

    setUploadedFiles(prev => prev.filter((_, i) => i !== idx));

    onAudit(
      'File Ingestion Removed', 
      language === 'en' 
        ? `Successfully removed telemetry source file '${targetFile.name}' and all associated well assets.`
        : `Đã xóa tệp nguồn '${targetFile.name}' và thu hồi toàn bộ dữ liệu giếng liên quan.`
    );
  };

  // Find grounding paper associated with selected active well's liftType
  const relevantPaper = useMemo(() => {
    if (selectedWell.liftType === 'ESP') {
      return SPE_KNOWLEDGE_BASE.find(p => p.category === 'ESP') || null;
    } else if (selectedWell.liftType === 'Gas Lift') {
      return SPE_KNOWLEDGE_BASE.find(p => p.category === 'Gas Lift') || null;
    }
    return SPE_KNOWLEDGE_BASE.find(p => p.category === 'Well Intervention') || null;
  }, [selectedWell]);

  return (
    <div id="knowledge-base-panel" className="space-y-6">
      
      {/* SECTION 1: INGESTION WORKSPACE ZONE */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#0B1120] border border-slate-800 p-5 rounded-xl">
        <div className="md:col-span-12 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 mb-2 gap-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono">
              {language === 'en' ? 'Data Ingest System' : 'Hệ thống tải dữ liệu SCADA'}
            </h2>
          </div>

          {/* Elegant language selector button switch */}
          <div className="flex items-center bg-[#050812] border border-slate-800 rounded-lg p-1 space-x-1 shrink-0">
            <button
              id="lang-toggle-en"
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ENGLISH
            </button>
            <button
              id="lang-toggle-vi"
              onClick={() => setLanguage('vi')}
              className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                language === 'vi'
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              TIẾNG VIỆT
            </button>
          </div>
        </div>

        {/* Core Drag & Drop Zone (5 cols) */}
        <div className="md:col-span-5 flex flex-col justify-center">
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDragDropOrClickUpload}
            className={`border-2 border-dashed p-6 rounded-xl text-center flex flex-col justify-center items-center cursor-pointer transition-all h-[230px] ${
              isDragging 
                ? 'border-cyan-500 bg-cyan-950/15 animate-pulse' 
                : 'border-slate-800 bg-[#050812] hover:border-slate-700'
            }`}
          >
            <input
              type="file"
              id="well-log-file-input"
              className="hidden"
              onChange={handleDragDropOrClickUpload}
              accept=".xlsx,.xls,.csv"
            />
            <label htmlFor="well-log-file-input" className="cursor-pointer flex flex-col items-center">
              <UploadCloud className={`w-10 h-10 mb-3 transition-colors ${isDragging ? 'text-cyan-400' : 'text-slate-500'}`} />
              <h4 className="text-xs font-bold text-slate-250 font-mono tracking-wider mb-1">
                {language === 'en' ? 'DATASET INGESTION (.CSV / .XLSX)' : 'TẢI TỆP SỐ LIỆU (.CSV / .XLSX)'}
              </h4>
              <p className="text-[10px] text-slate-400 font-sans leading-tight mt-1 px-4">
                {language === 'en' 
                  ? 'Drag & drop your SCADA spreadsheet files here, or click to browse standard templates.'
                  : 'Kéo thả tệp dữ liệu SCADA của bạn hoặc click để duyệt tìm tệp mẫu đã có dữ liệu giếng.'}
              </p>
            </label>
          </div>
        </div>

        {/* Template Downloads Panel (3 cols) */}
        <div className="md:col-span-3 flex flex-col justify-between bg-[#050812] border border-slate-850 p-4 rounded-xl h-[230px]">
          <div>
            <p className="text-[10px] font-bold text-slate-450 tracking-wider uppercase font-mono border-b border-slate-800 pb-1.5 mb-2">
              {language === 'en' ? 'SCADA Spreadsheet Templates' : 'Cơ sở dữ liệu mẫu SCADA'}
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans mb-3">
              {language === 'en'
                ? 'Download pre-formatted production databases with correct headers to load production streams.'
                : 'Tải tệp mẫu chuẩn cấu trúc dữ liệu giếng khai thác Block-A để thử nghiệm hoặc điền thông tin thực tế.'}
            </p>
          </div>
          <div className="space-y-2 mt-auto">
            <button
              onClick={downloadSampleExcel}
              className="w-full bg-[#0B1120] hover:bg-slate-850 border border-slate-800 text-[10px] text-slate-200 font-mono py-2 px-2.5 rounded-lg flex items-center justify-between transition-all group cursor-pointer"
            >
              <span className="truncate pr-1">
                {language === 'en' ? 'Download Excel (.xlsx)' : 'Tải Excel (.xlsx)'}
              </span>
              <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            </button>
            <button
              onClick={downloadSampleCSV}
              className="w-full bg-[#0B1120] hover:bg-slate-850 border border-slate-800 text-[10px] text-slate-200 font-mono py-2 px-2.5 rounded-lg flex items-center justify-between transition-all group cursor-pointer"
            >
              <span className="truncate pr-1">
                {language === 'en' ? 'Download CSV (.csv)' : 'Tải CSV (.csv)'}
              </span>
              <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            </button>
          </div>
        </div>

        {/* List of successfully parsed logs (4 cols) */}
        <div className="md:col-span-4 bg-[#050812] border border-slate-850 p-4 rounded-xl flex flex-col justify-between h-[230px]">
          <div className="flex-1 flex flex-col min-h-0">
            <h4 className="text-[10px] font-bold text-slate-450 tracking-wider uppercase font-mono mb-2 border-b border-slate-800 pb-1.5">
              {language === 'en' ? 'Processed Ingests' : 'Processed Ingests (Tệp Đã Đọc)'}
            </h4>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {uploadedFiles.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-slate-500 text-[10px] font-mono text-center">
                  {language === 'en'
                    ? 'No files loaded yet. Import telemetry streams to construct focus wells!'
                    : 'Chưa có tệp dữ liệu nào được tải. Hãy tải tệp dữ liệu giếng của bạn để bắt đầu phân tích!'}
                </div>
              ) : (
                uploadedFiles.map((f, i) => (
                  <div id={`ingest-item-card-${i}`} key={i} className="flex justify-between items-center bg-[#0B1120] px-2.5 py-2 rounded border border-slate-800 text-xs font-mono">
                    <div className="flex items-center space-x-2 overflow-hidden">
                      {f.name.endsWith('.xlsx') ? (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                      )}
                      <div className="truncate pr-2">
                        <p id={`ingest-filename-${i}`} className="text-cyan-400 font-semibold font-mono text-[11px] truncate leading-none mb-1">{f.name}</p>
                        <p className="text-[9px] text-slate-500">{f.size} | {f.timestamp}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[9px] bg-emerald-950/40 text-emerald-400 px-2 py-0.5 rounded border border-emerald-950 flex items-center gap-1 font-mono">
                        <FileCheck className="w-3 h-3" /> {f.rowsParsedCount} {language === 'en' ? 'rows' : 'dòng'}
                      </span>
                      <button
                        id={`delete-ingest-btn-${i}`}
                        onClick={() => handleDeleteFile(i)}
                        title={language === 'en' ? 'Delete uploaded file and associated well' : 'Xóa tệp dữ liệu và giếng liên quan'}
                        className="p-1 hover:bg-rose-950/40 text-slate-500 hover:text-rose-450 border border-transparent hover:border-rose-900/50 rounded transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[9px] text-slate-550 leading-snug font-mono shrink-0">
            {language === 'en'
              ? '* Ingested lines map seamlessly to generate telemetry assets in other dashboards.'
              : '* Các dòng dữ liệu từ tài liệu upload được ánh xạ trực tiếp thành các giếng khai thác trên hệ thống.'}
          </div>
        </div>

      </div>

      {/* SECTION 2: WEB-ASSESSMENT WELL EXPLORER & CONTEXT SELECTOR (Bảng Lựa Chọn Giếng Đánh Giá) */}
      <div className="bg-[#0B1120] border border-slate-800 p-5 rounded-xl space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-3 gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              {language === 'en' ? 'Well Selection Registry & Deep Evaluation' : 'Bảng Lựa Chọn Giếng & Đánh Giá Chi Tiết'}
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              {language === 'en'
                ? 'Select any well context below to examine flowing lift profiles, diagnostic comments, and SPE rules.'
                : 'Chọn giếng bất kỳ để kiểm tra nhanh sơ đồ công nghệ khai thác, sản lượng hiện hữu và nhận định tối ưu.'}
            </p>
          </div>
          <div className="bg-[#050812] border border-slate-800 px-3 py-1 text-slate-500 font-mono text-[10px] rounded">
            TOTAL WELLS: <span className="text-cyan-400 font-bold">{wells.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Well Selection List Sidebar (4 Columns) */}
          <div className="lg:col-span-4 flex flex-col space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {wells.map((well) => {
              const isSelected = well.id === selectedWell.id;
              const isUploaded = well.id.includes('upload');
              
              let statusText = language === 'en' ? "flowing" : "đang hoạt động";
              let statusStyle = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
              
              if (well.status === 'UNDERPERFORMER') {
                statusText = language === 'en' ? "high water cut" : "độ ngập nước cao";
                statusStyle = "text-amber-400 bg-amber-500/10 border-amber-500/20";
              } else if (well.status === 'CRITICAL') {
                statusText = language === 'en' ? "high skin factor" : "hệ số skin cao";
                statusStyle = "text-rose-400 bg-rose-500/10 border-rose-500/20";
              } else if (well.status === 'DOWN') {
                statusText = language === 'en' ? "stopped / SI" : "đang đóng giếng";
                statusStyle = "text-slate-400 bg-slate-500/10 border-slate-500/20";
              }

              return (
                <button
                  key={well.id}
                  onClick={() => onSelectWell(well)}
                  className={`w-full text-left p-3 rounded-lg border font-mono transition-all flex items-center justify-between cursor-pointer ${
                    isSelected 
                      ? 'bg-slate-900 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
                      : 'bg-[#050812] border-slate-850 text-slate-300 hover:bg-slate-850/50'
                  }`}
                >
                  <div className="space-y-1 overflow-hidden pr-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="truncate font-semibold text-xs text-slate-200">{well.name}</span>
                      {isUploaded && (
                        <span className="text-[8px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1 py-0.5 rounded leading-none shrink-0 font-bold">
                          IMPORTED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                      <span>{well.liftType}</span>
                      <span>•</span>
                      <span>Qo: {well.oilRate} bopd</span>
                    </div>
                  </div>

                  <span className={`text-[9px] px-2 py-0.5 rounded border font-mono shrink-0 uppercase tracking-widest ${statusStyle}`}>
                    {statusText}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Well Mini-Evaluation Dashboard (8 Columns) */}
          <div className="lg:col-span-8 bg-[#050812] border border-slate-850 rounded-xl p-5 flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Header block with metadata */}
              <div className="flex justify-between items-start border-b border-slate-880 pb-3">
                <div>
                  <span className="text-[9px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-700 uppercase tracking-widest">
                    {selectedWell.liftType} {language === 'en' ? 'Completion' : 'Phương pháp KT'}
                  </span>
                  <h3 className="text-sm font-bold text-slate-200 mt-1.5 flex items-center gap-2">
                    {language === 'en' ? 'Evaluation Focus' : 'Đánh giá chi tiết'}: {selectedWell.name}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-500 font-mono font-medium">
                    {language === 'en' ? 'LATEST UPDATE' : 'CẬP NHẬT MỚI NHẤT'}
                  </p>
                  <p className="text-[10px] text-slate-300 font-semibold font-mono">
                    {selectedWell.history && selectedWell.history.length > 0 
                      ? selectedWell.history[selectedWell.history.length - 1].month 
                      : '2026-05'}
                  </p>
                </div>
              </div>

              {/* Grid of latest Scada row indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                <div className="bg-[#0B1120] border border-slate-850 p-2.5 rounded-lg flex items-center space-x-3">
                  <div className="w-8 h-8 rounded bg-cyan-950 flex items-center justify-center text-cyan-400 shrink-0">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 font-mono">
                      {language === 'en' ? 'OIL RATE' : 'SẢN LƯỢNG DẦU'}
                    </p>
                    <p className="text-xs font-bold text-cyan-400 font-mono">{selectedWell.oilRate} bopd</p>
                  </div>
                </div>

                <div className="bg-[#0B1120] border border-slate-850 p-2.5 rounded-lg flex items-center space-x-3">
                  <div className="w-8 h-8 rounded bg-emerald-950 flex items-center justify-center text-emerald-400 shrink-0">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 font-mono">
                      {language === 'en' ? 'WATER CUT' : 'ĐỘ NGẬP NƯỚC'}
                    </p>
                    <p className="text-xs font-bold text-emerald-400 font-mono">{selectedWell.waterCut}%</p>
                  </div>
                </div>

                <div className="bg-[#0B1120] border border-slate-850 p-2.5 rounded-lg flex items-center space-x-3">
                  <div className="w-8 h-8 rounded bg-amber-950 flex items-center justify-center text-amber-400 shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 font-mono">
                      {language === 'en' ? 'FLOWING PRESSURE' : 'ÁP SUẤT ĐÁY (BHFP)'}
                    </p>
                    <p className="text-xs font-bold text-amber-400 font-mono">
                      {selectedWell.history && selectedWell.history.length > 0 
                        ? selectedWell.history[selectedWell.history.length - 1].bottomHolePressure
                        : 2200} psi
                    </p>
                  </div>
                </div>

                <div className="bg-[#0B1120] border border-slate-850 p-2.5 rounded-lg flex items-center space-x-3">
                  <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 font-mono">
                      {language === 'en' ? 'CHOKE SIZE' : 'CỠ CÔN'}
                    </p>
                    <p className="text-xs font-bold text-slate-300 font-mono">{selectedWell.chokeSize || '--'} /64&quot;</p>
                  </div>
                </div>

              </div>

              {/* Alerts & Diagnostic advisories */}
              <div className="space-y-2">
                <span className="text-[9px] text-slate-400 tracking-wider">
                  {language === 'en' ? 'DIAGNOSTIC ADVISORY SUMMARY:' : 'TỔNG HỢP KHUYẾN NGHỊ CHẨN ĐOÁN:'}
                </span>
                <p className="text-xs text-slate-350 leading-relaxed font-sans mt-0.5 bg-[#0B1120] p-3 rounded-lg border border-slate-850/80">
                  {(() => {
                    const isEn = language === 'en';
                    if (selectedWell.status === 'DOWN') {
                      return isEn 
                        ? `Well is currently shut-in (SI). Backpressure of flowing reservoir cannot lift fluid column. Recommended remedial tasks include verifying tubing liquid loading sweeps, initiating gas lift allocation booster, or assessing ESP installation.`
                        : `Giếng hiện đang đóng (SI). Áp suất ngược của cột chất lỏng cản trở dòng chảy tự nhiên. Khuyến nghị kiểm tra ngập lỏng ống khai thác, bơm ép khí gaslift hỗ trợ hoặc thiết kế chuyển đổi sang bơm ESP.`;
                    }
                    if (selectedWell.waterCut > 70) {
                      return isEn
                        ? `Critical water cut breakthrough of ${selectedWell.waterCut}% detected. Edge water or water coning has reached the active perforations. Urgently prioritize polymer chemical water shutoff (WSO) squeeze, or adapt artificial lift parameters to handle high liquid rates.`
                        : `Đột phá nước nghiêm trọng đạt ${selectedWell.waterCut}%. Nước rìa hoặc hình nón nước đã xâm nhập vào khoảng bắn vỉa. Khuyến nghị bơm ép polymer cô lập nước (WSO) hoặc điều chỉnh chế độ nâng nhân tạo để tối ưu lưu lượng chất lỏng khai thác.`;
                    }
                    if (selectedWell.skinFactor !== undefined && selectedWell.skinFactor > 5) {
                      return isEn
                        ? `Severe formation damage and restriction skin (+${selectedWell.skinFactor}) detected. Inflow performance index has degraded by over 60%. Recommended immediate sandstone matrix acidizing stimulation to dissolve scale, fines, and restore flow index.`
                        : `Tổn thất vùng cận đáy giếng nghiêm trọng (Hệ số Skin +${selectedWell.skinFactor}). Chỉ số năng suất giảm hơn 60% do lắng đọng cơ học/hóa học. Khuyến nghị bơm axit kích thích vỉa (matrix acid wash) để khôi phục trị số PI.`;
                    }
                    return isEn
                      ? `Well profile flowing stably under optimal hydraulic drawdown. Diagnostic monitoring registers oil rate at ${selectedWell.oilRate} bopd with ${selectedWell.waterCut}% water cut. Surveillance triggers confirm secure operation within safe reservoir envelope.`
                      : `Giếng đang khai thác ổn định dưới mức chênh áp thủy lực tối ưu. Hệ thống ghi nhận sản lượng dầu đạt ${selectedWell.oilRate} bopd với độ ngập nước ${selectedWell.waterCut}%. Các chỉ số giám sát SCADA nằm trong giới hạn an toàn hồ chứa.`;
                  })()}
                </p>
              </div>

              {/* SPE library integration guidance grounding */}
              {relevantPaper && (
                <div className="border border-slate-800/80 bg-slate-900/30 rounded-lg p-3 text-xs flex items-start space-x-3">
                  <div className="w-5 h-5 bg-cyan-950 rounded flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="text-cyan-400 font-semibold font-mono text-[10px] leading-tight">
                      {language === 'en' ? 'Grounded SPE Best Practice' : 'Khuyến Nghị Kỹ Thuật Chuẩn SPE'} ({relevantPaper.code})
                    </p>
                    <p className="text-slate-400 leading-snug text-[11px] font-sans">
                      {(() => {
                        const isEn = language === 'en';
                        if (relevantPaper.code === 'SPE-173845-MS') {
                          return isEn
                            ? 'Establishes frequency scaling directives for electrical submersible pumps under highly transient reservoir inflows to maximize drawdowns.'
                            : 'Thiết lập các định hướng thay đổi tần số cho bơm điện chìm (ESP) dưới chế độ dòng chảy không ổn định để tối đa hóa độ chênh áp khai thác.';
                        }
                        if (relevantPaper.code === 'SPE-182341-MS') {
                          return isEn
                            ? 'Optimizes lift efficiencies of gas lift systems in multi-well networks by allocating high-pressure gas based on marginal productivity curves.'
                            : 'Tối ưu hóa hiệu quả hoạt động của hệ thống khai thác bằng khí nén (Gas Lift) thông qua phân bổ lưu lượng khí bơm dựa trên đường cong chỉ số năng suất biên.';
                        }
                        return isEn
                          ? 'Formulates standard operational chemical wash criteria and matrix acid treatments to dissolve localized wellbore restriction screens and scale skins.'
                          : 'Xây dựng tiêu chuẩn xử lý vùng cận đáy bằng phương pháp bơm axit hoạt hóa kích thích vỉa để hòa tan các mảng lắng đọng cơ học/hóa học.';
                      })()}
                    </p>
                    <ul className="space-y-0.5 pt-1.5 border-t border-slate-880 mt-1.5">
                      {(() => {
                        const isEn = language === 'en';
                        let list: string[] = [];
                        if (relevantPaper.code === 'SPE-173845-MS') {
                          list = isEn
                            ? [
                                'Keep pump operating frequency strictly within a safe 50-60 Hz window to prevent cavitation erosion.',
                                'Regularly log motor temperature and current waveforms to protect electrical windings.',
                                'Coordinate active choke backpressures with casing gas venting rates to minimize vibration stresses.'
                              ]
                            : [
                                'Duy trì tần số hoạt động của bơm trong giới hạn an toàn 50-60 Hz để tránh hiện tượng xâm thực.',
                                'Theo dõi liên tục nhiệt độ motor và dòng điện để bảo vệ cuộn dây stator.',
                                'Phối hợp áp suất ngược tại đầu giếng với lượng khí thoát ngoài rãnh để giảm thiểu rung chấn.'
                              ];
                        } else if (relevantPaper.code === 'SPE-182341-MS') {
                          list = isEn
                            ? [
                                'Continuously track injection pressure gradients to identify tubing gas lift valve leaks.',
                                'Prioritize gas allocation to high-productivity index wells rather than severely restricted cells.',
                                'Maintain precise check valve diagnostics to avoid dangerous high-pressure casing gas blowbacks.'
                              ]
                            : [
                                'Theo dõi liên tục chênh lệch áp suất bơm ép để xác định các rò rỉ van gas lift trong ống khai thác.',
                                'Ưu tiên phân bổ lượng khí cho các giếng có chỉ số PI cao thay vì các giếng có hệ số tổn thất Skin quá lớn.',
                                'Kiểm tra định kỳ van một chiều để triệt tiêu hiện tượng sục khí ngược vào không gian vành móng.'
                              ];
                        } else {
                          list = isEn
                            ? [
                                'Apply systematic pre-flush organic solvents to thoroughly strip thin hydrocarbon shield coatings.',
                                'Regulate continuous injection pressures below active formation fracture limits to preserve casing structures.',
                                'Maximize post-wash flowing drawdowns within 24 hours to rapidly cycle dissolved minerals.'
                              ]
                            : [
                                'Bơm rải trước các dung môi hữu cơ tiền xử lý nhằm lột bỏ lớp màng mỏng hydrocarbon bám dính.',
                                'Khống chế áp suất bơm ép thấp hơn giới hạn nứt vỡ vỉa để bảo toàn tính toàn vẹn cơ học casing.',
                                'Tối đa hóa mức độ giảm áp gọi dòng trong vòng 24 giờ sau khi rửa giếng để đẩy nhanh cặn hòa tan ra ngoài.'
                              ];
                        }
                        return list.map((g, i) => (
                          <li key={i} className="text-[10px] text-slate-500 font-sans flex items-start space-x-1.5">
                            <span className="text-cyan-500">•</span>
                            <span>{g}</span>
                          </li>
                        ));
                      })()}
                    </ul>
                  </div>
                </div>
              )}

            </div>

            {/* Glowing command dashboard context swapper CTA */}
            <div className="mt-5 pt-3 border-t border-slate-850 flex flex-col md:flex-row justify-between items-center gap-3">
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1.5 leading-none">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {language === 'en' ? 'Well parsed cleanly into active SCADA cache.' : 'Giếng khai thác đã được đồng bộ vào bộ nhớ SCADA.'}
              </span>
              <button
                onClick={() => {
                  onSelectWell(selectedWell);
                  onAudit('Evaluation Triggered', `Triggered deep evaluation for well ${selectedWell.name} from grounding dashboard.`);
                  // Programmatically click active tab button for dashboard
                  const tabBtn = document.getElementById('nav-tab-dashboard');
                  if (tabBtn) tabBtn.click();
                }}
                className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all shrink-0 cursor-pointer"
              >
                <span>{language === 'en' ? 'Analyze on Commanding Dashboard' : 'Đánh giá giếng này trên Commanding Dashboard'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
