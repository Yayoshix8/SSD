import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ScoutingEvent } from '../types';
import { formatDate } from '../lib/utils';
import { Calendar, MapPin, User, Plus, CheckCircle2, Circle, X, Users, ClipboardList, Shield } from 'lucide-react';

export default function EventsView() {
  const { events, suppliers, updateEvent, createEvent, currentRole } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [showAgenda, setShowAgenda] = useState<ScoutingEvent | null>(null);
  const canEdit = currentRole === 'ssd' || currentRole === 'pm';

  return (
    <div className="h-[calc(100vh-56px)] overflow-y-auto p-5">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Scouting Events</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage supplier scouting events and B2B meetings</p>
          </div>
          {canEdit && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors">
              <Plus size={15} /> New Event
            </button>
          )}
        </div>

        {events.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Calendar size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium text-sm">No events yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map(event => (
              <EventCard
                key={event.id}
                event={event}
                supplierCount={suppliers.filter(s => event.supplier_ids?.includes(s.id)).length}
                canEdit={canEdit}
                onUpdate={updateEvent}
                onAgenda={() => setShowAgenda(event)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={createEvent} />}
      {showAgenda && (
        <AgendaModal event={showAgenda} suppliers={suppliers.filter(s => showAgenda.supplier_ids?.includes(s.id))} onClose={() => setShowAgenda(null)} />
      )}
    </div>
  );
}

function EventCard({ event, supplierCount, canEdit, onUpdate, onAgenda }: {
  event: ScoutingEvent; supplierCount: number; canEdit: boolean;
  onUpdate: (id: string, u: Partial<ScoutingEvent>) => void; onAgenda: () => void;
}) {
  const isUpcoming = new Date(event.event_date) > new Date();
  const done = [event.preliminary_list_complete, event.b2b_agenda_complete, event.layout_file_complete].filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-slate-900">{event.name}</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${isUpcoming ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                {isUpcoming ? 'Upcoming' : 'Past'}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><Calendar size={13} />{formatDate(event.event_date)}</span>
              <span className="flex items-center gap-1.5"><MapPin size={13} />{event.location}</span>
              <span className="flex items-center gap-1.5"><User size={13} />{event.organizer}</span>
              <span className="flex items-center gap-1.5"><Users size={13} />{supplierCount} supplier{supplierCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <button onClick={onAgenda} className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors ml-4 flex-shrink-0">
            <ClipboardList size={13} /> Agenda
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Preparation Checklist</p>
            <span className={`text-xs font-medium ${done === 3 ? 'text-emerald-600' : 'text-amber-600'}`}>{done}/3</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Supplier List', key: 'preliminary_list_complete' as const },
              { label: 'B2B Agenda', key: 'b2b_agenda_complete' as const },
              { label: 'Layout File', key: 'layout_file_complete' as const },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => canEdit && onUpdate(event.id, { [item.key]: !event[item.key] })}
                disabled={!canEdit}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all text-left ${
                  event[item.key] ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                } disabled:cursor-default`}
              >
                {event[item.key] ? <CheckCircle2 size={13} className="flex-shrink-0" /> : <Circle size={13} className="flex-shrink-0 text-slate-300" />}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (e: Omit<ScoutingEvent, 'id' | 'created_at' | 'updated_at'>) => Promise<void> }) {
  const [form, setForm] = useState({ name: '', event_date: '', location: '', organizer: '' });
  const [saving, setSaving] = useState(false);
  const valid = form.name && form.event_date && form.location && form.organizer;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    await onCreate({ ...form, supplier_ids: [], preliminary_list_complete: false, b2b_agenda_complete: false, layout_file_complete: false, nda_tracker: {} });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="bg-[#0F172A] px-5 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">New Scouting Event</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          {[
            { label: 'Event Name', key: 'name', type: 'text', ph: 'Paris Automotive Summit 2026' },
            { label: 'Date', key: 'event_date', type: 'date', ph: '' },
            { label: 'Location', key: 'location', type: 'text', ph: 'Paris, France' },
            { label: 'Organizer', key: 'organizer', type: 'text', ph: 'Marie Leclerc' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">{f.label}</label>
              <input
                type={f.type}
                value={form[f.key as keyof typeof form]}
                placeholder={f.ph}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          ))}
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button onClick={handleSubmit} disabled={!valid || saving} className="px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-40">
              {saving ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgendaModal({ event, suppliers, onClose }: { event: ScoutingEvent; suppliers: ReturnType<typeof useApp>['suppliers']; onClose: () => void }) {
  const agenda = [
    { time: '09:00', item: 'Registration & Welcome Coffee' },
    { time: '09:30', item: 'Opening Remarks — SSD Team Lead' },
    { time: '09:45', item: 'Technical Requirements Presentation' },
    { time: '10:30', item: 'Break' },
    { time: '10:45', item: 'B2B Meetings — Session 1' },
    { time: '12:30', item: 'Networking Lunch' },
    { time: '13:30', item: 'B2B Meetings — Session 2' },
    { time: '15:30', item: 'Break' },
    { time: '15:45', item: 'B2B Meetings — Session 3' },
    { time: '17:00', item: 'Closing Remarks & Next Steps' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className="bg-[#0F172A] px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white font-semibold text-sm">B2B Meeting Agenda Template</h2>
            <p className="text-slate-400 text-xs">{event.name} · {formatDate(event.event_date)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <p className="text-xs text-slate-400 mb-0.5">Location</p>
              <p className="font-medium text-slate-800">{event.location}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <p className="text-xs text-slate-400 mb-0.5">Organizer</p>
              <p className="font-medium text-slate-800">{event.organizer}</p>
            </div>
          </div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Schedule</h4>
          <div className="space-y-0 mb-5">
            {agenda.map((a, i) => (
              <div key={i} className="flex gap-4 py-2 border-b border-slate-100 last:border-0">
                <span className="font-mono text-xs font-bold text-blue-700 w-12 flex-shrink-0">{a.time}</span>
                <span className="text-sm text-slate-700">{a.item}</span>
              </div>
            ))}
          </div>
          {suppliers.length > 0 && (
            <>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Invited Suppliers ({suppliers.length})</h4>
              {suppliers.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.component_category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${s.duns_validated ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      <Shield size={9} className="inline mr-0.5" />DUNS
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
