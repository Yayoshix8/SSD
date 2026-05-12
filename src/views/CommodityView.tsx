import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { STAGE_LABELS, STAGE_ORDER, COMMODITY_COLORS, COMMODITIES, PipelineStage } from '../types';
import { daysSince, getTrafficLight } from '../lib/utils';
import { Layers, ChevronRight, MapPin, Clock, TrendingUp, Users, CheckCircle, AlertTriangle, BarChart3, Grid3x3 as Grid3X3 } from 'lucide-react';

type SubView = 'overview' | 'detail';

export default function CommodityView() {
  const { suppliers, setSelectedSupplierId } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [subView, setSubView] = useState<SubView>('overview');

  // Build commodity map from live supplier data
  const commodityMap = useMemo(() => {
    const map = new Map<string, typeof suppliers>();
    for (const s of suppliers) {
      const key = s.commodity || 'Unassigned';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [suppliers]);

  // Sort: known COMMODITIES first, then others
  const sortedCommodities = useMemo(() => {
    const keys = [...commodityMap.keys()];
    return [
      ...COMMODITIES.filter(c => keys.includes(c)),
      ...keys.filter(k => !COMMODITIES.includes(k as never) && k !== 'Unassigned'),
      ...(keys.includes('Unassigned') ? ['Unassigned'] : []),
    ];
  }, [commodityMap]);

  const selectedSuppliers = selected ? (commodityMap.get(selected) ?? []) : [];

  const handleSelectCommodity = (c: string) => {
    setSelected(c);
    setSubView('detail');
  };

  return (
    <div className="h-[calc(100vh-56px)] overflow-y-auto p-5">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Layers size={20} className="text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900">Commodity Analytics</h1>
            </div>
            <p className="text-slate-500 text-sm">Pipeline performance by commodity family</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => { setSubView('overview'); setSelected(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${subView === 'overview' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Grid3X3 size={12} /> Overview
            </button>
            {selected && (
              <button
                onClick={() => setSubView('detail')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${subView === 'detail' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <BarChart3 size={12} /> {selected}
              </button>
            )}
          </div>
        </div>

        {/* Global KPI strip */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Suppliers', value: suppliers.length, color: 'bg-blue-600', Icon: Users },
            { label: 'Active Commodities', value: sortedCommodities.filter(c => c !== 'Unassigned').length, color: 'bg-teal-600', Icon: Layers },
            { label: 'In Evaluation', value: suppliers.filter(s => ['parking_lot','preliminary_evaluation','b2b_evaluation'].includes(s.current_stage)).length, color: 'bg-amber-500', Icon: TrendingUp },
            { label: 'Qualified (RFQ+)', value: suppliers.filter(s => ['rfq','investigation_record'].includes(s.current_stage)).length, color: 'bg-emerald-600', Icon: CheckCircle },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className={`w-9 h-9 ${k.color} rounded-lg flex items-center justify-center mb-2.5`}>
                <k.Icon size={16} className="text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{k.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Overview grid */}
        {subView === 'overview' && (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            {sortedCommodities.map(comm => (
              <CommodityCard
                key={comm}
                commodity={comm}
                suppliers={commodityMap.get(comm) ?? []}
                onClick={() => handleSelectCommodity(comm)}
              />
            ))}
            {sortedCommodities.length === 0 && (
              <div className="col-span-3 text-center py-16 text-slate-400">
                <Layers size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-sm">No commodities assigned yet</p>
                <p className="text-xs mt-1">Open any supplier and set the commodity in the Overview tab.</p>
              </div>
            )}
          </div>
        )}

        {/* Detail view */}
        {subView === 'detail' && selected && (
          <CommodityDetail
            commodity={selected}
            suppliers={selectedSuppliers}
            onBack={() => setSubView('overview')}
            onSupplierClick={id => setSelectedSupplierId(id)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Commodity Card ───────────────────────────────────────────────────────────

function CommodityCard({ commodity, suppliers, onClick }: {
  commodity: string; suppliers: typeof import('../types').COMMODITIES;
  onClick: () => void;
}) {
  const clr = COMMODITY_COLORS[commodity] ?? COMMODITY_COLORS['Other'];
  const active = (suppliers as unknown as ReturnType<typeof useApp>['suppliers']).filter(s => s.current_stage !== 'blacklisted');
  const blacklisted = (suppliers as unknown as ReturnType<typeof useApp>['suppliers']).filter(s => s.current_stage === 'blacklisted');
  const qualified = (suppliers as unknown as ReturnType<typeof useApp>['suppliers']).filter(s => ['rfq','investigation_record'].includes(s.current_stage));
  const overdue = (suppliers as unknown as ReturnType<typeof useApp>['suppliers']).filter(s => getTrafficLight(s) === 'red');

  // Stage distribution bar data
  const stageCounts = STAGE_ORDER.filter(st => st !== 'blacklisted').map(st => ({
    stage: st,
    count: (suppliers as unknown as ReturnType<typeof useApp>['suppliers']).filter(s => s.current_stage === st).length,
  })).filter(x => x.count > 0);

  const countries = [...new Set((suppliers as unknown as ReturnType<typeof useApp>['suppliers']).map(s => s.country).filter(Boolean))];

  return (
    <div
      className={`bg-white rounded-xl border-2 ${clr.border} shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden`}
      onClick={onClick}
    >
      {/* Header */}
      <div className={`px-4 py-3 ${clr.bg} border-b ${clr.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${clr.dot}`} />
            <span className={`font-bold text-sm ${clr.text}`}>{commodity}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold ${clr.text}`}>{(suppliers as unknown[]).length}</span>
            <ChevronRight size={13} className={`${clr.text} opacity-60 group-hover:translate-x-0.5 transition-transform`} />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <StatBox label="Active" value={active.length} color="text-blue-700" />
          <StatBox label="Qualified" value={qualified.length} color="text-emerald-700" />
          <StatBox label="Overdue" value={overdue.length} color={overdue.length > 0 ? 'text-red-700' : 'text-slate-400'} />
        </div>

        {/* Stage distribution */}
        {stageCounts.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-1.5 font-medium">Pipeline distribution</p>
            <div className="flex gap-0.5 h-5 rounded overflow-hidden">
              {stageCounts.map(({ stage, count }) => {
                const pct = Math.round((count / (suppliers as unknown[]).length) * 100);
                const stageColor: Record<PipelineStage, string> = {
                  form_submitted: 'bg-violet-500',
                  new_supplier_identified: 'bg-slate-400',
                  scouting_event_prep: 'bg-blue-500',
                  b2b_evaluation: 'bg-blue-700',
                  parking_lot: 'bg-amber-500',
                  preliminary_evaluation: 'bg-orange-500',
                  rfq: 'bg-emerald-600',
                  investigation_record: 'bg-teal-600',
                  blacklisted: 'bg-red-600',
                };
                return (
                  <div
                    key={stage}
                    className={`${stageColor[stage]} rounded-sm`}
                    style={{ width: `${pct}%` }}
                    title={`${STAGE_LABELS[stage]}: ${count}`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1.5">
              {stageCounts.map(({ stage, count }) => (
                <span key={stage} className="text-xs text-slate-500">{STAGE_LABELS[stage]}: <span className="font-semibold text-slate-700">{count}</span></span>
              ))}
            </div>
          </div>
        )}

        {/* Countries */}
        {countries.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <MapPin size={10} className="text-slate-400" />
            {countries.slice(0, 4).map(c => (
              <span key={c} className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{c}</span>
            ))}
            {countries.length > 4 && <span className="text-xs text-slate-400">+{countries.length - 4}</span>}
          </div>
        )}

        {blacklisted.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1">
            <AlertTriangle size={10} />{blacklisted.length} blacklisted supplier{blacklisted.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Commodity Detail ─────────────────────────────────────────────────────────

function CommodityDetail({ commodity, suppliers, onBack, onSupplierClick }: {
  commodity: string;
  suppliers: ReturnType<typeof useApp>['suppliers'];
  onBack: () => void;
  onSupplierClick: (id: string) => void;
}) {
  const clr = COMMODITY_COLORS[commodity] ?? COMMODITY_COLORS['Other'];
  const [stageFilter, setStageFilter] = useState<PipelineStage | null>(null);

  const activeStages = [...new Set(suppliers.map(s => s.current_stage))];

  const filtered = stageFilter ? suppliers.filter(s => s.current_stage === stageFilter) : suppliers;

  // Subcategory breakdown
  const subcategoryMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of suppliers) {
      const key = s.commodity_subcategory || 'General';
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [suppliers]);

  // Country breakdown
  const countryMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of suppliers) {
      if (s.country) m.set(s.country, (m.get(s.country) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [suppliers]);

  // Stage breakdown
  const stageBreakdown = STAGE_ORDER.map(st => ({
    stage: st,
    count: suppliers.filter(s => s.current_stage === st).length,
  })).filter(x => x.count > 0);

  const maxCount = Math.max(...stageBreakdown.map(x => x.count), 1);

  return (
    <div>
      {/* Breadcrumb */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4">
        <ChevronRight size={13} className="rotate-180" /> Back to overview
        <span className="text-slate-300 mx-1">·</span>
        <span className={`flex items-center gap-1.5 font-semibold ${clr.text}`}>
          <span className={`w-2 h-2 rounded-full ${clr.dot}`} />
          {commodity}
        </span>
        <span className="text-slate-400 text-xs ml-1">({suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''})</span>
      </button>

      <div className="grid grid-cols-3 gap-4 mb-5">
        {/* Stage funnel */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-blue-600" /> Pipeline Funnel
          </h3>
          <div className="space-y-2">
            {stageBreakdown.map(({ stage, count }) => {
              const pct = Math.round((count / maxCount) * 100);
              const stageBarColor: Record<PipelineStage, string> = {
                form_submitted: 'bg-violet-500',
                new_supplier_identified: 'bg-slate-400',
                scouting_event_prep: 'bg-blue-500',
                b2b_evaluation: 'bg-blue-700',
                parking_lot: 'bg-amber-500',
                preliminary_evaluation: 'bg-orange-500',
                rfq: 'bg-emerald-600',
                investigation_record: 'bg-teal-600',
                blacklisted: 'bg-red-600',
              };
              return (
                <button
                  key={stage}
                  onClick={() => setStageFilter(stageFilter === stage ? null : stage)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left ${stageFilter === stage ? 'bg-blue-50 ring-1 ring-blue-300' : 'hover:bg-slate-50'}`}
                >
                  <span className="text-xs text-slate-500 w-36 flex-shrink-0 truncate">{STAGE_LABELS[stage]}</span>
                  <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                    <div className={`h-full ${stageBarColor[stage]} rounded transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-5 text-right">{count}</span>
                </button>
              );
            })}
          </div>
          {stageFilter && (
            <button onClick={() => setStageFilter(null)} className="mt-2 text-xs text-blue-700 hover:text-blue-900 flex items-center gap-1">
              Clear stage filter
            </button>
          )}
        </div>

        {/* Right column: subcategories + countries */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Subcategories</h3>
            <div className="space-y-1.5">
              {subcategoryMap.map(([sub, count]) => (
                <div key={sub} className="flex items-center justify-between">
                  <span className="text-xs text-slate-700 truncate">{sub}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${clr.bg} ${clr.text}`}>{count}</span>
                </div>
              ))}
              {subcategoryMap.length === 0 && <p className="text-xs text-slate-400">No subcategories</p>}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">By Country</h3>
            <div className="space-y-1.5">
              {countryMap.map(([country, count]) => (
                <div key={country} className="flex items-center justify-between">
                  <span className="text-xs text-slate-700 flex items-center gap-1"><MapPin size={9} className="text-slate-400" />{country}</span>
                  <span className="text-xs font-bold text-slate-600">{count}</span>
                </div>
              ))}
              {countryMap.length === 0 && <p className="text-xs text-slate-400">No data</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Supplier table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">
            Suppliers
            {stageFilter && <span className="ml-2 text-xs text-blue-700 font-medium">— filtered: {STAGE_LABELS[stageFilter]}</span>}
          </h3>
          <span className="text-xs text-slate-400">{filtered.length} of {suppliers.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Supplier', 'Country', 'Subcategory', 'Component', 'Stage', 'Days', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(s => {
                const light = getTrafficLight(s);
                const days = daysSince(s.stage_entered_at);
                const lightDot: Record<string, string> = {
                  green: 'bg-emerald-500', amber: 'bg-amber-400', red: 'bg-red-500'
                };
                return (
                  <tr
                    key={s.id}
                    className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                    onClick={() => onSupplierClick(s.id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 truncate max-w-[160px]">{s.name}</p>
                      {s.programs.length > 0 && <p className="text-xs text-slate-400 truncate">{s.programs.slice(0, 2).join(', ')}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <span className="flex items-center gap-1"><MapPin size={10} className="text-slate-400" />{s.country || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{s.commodity_subcategory || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[120px] truncate">{s.component_category || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded whitespace-nowrap">{STAGE_LABELS[s.current_stage]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs text-slate-600"><Clock size={10} className="text-slate-400" />{days}d</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${lightDot[light]}`} />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">No suppliers match the current filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
