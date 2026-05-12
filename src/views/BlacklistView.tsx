import { useApp } from '../context/AppContext';
import { STAGE_LABELS, ROLE_LABELS, ROLE_COLORS } from '../types';
import { formatDate, formatDateTime } from '../lib/utils';
import { AlertOctagon, Calendar, User, FileText } from 'lucide-react';

export default function BlacklistView() {
  const { suppliers, setSelectedSupplierId } = useApp();
  const blacklisted = [...suppliers.filter(s => s.current_stage === 'blacklisted')]
    .sort((a, b) => new Date(b.blacklisted_at ?? '').getTime() - new Date(a.blacklisted_at ?? '').getTime());

  return (
    <div className="h-[calc(100vh-56px)] overflow-y-auto p-5">
      <div className="max-w-5xl mx-auto">
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-0.5">
            <AlertOctagon size={20} className="text-red-600" />
            <h1 className="text-xl font-bold text-slate-900">Blacklist Registry</h1>
          </div>
          <p className="text-slate-500 text-sm">Permanent, read-only record. {blacklisted.length} entr{blacklisted.length === 1 ? 'y' : 'ies'}.</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 flex items-start gap-2.5">
          <AlertOctagon size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">This registry is immutable. Entries cannot be deleted or edited after submission.</p>
        </div>

        {blacklisted.length === 0 ? (
          <div className="text-center py-20 text-slate-400 bg-white rounded-xl border border-slate-200">
            <AlertOctagon size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No blacklisted suppliers</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Supplier', 'Date Blacklisted', 'Stage at Blacklisting', 'Reason', 'Blacklisted By'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {blacklisted.map(s => {
                  const timelineEntry = (s.timeline ?? []).find(t => t.event_type === 'blacklisted');
                  const stageAtBl = timelineEntry?.from_stage;
                  const blRole = s.blacklisted_by?.toLowerCase().includes('pm') ? 'pm' :
                    s.blacklisted_by?.toLowerCase().includes('buyer') ? 'buyer' :
                    s.blacklisted_by?.toLowerCase().includes('ssd') ? 'ssd' : 'pm';
                  const rc = ROLE_COLORS[blRole as never] ?? ROLE_COLORS.pm;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedSupplierId(s.id)}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.country} · {s.component_category}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                          <Calendar size={12} className="text-slate-400" />
                          {s.blacklisted_at ? formatDate(s.blacklisted_at) : '—'}
                        </div>
                        {s.blacklisted_at && <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(s.blacklisted_at)}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {stageAtBl ? (
                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{STAGE_LABELS[stageAtBl]}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="flex items-start gap-1.5">
                          <FileText size={12} className="text-slate-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-slate-700 line-clamp-2">{s.blacklist_reason || '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-slate-400" />
                          <span className="text-xs text-slate-700">{s.blacklisted_by}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
