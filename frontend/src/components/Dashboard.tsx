import React, { useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { useReplay } from '../contexts/ReplayContext';
import type { TelemetryData } from '../contexts/ReplayContext';
import { AlertOctagon, AlertTriangle, ArrowRight } from 'lucide-react';

const TIP_STYLE = {
  contentStyle: { backgroundColor: '#0d1120', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 },
  itemStyle:    { color: '#dfe2f1' },
  labelStyle:   { color: '#bbc9cf', fontSize: 10 },
};



export const Dashboard: React.FC = () => {
  const { processedData, kpis } = useReplay();

  // Sampled timeline (max 300 points for performance)
  const timeline = useMemo(() => {
    const step = Math.max(1, Math.floor(processedData.length / 300));
    return processedData.filter((_, i) => i % step === 0);
  }, [processedData]);

  // Model comparison bar data
  const modelBar = useMemo(() => [
    { name: 'Isolation Forest', detected: processedData.filter(d => d.iso_flag  === 1).length, color: '#00d1ff' },
    { name: 'SVM',              detected: processedData.filter(d => d.svm_flag  === 1).length, color: '#ffba20' },
    { name: 'Autoencoder',      detected: processedData.filter(d => d.ae_flag   === 1).length, color: '#a4e6ff' },
    { name: 'LSTM',             detected: processedData.filter(d => d.lstm_flag === 1).length, color: '#ffdb9d' },
  ], [processedData]);

  // Recent anomalies
  const recentAnomalies = useMemo(
    () => processedData.filter(d => d.anomaly_score >= 2).slice(-6).reverse(),
    [processedData]
  );

  // Per-server anomaly rate
  const serverStats = useMemo(() =>
    ['S1', 'S2', 'S3'].map(id => {
      const rows = processedData.filter(d => d.Server_ID === id);
      const anoms = rows.filter(d => d.anomaly_score >= 1).length;
      return { id, total: rows.length, anoms, rate: rows.length > 0 ? (anoms / rows.length) * 100 : 0 };
    }), [processedData]);

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Dashboard</h2>
        <p className="text-sm text-[#bbc9cf] mt-1">
          Aggregate analysis over <span className="font-mono text-[#00d1ff]">{kpis.totalPoints.toLocaleString()}</span> data points
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Data Points"     value={kpis.totalPoints.toLocaleString()}     color="text-white"     />
        <KPICard label="Anomalies"       value={kpis.totalAnomalies.toLocaleString()}  color="text-amber-400" />
        <KPICard label="Strong Anomalies"value={kpis.strongAnomalies.toLocaleString()} color="text-red-400"   />
        <KPICard label="Anomaly Rate"    value={`${kpis.anomalyRate.toFixed(2)}%`}      color={kpis.anomalyRate > 10 ? 'text-red-400' : 'text-white'} />
      </div>

      {/* Trend charts — CPU / Memory / Power */}
      <div>
        <h3 className="text-xs font-label text-[#bbc9cf] uppercase tracking-widest mb-4">Metric Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <TrendChart data={timeline} dataKey="CPU_Utilization_%"    label="CPU %"    color="#00d1ff" />
          <TrendChart data={timeline} dataKey="Memory_Utilization_%" label="Memory %" color="#ffdb9d" />
          <TrendChart data={timeline} dataKey="Power_Usage_Watts"    label="Power W"  color="#ffaaa4" />
        </div>
      </div>

      {/* Anomaly score timeline */}
      <div>
        <h3 className="text-xs font-label text-[#bbc9cf] uppercase tracking-widest mb-4">Anomaly Score Timeline</h3>
        <div className="bg-[#171b26] border border-white/5 rounded-2xl p-5 h-52">
          {timeline.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[#bbc9cf] font-mono text-sm">Press ▶ to start replay</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ffb4ab" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ffb4ab" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="Timestamp" tick={false} axisLine={false} />
                <YAxis domain={[0, 4]} ticks={[0,1,2,3,4]} tick={{ fill: '#bbc9cf', fontSize: 10 }} width={20} />
                <Tooltip {...TIP_STYLE} formatter={(v: any) => [v, 'Score']} />
                <Area
                  type="step" dataKey="anomaly_score" name="Score"
                  stroke="#ffb4ab" strokeWidth={1.5} fill="url(#scoreGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom row: model comparison + recent anomalies + server stats */}
      <div className="grid grid-cols-12 gap-6">
        {/* Model detection bar chart */}
        <div className="col-span-12 lg:col-span-5 bg-[#171b26] border border-white/5 rounded-2xl p-6">
          <h3 className="text-xs font-label text-[#bbc9cf] uppercase tracking-widest mb-5">Model Detection Comparison</h3>
          {processedData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-[#bbc9cf] font-mono text-sm">Awaiting data</div>
          ) : (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelBar} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fill: '#bbc9cf', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip {...TIP_STYLE} formatter={(v: any) => [v, 'Detected']} />
                  <Bar dataKey="detected" radius={[4,4,0,0]} isAnimationActive={false}>
                    {modelBar.map((m, i) => <Cell key={i} fill={m.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Per-server anomaly rate */}
        <div className="col-span-12 lg:col-span-3 bg-[#171b26] border border-white/5 rounded-2xl p-6">
          <h3 className="text-xs font-label text-[#bbc9cf] uppercase tracking-widest mb-5">Per-Server Anomaly Rate</h3>
          <div className="space-y-4">
            {serverStats.map(s => (
              <div key={s.id}>
                <div className="flex justify-between text-[11px] font-label mb-1">
                  <span className="text-white font-bold">Server {s.id}</span>
                  <span className="text-[#bbc9cf] font-mono">{s.anoms}/{s.total} ({s.rate.toFixed(1)}%)</span>
                </div>
                <div className="h-1.5 bg-[#0a0e18] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(s.rate, 0.5)}%`, backgroundColor: s.rate > 15 ? '#ffb4ab' : s.rate > 5 ? '#ffba20' : '#00d1ff' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent anomalies */}
        <div className="col-span-12 lg:col-span-4 bg-[#171b26] border border-white/5 rounded-2xl p-6">
          <h3 className="text-xs font-label text-[#bbc9cf] uppercase tracking-widest mb-5">Recent Anomalies</h3>
          {recentAnomalies.length === 0 ? (
            <p className="text-[11px] text-[#bbc9cf] font-mono">No anomalies yet in this window.</p>
          ) : (
            <div className="space-y-2">
              {recentAnomalies.map((a, i) => <RecentRow key={i} data={a} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────
const KPICard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className="bg-[#171b26] border border-white/5 rounded-xl p-5">
    <p className="text-[10px] font-label text-[#bbc9cf] uppercase tracking-wider mb-2">{label}</p>
    <p className={`text-3xl font-bold font-mono ${color}`}>{value}</p>
  </div>
);

const TrendChart: React.FC<{ data: TelemetryData[]; dataKey: string; label: string; color: string }> = ({
  data, dataKey, label, color,
}) => (
  <div className="bg-[#171b26] border border-white/5 rounded-2xl p-5">
    <p className="text-[10px] font-label text-[#bbc9cf] uppercase tracking-wider mb-3">{label}</p>
    {data.length === 0 ? (
      <div className="h-24 flex items-center justify-center text-[#bbc9cf] text-xs font-mono">Awaiting data</div>
    ) : (
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 2, right: 2, left: 0, bottom: 0 }}>
            <YAxis hide domain={['auto', 'auto']} />
            <XAxis dataKey="Timestamp" hide />
            <Tooltip
              contentStyle={{ backgroundColor: '#0d1120', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 10 }}
              itemStyle={{ color }}
            />
            <Line
              type="monotone" dataKey={dataKey} name={label}
              stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

const RecentRow: React.FC<{ data: TelemetryData }> = ({ data }) => {
  const crit = data.anomaly_score >= 3 || data.strong_anomaly === 1;
  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-xl border border-white/5 hover:border-white/10 transition-colors cursor-default group`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${crit ? 'bg-red-400/10 text-red-400' : 'bg-amber-400/10 text-amber-400'}`}>
        {crit ? <AlertOctagon className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold">
          {data.Server_ID} — Score {data.anomaly_score}
        </p>
        <p className="text-[9px] text-[#bbc9cf] font-label uppercase truncate">{data.Timestamp.substring(0, 16)}</p>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-[#bbc9cf] group-hover:text-white shrink-0 transition-colors" />
    </div>
  );
};
