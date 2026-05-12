import { ReactNode, useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, ROLE_LABELS, ROLE_FULL_LABELS, ROLE_COLORS } from '../types';
import { Building2, LayoutDashboard, Calendar, BarChart3, AlertOctagon, Bell, ChevronDown, X, Check, Download, Upload, Layers, PlusCircle, QrCode, Copy } from 'lucide-react';
import { formatDateTime } from '../lib/utils';
import ExportModal from './ExportModal';
import ImportModal from './ImportModal';
import NewSupplierModal from './NewSupplierModal';

export type View = 'pipeline' | 'commodity' | 'events' | 'weekly' | 'blacklist';

interface LayoutProps {
  children: ReactNode;
  activeView: View;
  onViewChange: (v: View) => void;
}

const NAV_ITEMS: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'pipeline',  label: 'Pipeline',   icon: LayoutDashboard },
  { id: 'commodity', label: 'Commodity',  icon: Layers },
  { id: 'events',    label: 'Events',     icon: Calendar },
  { id: 'weekly',    label: 'Weekly Review', icon: BarChart3 },
  { id: 'blacklist', label: 'Blacklist',  icon: AlertOctagon },
];

const ROLE_HEADER_COLORS: Record<UserRole, string> = {
  ssd:   'bg-blue-600 hover:bg-blue-700',
  pm:    'bg-violet-600 hover:bg-violet-700',
  buyer: 'bg-emerald-600 hover:bg-emerald-700',
  sqd:   'bg-orange-600 hover:bg-orange-700',
};

export default function Layout({ children, activeView, onViewChange }: LayoutProps) {
  const { currentRole, setCurrentRole, notifications, markNotificationsRead } = useApp();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);

  const myNotifs = notifications.filter(n => n.target_role === currentRole);
  const unread = myNotifs.filter(n => !n.is_read);

  const handleBell = () => {
    setShowNotifs(v => !v);
    setShowRoles(false);
    if (unread.length > 0) markNotificationsRead(currentRole);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-[#0F172A] text-white z-40 relative flex-shrink-0">
        <div className="px-5 h-14 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 bg-blue-500 rounded-md flex items-center justify-center">
              <Building2 size={15} />
            </div>
            <div className="leading-tight">
              <span className="font-bold text-white text-sm tracking-tight">Supplier Scouting and Dev Pipeline</span>
              <span className="text-slate-500 text-xs ml-1.5">Nexteer Automotive</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-0.5">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon size={13} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right: bell + role */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* QR form link */}
            <button
              onClick={() => { setShowQr(true); setShowNotifs(false); setShowRoles(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors border border-white/10"
              title="Supplier self-registration QR link"
            >
              <QrCode size={13} />
            </button>

            {/* Register supplier */}
            <button
              onClick={() => { setShowRegister(true); setShowNotifs(false); setShowRoles(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors"
            >
              <PlusCircle size={13} /> Register
            </button>

            {/* Import */}
            <button
              onClick={() => { setShowImport(true); setShowNotifs(false); setShowRoles(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors border border-white/10"
            >
              <Upload size={13} /> Import
            </button>

            {/* Export */}
            <button
              onClick={() => { setShowExport(true); setShowNotifs(false); setShowRoles(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors border border-white/10"
            >
              <Download size={13} /> Export
            </button>

            {/* Bell */}
            <div className="relative">
              <button
                onClick={handleBell}
                className="relative w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Bell size={15} />
                {unread.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <span className="text-sm font-semibold text-slate-800">Notifications</span>
                    <button onClick={() => setShowNotifs(false)} className="text-slate-400 hover:text-slate-700"><X size={14} /></button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {myNotifs.length === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-8">No notifications</p>
                    ) : myNotifs.slice(0, 20).map(n => (
                      <div key={n.id} className={`px-4 py-3 ${n.is_read ? 'opacity-60' : 'bg-blue-50/50'}`}>
                        <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatDateTime(n.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Role switcher */}
            <div className="relative">
              <button
                onClick={() => { setShowRoles(v => !v); setShowNotifs(false); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold text-white transition-all ${ROLE_HEADER_COLORS[currentRole]}`}
              >
                <span>{ROLE_LABELS[currentRole]}</span>
                <span className="text-white/60 text-xs hidden sm:block">— {ROLE_FULL_LABELS[currentRole]}</span>
                <ChevronDown size={12} />
              </button>
              {showRoles && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Switch Role (Demo)</p>
                  </div>
                  {(['ssd','pm','buyer','sqd'] as UserRole[]).map(role => {
                    const c = ROLE_COLORS[role];
                    return (
                      <button
                        key={role}
                        onClick={() => { setCurrentRole(role); setShowRoles(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${currentRole === role ? 'bg-slate-100' : ''}`}
                      >
                        <span className={`w-6 h-6 rounded-md ${c.solid} flex items-center justify-center text-white text-xs font-bold`}>
                          {role.toUpperCase().slice(0,2)}
                        </span>
                        <div>
                          <p className={`text-sm font-semibold ${c.text}`}>{ROLE_LABELS[role]}</p>
                          <p className="text-xs text-slate-400">{ROLE_FULL_LABELS[role]}</p>
                        </div>
                        {currentRole === role && <Check size={14} className="ml-auto text-emerald-500" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">{children}</main>
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {showRegister && (
        <NewSupplierModal
          onClose={() => setShowRegister(false)}
          onCreated={() => { setShowRegister(false); }}
        />
      )}
      {showQr && (
        <QrModal
          onClose={() => setShowQr(false)}
          copied={qrCopied}
          onCopy={() => {
            const url = `${window.location.origin}/register`;
            navigator.clipboard.writeText(url).then(() => {
              setQrCopied(true);
              setTimeout(() => setQrCopied(false), 2000);
            });
          }}
        />
      )}
    </div>
  );
}

// ─── QR Modal ─────────────────────────────────────────────────────────────────

function QrModal({ onClose, onCopy, copied }: { onClose: () => void; onCopy: () => void; copied: boolean }) {
  const registerUrl = `${window.location.origin}/?register`;
  // Use a free QR API to render the code — no package needed
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(registerUrl)}&margin=10`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-[#0F172A] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode size={16} className="text-blue-400" />
            <p className="text-white font-semibold text-sm">Supplier Registration Link</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={15} /></button>
        </div>

        <div className="p-6 text-center space-y-4">
          <p className="text-slate-500 text-sm">Share this QR code or link with suppliers so they can self-register directly.</p>

          <div className="flex justify-center">
            <div className="border-4 border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <img src={qrSrc} alt="Registration QR Code" width={200} height={200} className="block" />
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
            <span className="text-xs text-slate-600 truncate flex-1 font-mono">{registerUrl}</span>
            <button
              onClick={onCopy}
              className={`flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-all ${
                copied ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700 text-left space-y-1">
            <p className="font-semibold">How it works:</p>
            <p>1. Supplier scans QR or opens the link</p>
            <p>2. They fill in company, commodity &amp; contact details</p>
            <p>3. Their registration appears in the <span className="font-semibold">Incoming Requests</span> column</p>
            <p>4. SSD team reviews and accepts into the pipeline</p>
          </div>
        </div>
      </div>
    </div>
  );
}
