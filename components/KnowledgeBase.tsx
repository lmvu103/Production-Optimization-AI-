'use client';

import React, { useState, useMemo } from 'react';
import { SPE_KNOWLEDGE_BASE, SPEPaper } from '../lib/oilfieldData';
import { BookOpen, Search, UploadCloud, FileSpreadsheet, FileText, Check, FileCheck, ArrowRight } from 'lucide-react';

interface KnowledgeBaseProps {
  onAudit: (action: string, details: string) => void;
}

export default function KnowledgeBase({ onAudit }: KnowledgeBaseProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; timestamp: string; rowsParsedCount: number }[]>([
    { name: 'Daily_Production_Report_BlockA.xlsx', size: '1.4 MB', timestamp: '2026-05-24 07:15', rowsParsedCount: 120 },
    { name: 'VLP_Diagnostics_Survey_PROD02.pdf', size: '2.8 MB', timestamp: '2026-05-24 10:44', rowsParsedCount: 45 }
  ]);
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

  // Simulate file upload parsing with real-time UI feedback
  const triggerMockUpload = (e: React.DragEvent<HTMLDivElement> | React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setIsDragging(false);

    let fileName = "Daily_WellTest_RawData.csv";
    let fileSize = "124 KB";

    if (e.type === 'drop') {
      const de = e as React.DragEvent<HTMLDivElement>;
      if (de.dataTransfer.files && de.dataTransfer.files[0]) {
        fileName = de.dataTransfer.files[0].name;
        fileSize = `${(de.dataTransfer.files[0].size / 1024).toFixed(1)} KB`;
      }
    } else {
      const ce = e as React.ChangeEvent<HTMLInputElement>;
      if (ce.target.files && ce.target.files[0]) {
        fileName = ce.target.files[0].name;
        fileSize = `${(ce.target.files[0].size / 1024).toFixed(1)} KB`;
      }
    }

    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0].substring(0, 5)}`;
    const parsedRows = Math.floor(Math.random() * 80) + 10;

    const newFile = {
      name: fileName,
      size: fileSize,
      timestamp: timeStr,
      rowsParsedCount: parsedRows
    };

    setUploadedFiles(prev => [newFile, ...prev]);
    onAudit('Well Log Document Uploaded', `Document '${fileName}' (${fileSize}) ingested and parsed. Detected ${parsedRows} SCADA rows successfully.`);
  };

  return (
    <div id="knowledge-base-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Searchable SPE Library (8 cols) */}
      <div id="spe-papers-explorer" className="lg:col-span-8 flex flex-col justify-between bg-[#0B1120] border border-slate-800 p-5 rounded-xl space-y-4">
        <div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-3 mb-4 gap-3">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono">Grounding RAG Library</h2>
            </div>
            
            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                placeholder="Search specs, categories, terms..."
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#050812] text-xs text-slate-100 font-mono pl-9 pr-3 py-2 border border-slate-800 rounded-lg focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* List side */}
            <div className="md:col-span-2 flex flex-col space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {filteredPapers.map(p => (
                <button
                  key={p.id}
                  onClick={() => setActivePaper(p)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                    activePaper?.id === p.id 
                      ? 'bg-slate-800 border-cyan-500 text-cyan-400' 
                      : 'bg-[#050812] border-slate-850 text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <p className="font-bold text-[10px] text-slate-400 uppercase">{p.code}</p>
                  <p className="font-semibold mt-1 truncate">{p.title}</p>
                  <p className="text-[9px] text-slate-500 mt-2">{p.category} | {p.year}</p>
                </button>
              ))}

              {filteredPapers.length === 0 && (
                <p className="text-xs text-slate-500 font-mono text-center p-4">No matching manuals located.</p>
              )}
            </div>

            {/* Document display side */}
            <div id="spe-document-view" className="md:col-span-3 bg-[#050812] p-4 rounded-lg border border-slate-850 flex flex-col justify-between">
              {activePaper ? (
                <div className="space-y-3">
                  <div className="border-b border-slate-850 pb-2">
                    <span className="text-[9px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-700 uppercase tracking-widest">{activePaper.category}</span>
                    <h3 className="text-sm font-bold text-slate-200 mt-2">{activePaper.title}</h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-1 font-medium">{activePaper.authors} ({activePaper.year})</p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans mt-2">{activePaper.summary}</p>
                  
                  <div className="pt-2 border-t border-slate-850">
                    <p className="text-[9px] text-cyan-400 font-bold font-mono uppercase tracking-widest mb-1.5">Remediation Guidelines</p>
                    <ul className="space-y-1">
                      {activePaper.guidelines.map((g, i) => (
                        <li key={i} className="text-xs text-slate-400 flex items-start space-x-2 font-mono leading-tight">
                          <span className="text-cyan-400 mt-0.5">•</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col justify-center items-center text-slate-500 text-xs font-mono">
                  Select an SPE reference paper to inspect rules.
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 font-mono leading-relaxed bg-[#050812] p-2.5 rounded border border-slate-850">
          *System integration notes: This grounded RAG memory represents an offline indexing equivalent which is directly packed into the server prompt on every AI Copilot handshake for absolute contextual truth.*
        </p>
      </div>

      {/* File Ingestion Drop Zone (4 cols) */}
      <div id="file-ingestion-pane" className="lg:col-span-4 flex flex-col space-y-4">
        {/* Core Drag & Drop Zone */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={triggerMockUpload}
          className={`border-2 border-dashed p-6 rounded-xl text-center flex flex-col justify-center items-center cursor-pointer transition-all ${
            isDragging 
              ? 'border-cyan-500 bg-cyan-950/15' 
              : 'border-slate-800 bg-[#0B1120] hover:border-slate-700'
          }`}
        >
          <input
            type="file"
            id="well-log-file-input"
            className="hidden"
            onChange={triggerMockUpload}
          />
          <label htmlFor="well-log-file-input" className="cursor-pointer flex flex-col items-center">
            <UploadCloud className={`w-8 h-8 mb-3 transition-colors ${isDragging ? 'text-cyan-400' : 'text-slate-500'}`} />
            <h4 className="text-xs font-bold text-slate-200 font-mono tracking-wider mb-1">DATASETS INGESTION</h4>
            <p className="text-[10px] text-slate-400 font-sans leading-tight">Drag and drop Daily reports, logs (.XLSX, .CSV, .PDF) or click to browse</p>
          </label>
        </div>

        {/* List of successfully parsed logs */}
        <div className="bg-[#0B1120] border border-slate-800 p-4 rounded-xl flex-1 flex flex-col justify-between">
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono mb-3 border-b border-slate-800 pb-1.5">Processed Ingests</h4>
            
            <div className="flex flex-col space-y-2 max-h-[160px] overflow-y-auto">
              {uploadedFiles.map((f, i) => (
                <div key={i} className="flex justify-between items-center bg-[#050812] px-2.5 py-2 rounded border border-slate-850 text-xs font-mono">
                  <div className="flex items-center space-x-2 overflow-hidden">
                    {f.name.endsWith('.xlsx') ? (
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                    )}
                    <div className="truncate pr-2">
                      <p className="text-slate-300 font-semibold truncate leading-none mb-1">{f.name}</p>
                      <p className="text-[9px] text-slate-500">{f.size} | {f.timestamp}</p>
                    </div>
                  </div>

                  <span className="text-[9px] bg-emerald-950/40 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900 flex items-center gap-1 shrink-0">
                    <FileCheck className="w-3 h-3" /> {f.rowsParsedCount} OK
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-850 text-[10px] text-slate-500 leading-snug font-mono">
            Files added here are dynamically integrated into the sandbox. You can query their specific parameters within the Chat Copilot.
          </div>
        </div>
      </div>

    </div>
  );
}
