import { useState, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { parseXlsFile, importToDatabase, downloadImportTemplate, ImportResult, ImportRow, ImportMode, ImportProgress } from '../lib/import';
import { STAGE_LABELS } from '../types';
import {
  X, Upload, FileSpreadsheet, Download, CheckCircle, AlertTriangle,
  AlertCircle, ChevronDown, ChevronUp, Loader2, Info, RefreshCw,
} from 'lucide-react';

type Step = 'upload' | 'preview' | 'importing' | 'done';

interface Props {
  onClose: () => void;
}

export default function ImportModal({ onClose }: Props) {
  const { refresh } = useApp();
  const [step, setStep] = useState<Step>('upload');
  const [parseResult, setParseResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mode, setMode] = useState<ImportMode>('upsert');
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [importDone, setImportDone] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setParseError('Unsupported file type. Please upload an .xlsx, .xls, or .csv file.');
      return;
    }
    setParseError(null);
    setParseResult(null);
    try {
      const result = await parseXlsFile(file);
      setParseResult(result);
      setStep('preview');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse file');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!parseResult) return;
    setStep('importing');
    setProgress({ current: 0, total: parseResult.validCount, currentName: '', errors: [] });

    try {
      const result = await importToDatabase(
        parseResult.rows,
        mode,
        (p) => setProgress(p),
      );
      setImportDone(result);
      await refresh();
      setStep('done');
    } catch (err) {
      setImportDone({ imported: 0, skipped: 0, errors: [String(err)] });
      setStep('done');
    }
  };

  const toggleRow = (rowNum: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(rowNum) ? next.delete(rowNum) : next.add(rowNum);
      return next;
    });
  };

  const validRows = parseResult?.rows.filter(r => !r.errors.length) ?? [];
  const errorRows = parseResult?.rows.filter(r => r.errors.length > 0) ?? [];
  const warnRows = parseResult?.rows.filter(r => r.warnings.length > 0 && !r.errors.length) ?? [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={step !== 'importing' ? onClose : undefined}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0F172A] px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Upload size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Import Suppliers from XLS</h2>
              <p className="text-slate-400 text-xs">
                {step === 'upload' && 'Upload .xlsx / .xls / .csv file'}
                {step === 'preview' && `Preview — ${parseResult?.sheetName}`}
                {step === 'importing' && 'Importing to database...'}
                {step === 'done' && 'Import complete'}
              </p>
            </div>
          </div>
          {step !== 'importing' && (
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex border-b border-slate-200 flex-shrink-0">
          {(['upload', 'preview', 'done'] as const).map((s, i) => (
            <div key={s} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium ${step === s ? 'text-blue-700 border-b-2 border-blue-700' : step === 'importing' && s === 'preview' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${step === s || (step === 'importing' && s === 'preview') || (step === 'done' && i < 2) ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</span>
              {s === 'upload' ? 'Upload File' : s === 'preview' ? 'Preview & Validate' : 'Done'}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Upload Step ── */}
          {step === 'upload' && (
            <div className="p-6 space-y-5">
              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet size={40} className={`mx-auto mb-3 ${dragOver ? 'text-blue-500' : 'text-slate-400'}`} />
                <p className="font-semibold text-slate-800 text-sm">Drop your Excel file here</p>
                <p className="text-slate-400 text-xs mt-1">or click to browse — .xlsx, .xls, .csv supported</p>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileInput} />
              </div>

              {parseError && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-4">
                  <AlertCircle size={15} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{parseError}</p>
                </div>
              )}

              {/* Template download */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Info size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Need a template?</p>
                    <p className="text-xs text-slate-500 mt-0.5">Download the official import template with all columns and example data.</p>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); downloadImportTemplate(); }}
                  className="flex-shrink-0 flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors ml-3"
                >
                  <Download size={12} /> Template
                </button>
              </div>

              {/* Column hints */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-800 mb-2">Accepted column names (flexible matching)</p>
                <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                  {[
                    ['Supplier Name', 'required'], ['Country', 'recommended'], ['Component Category', 'recommended'],
                    ['Programs', 'optional'], ['Current Stage', 'optional'], ['Assigned SSD Member', 'optional'],
                    ['DUNS Number', 'optional'], ['DUNS Validated', 'optional'], ['Legal Entity', 'optional'],
                    ['Contact Name', 'optional'], ['Contact Email', 'optional'], ['Contact Phone', 'optional'],
                    ['ELM Score', 'optional'], ['Blacklist Reason', 'conditional'], ['Blacklisted By', 'conditional'],
                  ].map(([col, req]) => (
                    <div key={col} className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${req === 'required' ? 'bg-red-500' : req === 'recommended' ? 'bg-amber-500' : req === 'conditional' ? 'bg-violet-500' : 'bg-slate-300'}`} />
                      <span className="text-xs text-blue-900 truncate">{col}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Preview Step ── */}
          {(step === 'preview') && parseResult && (
            <div className="p-5 space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <SummaryCard color="emerald" count={parseResult.validCount} label="Ready to import" icon={<CheckCircle size={14} />} />
                <SummaryCard color="amber" count={parseResult.warningCount} label="With warnings" icon={<AlertTriangle size={14} />} />
                <SummaryCard color="red" count={parseResult.errorCount} label="Errors (skipped)" icon={<AlertCircle size={14} />} />
              </div>

              {/* Import mode */}
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Import Mode</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'add_new', label: 'Add New Only', desc: 'Skip suppliers that already exist by name' },
                    { id: 'upsert', label: 'Add + Update', desc: 'Add new suppliers and update existing ones' },
                    { id: 'replace_all', label: 'Replace All', desc: 'Delete all existing suppliers and reimport' },
                  ] as const).map(m => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      className={`text-left p-3 rounded-xl border-2 transition-all ${mode === m.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <p className={`text-xs font-semibold ${mode === m.id ? 'text-blue-700' : 'text-slate-700'}`}>{m.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-tight">{m.desc}</p>
                    </button>
                  ))}
                </div>
                {mode === 'replace_all' && (
                  <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <AlertTriangle size={13} className="text-red-600 flex-shrink-0" />
                    <p className="text-xs text-red-700 font-medium">This will permanently delete all existing suppliers and their activities, timelines, and notes before importing.</p>
                  </div>
                )}
              </div>

              {/* Row table */}
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  All Rows ({parseResult.rows.length})
                </p>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-slate-500 w-8">#</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-500">Supplier Name</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-500">Country</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-500">Stage</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-500">Status</th>
                        <th className="w-6"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parseResult.rows.map(row => {
                        const hasError = row.errors.length > 0;
                        const hasWarn = row.warnings.length > 0;
                        const expanded = expandedRows.has(row.rowNum);
                        return (
                          <>
                            <tr key={row.rowNum} className={`${hasError ? 'bg-red-50' : hasWarn ? 'bg-amber-50/50' : 'bg-white'} hover:bg-slate-50 cursor-pointer transition-colors`} onClick={() => (hasError || hasWarn) && toggleRow(row.rowNum)}>
                              <td className="px-3 py-2 text-slate-400">{row.rowNum}</td>
                              <td className="px-3 py-2 font-medium text-slate-900 truncate max-w-[150px]">{row.parsed?.name ?? row.raw['Supplier Name'] ?? row.raw['name'] ?? '—'}</td>
                              <td className="px-3 py-2 text-slate-600">{row.parsed?.country || '—'}</td>
                              <td className="px-3 py-2 text-slate-600">{row.parsed ? STAGE_LABELS[row.parsed.current_stage] : '—'}</td>
                              <td className="px-3 py-2">
                                {hasError ? (
                                  <span className="flex items-center gap-1 text-red-700 font-medium"><AlertCircle size={11} /> Error</span>
                                ) : hasWarn ? (
                                  <span className="flex items-center gap-1 text-amber-700 font-medium"><AlertTriangle size={11} /> Warning</span>
                                ) : (
                                  <span className="flex items-center gap-1 text-emerald-700 font-medium"><CheckCircle size={11} /> Valid</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {(hasError || hasWarn) && (expanded ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />)}
                              </td>
                            </tr>
                            {expanded && (
                              <tr key={`${row.rowNum}-detail`}>
                                <td colSpan={6} className={`px-4 py-2 ${hasError ? 'bg-red-50' : 'bg-amber-50/30'}`}>
                                  {row.errors.map((e, i) => (
                                    <p key={i} className="text-xs text-red-700 flex items-center gap-1.5 mb-0.5"><AlertCircle size={10} /> {e}</p>
                                  ))}
                                  {row.warnings.map((w, i) => (
                                    <p key={i} className="text-xs text-amber-700 flex items-center gap-1.5 mb-0.5"><AlertTriangle size={10} /> {w}</p>
                                  ))}
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Importing Step ── */}
          {step === 'importing' && progress && (
            <div className="p-10 flex flex-col items-center justify-center">
              <Loader2 size={40} className="text-blue-600 animate-spin mb-4" />
              <p className="text-sm font-semibold text-slate-900 mb-1">Importing suppliers...</p>
              <p className="text-xs text-slate-500 mb-4">{progress.currentName}</p>
              <div className="w-full max-w-sm">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{progress.current} / {progress.total}</span>
                  <span>{Math.round((progress.current / Math.max(progress.total, 1)) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
                  />
                </div>
              </div>
              {progress.errors.length > 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 w-full max-w-sm max-h-28 overflow-y-auto">
                  {progress.errors.slice(-5).map((e, i) => <p key={i} className="text-xs text-red-700">{e}</p>)}
                </div>
              )}
            </div>
          )}

          {/* ── Done Step ── */}
          {step === 'done' && importDone && (
            <div className="p-8">
              <div className={`flex flex-col items-center text-center mb-6 ${importDone.errors.length === 0 ? '' : ''}`}>
                {importDone.imported > 0 ? (
                  <CheckCircle size={48} className="text-emerald-500 mb-3" />
                ) : (
                  <AlertCircle size={48} className="text-red-500 mb-3" />
                )}
                <p className="text-lg font-bold text-slate-900">
                  {importDone.imported > 0 ? 'Import Complete' : 'Import Failed'}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <SummaryCard color="emerald" count={importDone.imported} label="Imported" icon={<CheckCircle size={14} />} />
                <SummaryCard color="amber" count={importDone.skipped} label="Skipped" icon={<AlertTriangle size={14} />} />
                <SummaryCard color="red" count={importDone.errors.length} label="Errors" icon={<AlertCircle size={14} />} />
              </div>
              {importDone.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-800 mb-2">Import Errors</p>
                  {importDone.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-700 mb-0.5">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-5 py-3 flex items-center justify-between flex-shrink-0 bg-slate-50">
          <div className="text-xs text-slate-400">
            {step === 'preview' && parseResult && `${parseResult.rows.length} row${parseResult.rows.length !== 1 ? 's' : ''} parsed from "${parseResult.sheetName}"`}
            {step === 'done' && 'Pipeline board has been refreshed with imported data.'}
          </div>
          <div className="flex gap-2">
            {step === 'preview' && (
              <>
                <button onClick={() => setStep('upload')} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5"><RefreshCw size={12} /> Re-upload</button>
                <button
                  onClick={handleImport}
                  disabled={parseResult.validCount === 0}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Upload size={13} /> Import {parseResult.validCount} supplier{parseResult.validCount !== 1 ? 's' : ''}
                </button>
              </>
            )}
            {step === 'done' && (
              <>
                <button onClick={() => { setStep('upload'); setParseResult(null); setImportDone(null); }} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5"><Upload size={12} /> Import Another</button>
                <button onClick={onClose} className="px-5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors">Close</button>
              </>
            )}
            {step === 'upload' && (
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">Cancel</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ color, count, label, icon }: { color: string; count: number; label: string; icon: React.ReactNode }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber:   'bg-amber-50 border-amber-200 text-amber-700',
    red:     'bg-red-50 border-red-200 text-red-700',
  };
  return (
    <div className={`border rounded-xl p-3 ${colors[color]}`}>
      <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className="text-2xl font-bold">{count}</p>
    </div>
  );
}
