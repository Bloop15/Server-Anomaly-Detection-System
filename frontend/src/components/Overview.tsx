import React, { useMemo } from 'react';
import { useReplay } from '../contexts/ReplayContext';
import { Activity, Database, AlertTriangle, AlertOctagon, Percent } from 'lucide-react';

// ─── Status colour ────────────────────────────────────────────────────────────
const levelStyle = (level: string | undefined) => {
  switch (level) {
    case 'Critical': return { dot: 'bg-red-400',   badge: 'bg-red-400/10 text-red-400 border-red-400/30',   ring: 'border-red-400/20'   };
    case 'Moderate': return { dot: 'bg-amber-400', badge: 'bg-amber-400/10 text-amber-400 border-amber-400/30', ring: 'border-amber-400/20' };
    default:         return { dot: 'bg-[#00d1ff]', badge: 'bg-[#00d1ff]/10 text-[#00d1ff] border-[#00d1ff]/30', ring: 'border-[#00d1ff]/10' };
  }
};

const SERVERS = ['S1', 'S2', 'S3'] as const;

export const Overview: React.FC = () => {
  const { processedData, kpis, filteredDataset, currentIndex } = useReplay();

  // Latest snapshot per server from processedData
  const serverLatest = useMemo(() => {
    return SERVERS.map(id => {
      const rows = processedData.filter(d => d.Server_ID === id);
      const latest = rows[rows.length - 1] ?? null;
      const anomalies = rows.filter(d => d.anomaly_score >= 1).length;
      const totalRows   = rows.length;
      return { id, latest, anomalies, totalRows };
    });
  }, [processedData]);

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-10">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">System Overview</h2>
        <p className="text-sm text-[#bbc9cf] mt-1">
          Live snapshot of all servers up to replay point{' '}
          <span className="font-mono text-[#00d1ff]">{currentIndex + 1}</span>{' '}
          of{' '}
          <span className="font-mono text-[#00d1ff]">{filteredDataset.length}</span>
        </p>
      </div>

      {/* ── Server Cards ─────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-label uppercase tracking-widest text-[#bbc9cf] mb-4">Server Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {serverLatest.map(({ id, latest, anomalies, totalRows }) => {
            const style = levelStyle(latest?.anomaly_level);
            return (
              <div
                key={id}
                className={`bg-[#171b26] border rounded-2xl p-6 flex flex-col gap-5 transition-colors ${style.ring}`}
              >
                {/* Card header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1c1f2a] rounded-xl flex items-center justify-center border border-white/5">
                      <Activity className="w-5 h-5 text-[#00d1ff]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Server {id}</h4>
                      <p className="text-[10px] text-[#bbc9cf] font-mono">{totalRows} pts processed</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${style.dot} ${latest?.anomaly_level === 'Normal' ? '' : 'animate-pulse'}`} />
                    <span className={`text-[10px] font-bold uppercase border rounded-full px-2 py-0.5 ${style.badge}`}>
                      {latest?.anomaly_level ?? 'No data'}
                    </span>
                  </div>
                </div>

                {/* Metrics */}
                {latest ? (
                  <div className="grid grid-cols-3 gap-3">
                    <MetricCell
                      label="CPU"
                      value={`${latest['CPU_Utilization_%'].toFixed(1)}%`}
                      warn={latest['CPU_Utilization_%'] > 80}
                    />
                    <MetricCell
                      label="Memory"
                      value={`${latest['Memory_Utilization_%'].toFixed(1)}%`}
                      warn={latest['Memory_Utilization_%'] > 80}
                    />
                    <MetricCell
                      label="Power"
                      value={`${latest.Power_Usage_Watts}W`}
                      warn={latest.Power_Usage_Watts > 200}
                    />
                  </div>
                ) : (
                  <p className="text-[11px] text-[#bbc9cf] font-mono">— awaiting data —</p>
                )}

                {/* Anomaly mini-bar */}
                <div>
                  <div className="flex justify-between text-[10px] font-label mb-1">
                    <span className="text-[#bbc9cf] uppercase tracking-wider">Anomalies</span>
                    <span className="font-mono text-amber-400">{anomalies}</span>
                  </div>
                  <div className="h-1 bg-[#1c1f2a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${totalRows > 0 ? (anomalies / totalRows) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── System Summary KPIs ────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-label uppercase tracking-widest text-[#bbc9cf] mb-4">System Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            icon={<Database className="w-4 h-4 text-[#00d1ff]" />}
            label="Data Points Processed"
            value={kpis.totalPoints.toLocaleString()}
            sub="index-progressive"
            color="text-[#00d1ff]"
          />
          <SummaryCard
            icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
            label="Total Anomalies"
            value={kpis.totalAnomalies.toLocaleString()}
            sub="score ≥ 1"
            color="text-amber-400"
          />
          <SummaryCard
            icon={<AlertOctagon className="w-4 h-4 text-red-400" />}
            label="Strong Anomalies"
            value={kpis.strongAnomalies.toLocaleString()}
            sub="strong_anomaly = 1"
            color="text-red-400"
          />
          <SummaryCard
            icon={<Percent className="w-4 h-4 text-[#bbc9cf]" />}
            label="Anomaly Rate"
            value={`${kpis.anomalyRate.toFixed(2)}%`}
            sub="anomalies / total"
            color={kpis.anomalyRate > 10 ? 'text-red-400' : 'text-white'}
          />
        </div>
      </section>

      {/* ── Score Distribution ────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-label uppercase tracking-widest text-[#bbc9cf] mb-4">Anomaly Score Distribution</h3>
        <div className="bg-[#171b26] border border-white/5 rounded-2xl p-6 space-y-4">
          {[0, 1, 2, 3, 4].map(score => {
            const count = processedData.filter(d => d.anomaly_score === score).length;
            const pct   = kpis.totalPoints > 0 ? (count / kpis.totalPoints) * 100 : 0;
            const colors = ['#00d1ff', '#4cd6ff', '#ffba20', '#ffd1ce', '#ffb4ab'];
            const labels = ['Safe (0)', 'Minor (1)', 'Suspect (2)', 'Critical (3)', 'Fatal (4)'];
            return (
              <div key={score}>
                <div className="flex justify-between text-[11px] font-label mb-1">
                  <span className="text-[#bbc9cf] uppercase tracking-wide">{labels[score]}</span>
                  <span className="font-mono" style={{ color: colors[score] }}>
                    {count.toLocaleString()} ({pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-1.5 bg-[#0a0e18] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(pct, 0.5)}%`, backgroundColor: colors[score] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Per-model detection count ─────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-label uppercase tracking-widest text-[#bbc9cf] mb-4">Model Detection Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([['Isolation Forest', 'iso_flag'], ['SVM', 'svm_flag'], ['Autoencoder', 'ae_flag'], ['LSTM', 'lstm_flag']] as const).map(([name, field]) => {
            const count = processedData.filter(d => (d as any)[field] === 1).length;
            return (
              <div key={name} className="bg-[#171b26] border border-white/5 rounded-xl p-4">
                <p className="text-[10px] font-label text-[#bbc9cf] uppercase tracking-wider mb-2">{name}</p>
                <p className="text-2xl font-bold font-mono text-white">{count.toLocaleString()}</p>
                <p className="text-[10px] text-[#bbc9cf] mt-1">
                  {kpis.totalPoints > 0 ? ((count / kpis.totalPoints) * 100).toFixed(1) : '0.0'}% of window
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────
const MetricCell: React.FC<{ label: string; value: string; warn?: boolean }> = ({ label, value, warn }) => (
  <div className="bg-[#1c1f2a] rounded-xl p-3 text-center">
    <p className="text-[9px] font-label text-[#bbc9cf] uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-sm font-bold font-mono ${warn ? 'text-amber-400' : 'text-white'}`}>{value}</p>
  </div>
);

const SummaryCard: React.FC<{
  icon: React.ReactNode; label: string; value: string; sub: string; color?: string;
}> = ({ icon, label, value, sub, color = 'text-white' }) => (
  <div className="bg-[#171b26] border border-white/5 rounded-xl p-5">
    <div className="flex justify-between items-start mb-3">
      <span className="text-[10px] font-label text-[#bbc9cf] uppercase tracking-wider">{label}</span>
      {icon}
    </div>
    <div className={`text-3xl font-bold font-mono ${color}`}>{value}</div>
    <div className="text-[10px] text-[#bbc9cf] mt-1">{sub}</div>
  </div>
);
