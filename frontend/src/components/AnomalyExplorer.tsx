import React, { useState, useMemo } from 'react';
import { useReplay } from '../contexts/ReplayContext';
import type { TelemetryData, ServerFilter } from '../contexts/ReplayContext';
import { Eye, X } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
} from 'recharts';

const ITEMS_PER_PAGE = 10;

const levelBadge = (level: string) => {
  switch (level) {
    case 'Critical': return 'text-red-400 bg-red-400/10 border-red-400/30';
    case 'Moderate': return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
    default:         return 'text-[#00d1ff] bg-[#00d1ff]/10 border-[#00d1ff]/30';
  }
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal: React.FC<{
  data: TelemetryData;
  context: TelemetryData[];
  onClose: () => void;
}> = ({ data, context, onClose }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <div className="relative w-full max-w-2xl bg-[#0d1120] border border-white/10 rounded-2xl shadow-2xl p-7 z-10 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <span className={`text-[10px] font-bold uppercase border rounded-full px-2 py-0.5 ${levelBadge(data.anomaly_level)}`}>
            {data.anomaly_level}
          </span>
          <h3 className="text-xl font-bold text-white mt-2">Server {data.Server_ID}</h3>
          <p className="text-[11px] font-mono text-[#bbc9cf] mt-0.5">{data.Timestamp}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <X className="w-5 h-5 text-[#bbc9cf]" />
        </button>
      </div>

      {/* Context chart */}
      <div className="bg-[#171b26] rounded-xl p-4">
        <p className="text-[10px] font-label text-[#bbc9cf] uppercase tracking-widest mb-3">
          CPU — ±25 point context window
        </p>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={context} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <XAxis dataKey="Timestamp" tick={false} axisLine={false} />
              <YAxis hide domain={['auto', 'dataMax + 10']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0d1120', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 10 }}
                itemStyle={{ color: '#00d1ff' }}
                formatter={(v: any) => [`${v}%`, 'CPU']}
              />
              <Line
                type="monotone" dataKey="CPU_Utilization_%" name="CPU %"
                stroke="#00d1ff" strokeWidth={1.5} dot={false} isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'CPU',    value: `${data['CPU_Utilization_%']}%`      },
          { label: 'Memory', value: `${data['Memory_Utilization_%']}%`   },
          { label: 'Power',  value: `${data.Power_Usage_Watts}W`         },
        ].map(m => (
          <div key={m.label} className="bg-[#171b26] rounded-xl p-4 text-center">
            <p className="text-[9px] font-label text-[#bbc9cf] uppercase tracking-wide">{m.label}</p>
            <p className="text-xl font-bold font-mono text-white mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Model flags */}
      <div>
        <p className="text-[10px] font-label text-[#bbc9cf] uppercase tracking-widest mb-2">Model Flags</p>
        <div className="flex flex-wrap gap-2">
          {([
            ['Isolation Forest', data.iso_flag  === 1],
            ['SVM',              data.svm_flag  === 1],
            ['Autoencoder',      data.ae_flag   === 1],
            ['LSTM',             data.lstm_flag === 1],
          ] as [string, boolean][]).map(([name, flagged]) => (
            <span
              key={name}
              className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                flagged
                  ? 'bg-red-400/10 text-red-400 border-red-400/30'
                  : 'bg-[#0a0e18] text-[#bbc9cf] border-white/10'
              }`}
            >
              {flagged ? '✓ ' : '✗ '}{name}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-[#bbc9cf] mt-2 font-mono">
          anomaly_score: <span className="text-amber-400 font-bold">{data.anomaly_score}</span>
          &nbsp;|&nbsp; strong_anomaly: <span className={data.strong_anomaly === 1 ? 'text-red-400 font-bold' : ''}>{data.strong_anomaly}</span>
        </p>
      </div>

      <button
        onClick={onClose}
        className="w-full py-2.5 bg-[#171b26] hover:bg-[#1c1f2a] border border-white/5 rounded-xl text-sm text-[#bbc9cf] transition-colors"
      >
        Close
      </button>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const AnomalyExplorer: React.FC = () => {
  const {
    processedData, fullDataset,
  } = useReplay();

  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState<TelemetryData | null>(null);
  const [scoreMin, setScoreMin] = useState<number>(1);   // filter by min score
  const [localServer, setLocalServer] = useState<ServerFilter | 'current'>('current');

  // Determine which dataset to filter against
  const baseData = localServer === 'current'
    ? processedData
    : localServer === 'All'
      ? processedData
      : processedData.filter(d => d.Server_ID === localServer);

  const anomalies = useMemo(() => {
    return baseData
      .filter(d => d.anomaly_score >= scoreMin)
      .reverse();
  }, [baseData, scoreMin]);

  const totalPages = Math.max(1, Math.ceil(anomalies.length / ITEMS_PER_PAGE));
  const pageData   = anomalies.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Context window for selected row
  const getContext = (d: TelemetryData): TelemetryData[] => {
    const idx = fullDataset.findIndex(
      r => r.Timestamp === d.Timestamp && r.Server_ID === d.Server_ID
    );
    if (idx < 0) return [d];
    return fullDataset.slice(Math.max(0, idx - 25), Math.min(fullDataset.length, idx + 26));
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-white">Anomaly Explorer</h2>
        <p className="text-sm text-[#bbc9cf] mt-1">
          Browse all detected anomalies in the current replay window. Click a row to inspect.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        {/* Score filter */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-label text-[#bbc9cf] uppercase tracking-wider">Min Score</label>
          <div className="flex bg-[#171b26] rounded-lg overflow-hidden border border-white/5">
            {[1, 2, 3].map(s => (
              <button
                key={s}
                onClick={() => { setScoreMin(s); setPage(1); }}
                className={`px-3 py-1.5 text-[10px] font-mono font-bold transition-colors ${
                  scoreMin === s ? 'bg-[#00d1ff]/20 text-[#00d1ff]' : 'text-[#bbc9cf] hover:bg-white/5'
                }`}
              >
                ≥{s}
              </button>
            ))}
          </div>
        </div>

        {/* Server filter (local override) */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-label text-[#bbc9cf] uppercase tracking-wider">Server</label>
          <div className="flex bg-[#171b26] rounded-lg overflow-hidden border border-white/5">
            {(['All', 'S1', 'S2', 'S3'] as const).map(s => (
              <button
                key={s}
                onClick={() => { setLocalServer(s); setPage(1); }}
                className={`px-2.5 py-1.5 text-[10px] font-mono font-bold transition-colors ${
                  localServer === s ? 'bg-[#00d1ff]/20 text-[#00d1ff]' : 'text-[#bbc9cf] hover:bg-white/5'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <span className="ml-auto text-[10px] font-mono text-[#bbc9cf]">
          {anomalies.length.toLocaleString()} rows
        </span>
      </div>

      {/* Table */}
      <div className="bg-[#171b26] border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#1c1f2a] border-b border-white/5">
              {['Timestamp', 'Server ID', 'anomaly_score', 'anomaly_level', ''].map(h => (
                <th key={h} className="px-5 py-3 text-[10px] font-label uppercase tracking-widest text-[#bbc9cf]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pageData.map((a, i) => {
              const badge = levelBadge(a.anomaly_level);
              return (
                <tr
                  key={i}
                  className="hover:bg-white/5 cursor-pointer transition-colors group"
                  onClick={() => setSelected(a)}
                >
                  <td className="px-5 py-4 text-[11px] font-mono text-[#bbc9cf]">{a.Timestamp}</td>
                  <td className="px-5 py-4 text-sm font-bold text-white">{a.Server_ID}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#0a0e18] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(a.anomaly_score / 4) * 100}%`,
                            backgroundColor: a.anomaly_score >= 3 ? '#ffb4ab' : a.anomaly_score >= 2 ? '#ffba20' : '#00d1ff',
                          }}
                        />
                      </div>
                      <span className="font-mono font-bold text-sm text-white">{a.anomaly_score}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-3 py-1 border rounded-full text-[10px] font-bold uppercase tracking-wider ${badge}`}>
                      {a.anomaly_level}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button className="p-1.5 rounded-lg text-[#bbc9cf] group-hover:text-[#00d1ff] group-hover:bg-[#00d1ff]/10 transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-[#bbc9cf] font-mono text-sm">
                  {processedData.length === 0
                    ? 'Press ▶ Play to start the replay'
                    : 'No anomalies match the current filter'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="border-t border-white/5 px-5 py-3 flex justify-between items-center bg-[#1c1f2a]/30">
          <span className="text-[10px] font-mono text-[#bbc9cf]">
            Page {page} of {totalPages} · {pageData.length} of {anomalies.length} rows
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg text-[11px] font-mono text-[#bbc9cf] hover:bg-white/5 disabled:opacity-40 transition-colors"
            >
              ← Prev
            </button>
            {/* Show up to 7 page numbers */}
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 3, totalPages - 6));
              const p = start + i;
              if (p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-7 rounded-lg text-[11px] font-mono transition-colors ${
                    page === p ? 'bg-[#00d1ff]/20 text-[#00d1ff]' : 'text-[#bbc9cf] hover:bg-white/5'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-lg text-[11px] font-mono text-[#bbc9cf] hover:bg-white/5 disabled:opacity-40 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <DetailModal
          data={selected}
          context={getContext(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};
