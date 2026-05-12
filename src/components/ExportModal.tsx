import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { exportPipelineReport, exportEventsReport } from '../lib/export';
import { X, Download, FileSpreadsheet, LayoutDashboard, Calendar, Database, CheckCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
}

type ExportOption = {
  id: string;
  title: string;
  description: string;
  sheets: string[];
  icon: typeof FileSpreadsheet;
  action: () => void;
};

export default function ExportModal({ onClose }: Props) {
  const { suppliers, events } = useApp();
  const [exporting, setExporting] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const run = async (id: string, fn: () => void) => {
    setExporting(id);
    await new Promise(r => setTimeout(r, 200));
    fn();
    setExporting(null);
    setDone(id);
    setTimeout(() => setDone(null), 2500);
  };

  const options: ExportOption[] = [
    {
      id: 'pipeline',
      title: 'Full Pipeline Report',
      description: `All ${suppliers.length} suppliers — overview, activities, approvals, consultations, timeline, and blacklist.`,
      sheets: ['Pipeline Overview', 'RASIC Activities', 'Dual Approvals', 'Consultations', 'Timeline', 'Blacklist Registry'],
      icon: LayoutDashboard,
      action: () => exportPipelineReport(suppliers),
    },
    {
      id: 'events',
      title: 'Scouting Events Report',
      description: `${events.length} event${events.length !== 1 ? 's' : ''} with preparation status, supplier lists, and agenda details.`,
      sheets: ['Scouting Events'],
      icon: Calendar,
      action: () => exportEventsReport(events, suppliers),
    },
    {
      id: 'activities',
      title: 'RASIC Activities Export',
      description: 'All checklist activities across every supplier and stage, with completion status and responsible roles.',
      sheets: ['RASIC Activities'],
      icon: Database,
      action: () => {
        const { utils, writeFile } = require('xlsx') as typeof import('xlsx');
        const rows: Record<string, string>[] = [];
        for (const s of suppliers) {
          for (const a of s.activities ?? []) {
            rows.push({
              'Supplier': s.name, 'Country': s.country, 'Stage': a.stage,
              'Activity': a.activity_label,
              'Responsible': (a.responsible_roles ?? []).join(', '),
              'Accountable': (a.accountable_roles ?? []).join(', '),
              'Consulted': (a.consulted_roles ?? []).join(', '),
              'Gate': a.is_gate ? 'Yes' : 'No',
              'Dual Approval': a.requires_dual_approval ? 'Yes' : 'No',
              'Status': a.is_complete ? 'Complete' : 'Pending',
              'Completed By': a.completed_by || '',
              'Completed At': a.completed_at ? new Date(a.completed_at).toLocaleString('en-GB') : '',
            });
          }
        }
        const wb = utils.book_new();
        const ws = utils.json_to_sheet(rows.length ? rows : [{ Note: 'No activities' }]);
        utils.book_append_sheet(wb, ws, 'RASIC Activities');
        const date = new Date().toISOString().split('T')[0];
        writeFile(wb, `SSD_Activities_${date}.xlsx`);
      },
    },
    {
      id: 'blacklist',
      title: 'Blacklist Registry Export',
      description: `${suppliers.filter(s => s.current_stage === 'blacklisted').length} blacklisted supplier${suppliers.filter(s => s.current_stage === 'blacklisted').length !== 1 ? 's' : ''} — immutable registry export.`,
      sheets: ['Blacklist Registry'],
      icon: FileSpreadsheet,
      action: () => {
        const { utils, writeFile } = require('xlsx') as typeof import('xlsx');
        const rows = suppliers.filter(s => s.current_stage === 'blacklisted').map(s => ({
          'Supplier Name': s.name, 'Country': s.country,
          'Component Category': s.component_category,
          'Programs': s.programs.join(', '),
          'Blacklist Reason': s.blacklist_reason,
          'Blacklisted By': s.blacklisted_by,
          'Blacklisted At': s.blacklisted_at ? new Date(s.blacklisted_at).toLocaleString('en-GB') : '',
          'Stage at Blacklisting': (() => {
            const t = (s.timeline ?? []).find(x => x.event_type === 'blacklisted');
            return t?.from_stage ?? '';
          })(),
        }));
        const wb = utils.book_new();
        const ws = utils.json_to_sheet(rows.length ? rows : [{ Note: 'No blacklisted suppliers' }]);
        utils.book_append_sheet(wb, ws, 'Blacklist Registry');
        const date = new Date().toISOString().split('T')[0];
        writeFile(wb, `SSD_Blacklist_${date}.xlsx`);
      },
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-[#0F172A] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <FileSpreadsheet size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Export Reports</h2>
              <p className="text-slate-400 text-xs">Download as Excel (.xlsx)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
        </div>

        {/* Options */}
        <div className="p-4 space-y-2.5">
          {options.map(opt => {
            const Icon = opt.icon;
            const isExporting = exporting === opt.id;
            const isDone = done === opt.id;
            return (
              <div key={opt.id} className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all">
                <div className="w-9 h-9 bg-white border border-slate-200 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Icon size={16} className="text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{opt.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {opt.sheets.map(s => (
                      <span key={s} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => run(opt.id, opt.action)}
                  disabled={!!exporting}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${
                    isDone
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-blue-700 hover:bg-blue-800 text-white'
                  }`}
                >
                  {isExporting ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Exporting...</>
                  ) : isDone ? (
                    <><CheckCircle size={13} /> Done</>
                  ) : (
                    <><Download size={13} /> Export</>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-5 pb-4">
          <p className="text-xs text-slate-400 text-center">Files are generated client-side and downloaded directly to your device.</p>
        </div>
      </div>
    </div>
  );
}
