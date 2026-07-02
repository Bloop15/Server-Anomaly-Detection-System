import React from 'react';
import {
  Play, Pause, RotateCcw, Zap, XCircle,
  Activity, LayoutDashboard, LineChart, SearchCode, List,
} from 'lucide-react';
import { useReplay } from '../contexts/ReplayContext';
import type { SpeedOption, ServerFilter, TimeFilter } from '../contexts/ReplayContext';

interface MainLayoutProps {
  children: React.ReactNode;
  currentView: string;
  setCurrentView: (v: string) => void;
}

const NAV = [
  { id: 'overview', icon: List,           label: 'Overview'         },
  { id: 'live',     icon: Activity,       label: 'Live Monitoring'  },
  { id: 'dashboard',icon: LayoutDashboard,label: 'Dashboard'        },
  { id: 'insights', icon: LineChart,      label: 'Model Insights'   },
  { id: 'explorer', icon: SearchCode,     label: 'Anomaly Explorer' },
];

const SERVER_OPTIONS: ServerFilter[] = ['All', 'S1', 'S2', 'S3'];
const TIME_OPTIONS:   TimeFilter[]   = ['Live', '1H', '1D', '1M'];
const SPEED_OPTIONS:  SpeedOption[]  = [1, 2, 5];

export const MainLayout: React.FC<MainLayoutProps> = ({ children, currentView, setCurrentView }) => {
  const {
    isLoading, isPlaying, speed, demoMode, alerts,
    serverFilter, timeFilter, currentIndex, filteredDataset,
    togglePlay, reset, setSpeed, setServerFilter, setTimeFilter,
    startDemoMode, resetDemoMode, clearAlerts, dismissAlert,
  } = useReplay();

  const progress = filteredDataset.length > 0
    ? ((currentIndex + 1) / filteredDataset.length) * 100
    : 0;

  return (
    <div className="flex h-screen bg-[#0a0e18] text-[#dfe2f1] overflow-hidden font-body">

      {/* ── Side Navigation ─────────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 bg-[#0d1120] border-r border-white/5 flex flex-col py-6 px-3 z-20">
        {/* Brand */}
        <div className="px-3 mb-8">
          <h1 className="text-xs font-bold text-[#00d1ff] uppercase tracking-[0.2em] leading-tight">
            Server Anomaly<br/>Monitoring System
          </h1>
          <p className="text-[9px] text-[#bbc9cf] mt-1 leading-tight">Real-Time Multi-Model Detection</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-0.5">
          {NAV.map(item => {
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                disabled={isLoading}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-label uppercase tracking-wider transition-all ${
                  active
                    ? 'text-[#00d1ff] bg-[#00d1ff]/10 border-r-2 border-[#00d1ff]'
                    : 'text-[#bbc9cf] hover:text-white hover:bg-white/5'
                } ${isLoading ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
                {/* Alert badge on overview / live */}
                {alerts.length > 0 && (item.id === 'live' || item.id === 'overview') && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Replay Controls (bottom of sidebar) */}
        <div className="border-t border-white/5 pt-4 space-y-3">
          {/* Server filter */}
          <div>
            <p className="text-[9px] text-[#bbc9cf] uppercase tracking-widest mb-1.5 px-1">Server</p>
            <div className="flex gap-1 flex-wrap">
              {SERVER_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setServerFilter(s)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                    serverFilter === s
                      ? 'bg-[#00d1ff]/20 text-[#00d1ff] border border-[#00d1ff]/30'
                      : 'text-[#bbc9cf] hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Time filter */}
          <div>
            <p className="text-[9px] text-[#bbc9cf] uppercase tracking-widest mb-1.5 px-1">Time Window</p>
            <div className="flex gap-1 flex-wrap">
              {TIME_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => setTimeFilter(t)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                    timeFilter === t
                      ? 'bg-[#00d1ff]/20 text-[#00d1ff] border border-[#00d1ff]/30'
                      : 'text-[#bbc9cf] hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Top Replay Bar ────────────────────────────────────────────── */}
        <header className="h-14 flex-shrink-0 border-b border-white/5 bg-[#0d1120] flex items-center gap-4 px-6 z-10">
          {/* Play / Pause / Reset */}
          <div className="flex items-center bg-[#1c1f2a] rounded-lg p-0.5 gap-0.5">
            <button
              onClick={togglePlay}
              disabled={isLoading || !filteredDataset.length}
              className={`p-2 rounded-md transition-colors ${
                isPlaying
                  ? 'bg-[#00d1ff]/20 text-[#00d1ff]'
                  : 'text-[#bbc9cf] hover:text-white hover:bg-white/5'
              } disabled:opacity-40`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button
              onClick={reset}
              disabled={isLoading}
              className="p-2 rounded-md text-[#bbc9cf] hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Speed selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#bbc9cf] font-label uppercase tracking-wider">Speed</span>
            <div className="flex bg-[#1c1f2a] rounded-lg overflow-hidden border border-white/5">
              {SPEED_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-1.5 text-[10px] font-bold font-mono transition-colors ${
                    speed === s
                      ? 'bg-[#00d1ff]/20 text-[#00d1ff]'
                      : 'text-[#bbc9cf] hover:bg-white/5'
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>

          {/* Progress bar + index */}
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1 max-w-xs h-1.5 bg-[#1c1f2a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00d1ff] rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-[#bbc9cf] whitespace-nowrap">
              {currentIndex + 1} / {filteredDataset.length}
            </span>
          </div>

          {/* Demo Mode */}
          <button
            onClick={demoMode ? resetDemoMode : startDemoMode}
            disabled={isLoading || !filteredDataset.length}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold font-label transition-all active:scale-95 disabled:opacity-40 ${
              demoMode
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-[#00d1ff]/20 text-[#00d1ff] border border-[#00d1ff]/30 hover:bg-[#00d1ff]/30'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {demoMode ? 'Reset Demo' : 'Demo Mode'}
          </button>

          {/* Alert badge */}
          {alerts.length > 0 && (
            <button
              onClick={clearAlerts}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-bold hover:bg-red-500/20 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              {alerts.length} Alert{alerts.length > 1 ? 's' : ''} — Clear
            </button>
          )}

          {/* Live indicator */}
          {isPlaying && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#00d1ff] animate-pulse" />
              <span className="text-[10px] font-mono text-[#00d1ff]">LIVE</span>
            </div>
          )}
        </header>

        {/* ── Page Content ──────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          {isLoading && (
            <div className="absolute inset-0 z-50 bg-[#0a0e18]/90 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-2 border-[#00d1ff]/30 border-t-[#00d1ff] rounded-full animate-spin" />
              <p className="font-mono text-[11px] uppercase tracking-widest text-[#00d1ff] animate-pulse">
                Loading dataset…
              </p>
            </div>
          )}
          {children}
        </main>

        {/* ── Alert Toasts (bottom-right) ───────────────────────────────── */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
          {alerts.map(alert => (
            <AlertToast
              key={alert.id}
              alert={alert}
              onDismiss={dismissAlert}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Alert Toast ───────────────────────────────────────────────────────────────
const AlertToast: React.FC<{ alert: import('../contexts/ReplayContext').UIAlert; onDismiss: (id: string) => void }> = ({
  alert, onDismiss,
}) => {
  React.useEffect(() => {
    const t = setTimeout(() => onDismiss(alert.id), 6000);
    return () => clearTimeout(t);
  }, [alert.id, onDismiss]);

  return (
    <div className="pointer-events-auto toast-enter w-72 bg-[#0d1120] border border-red-500/30 rounded-xl p-4 shadow-2xl flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
        <span className="text-sm">🚨</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <p className="text-[11px] font-bold text-red-400 uppercase tracking-wide">Critical Anomaly</p>
          <button
            onClick={() => onDismiss(alert.id)}
            className="text-[#bbc9cf] hover:text-white text-lg leading-none ml-2"
          >×</button>
        </div>
        <p className="text-[10px] font-mono text-[#dfe2f1] mt-1">
          Server {alert.data.Server_ID} — Score {alert.data.anomaly_score}
        </p>
        <p className="text-[9px] font-mono text-[#bbc9cf] mt-0.5 truncate">{alert.data.Timestamp}</p>
        <p className="text-[9px] text-[#0088cc] mt-0.5">📩 Telegram sent</p>
      </div>
    </div>
  );
};
