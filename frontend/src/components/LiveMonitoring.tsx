import React, { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceDot,
} from 'recharts';
import { useReplay, isAnomalyForModel } from '../contexts/ReplayContext';
import type { TelemetryData, ModelOption } from '../contexts/ReplayContext';

// ─── Colours ──────────────────────────────────────────────────────────────────
const MODEL_OPTIONS: ModelOption[] = ['Ensemble', 'Isolation Forest', 'SVM', 'Autoencoder', 'LSTM'];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1120] border border-white/10 rounded-xl p-3 text-[10px] font-mono shadow-2xl">
      <p className="text-[#bbc9cf] mb-1">{String(label).substring(11, 19)}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.stroke }}>
          {p.name}: <span className="font-bold">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Single metric chart ──────────────────────────────────────────────────────
interface ChartPanelProps {
  label: string;
  dataKey: keyof TelemetryData;
  data: TelemetryData[];
  color: string;
  unit: string;
  model: ModelOption;
  height?: number;
}

const ChartPanel: React.FC<ChartPanelProps> = ({
  label, dataKey, data, color, unit, model, height = 160,
}) => {
  // Latest value
  const latest = data.length > 0 ? data[data.length - 1] : null;
  const latestVal = latest ? (latest[dataKey] as number) : null;

  // Anomaly reference dots (for the current metric)
  const anomalDots = useMemo(
    () => data.filter(d => isAnomalyForModel(d, model)),
    [data, model]
  );

  return (
    <div className="bg-[#171b26] border border-white/5 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-xs font-label text-[#bbc9cf] uppercase tracking-widest">{label}</h4>
          {latestVal !== null && (
            <p className="text-2xl font-bold font-mono text-white mt-0.5">
              {latestVal.toFixed(1)}
              <span className="text-sm text-[#bbc9cf] ml-1">{unit}</span>
            </p>
          )}
        </div>
        {anomalDots.length > 0 && (
          <span className="text-[10px] font-label text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded-full">
            {anomalDots.length} flags
          </span>
        )}
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <XAxis dataKey="Timestamp" tick={false} axisLine={false} tickLine={false} />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip content={<ChartTip />} />
            <Line
              type="monotone"
              dataKey={dataKey as string}
              name={label}
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            {/* Anomaly dots via ReferenceDot */}
            {anomalDots.slice(-30).map((d, i) => (
              <ReferenceDot
                key={i}
                x={d.Timestamp}
                y={d[dataKey] as number}
                r={d.anomaly_score >= 3 ? 5 : 3}
                fill={d.anomaly_score >= 3 ? '#ffb4ab' : '#ffba20'}
                stroke="none"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const LiveMonitoring: React.FC = () => {
  const { windowData, processedData, selectedModel, setSelectedModel, kpis, currentIndex, filteredDataset } = useReplay();

  const currentRow = filteredDataset[currentIndex] ?? (processedData[processedData.length - 1] ?? null);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Live Monitoring</h2>
          <p className="text-sm text-[#bbc9cf] mt-1">
            Streaming last <span className="font-mono text-[#00d1ff]">{windowData.length}</span> data points in view
          </p>
        </div>

        {/* Model selector */}
        <div className="flex items-center gap-3">
          <label className="text-[10px] font-label text-[#bbc9cf] uppercase tracking-wider">Model</label>
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value as ModelOption)}
            className="bg-[#1c1f2a] border border-white/10 text-[#dfe2f1] text-[11px] font-mono rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#00d1ff]"
          >
            {MODEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* ── Current reading row ──────────────────────────────────────────── */}
      {currentRow && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <ReadingCard label="Server"  value={currentRow.Server_ID}                          unit=""  />
          <ReadingCard label="CPU"     value={currentRow['CPU_Utilization_%'].toFixed(1)}    unit="%" warn={currentRow['CPU_Utilization_%'] > 80}     />
          <ReadingCard label="Memory"  value={currentRow['Memory_Utilization_%'].toFixed(1)} unit="%" warn={currentRow['Memory_Utilization_%'] > 80}  />
          <ReadingCard label="Power"   value={currentRow.Power_Usage_Watts.toString()}        unit="W" warn={currentRow.Power_Usage_Watts > 200}       />
          <ReadingCard
            label="Status"
            value={currentRow.anomaly_level}
            unit=""
            color={currentRow.anomaly_level === 'Critical' ? '#ffb4ab' : currentRow.anomaly_level === 'Moderate' ? '#ffba20' : '#00d1ff'}
          />
        </div>
      )}

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      {windowData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-[#bbc9cf] font-mono text-sm border border-white/5 rounded-2xl bg-[#171b26]">
          Press ▶ to start replay
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-5">
          <ChartPanel label="CPU Utilization"    dataKey="CPU_Utilization_%" data={windowData} color="#00d1ff" unit="%" model={selectedModel} height={160} />
          <ChartPanel label="Memory Utilization" dataKey="Memory_Utilization_%" data={windowData} color="#ffdb9d" unit="%" model={selectedModel} height={160} />
          <ChartPanel label="Power Usage"        dataKey="Power_Usage_Watts"    data={windowData} color="#ffaaa4" unit="W" model={selectedModel} height={160} />
        </div>
      )}

      {/* ── KPI Summary Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniKPI label="Data Points"         value={kpis.totalPoints.toLocaleString()}     />
        <MiniKPI label="Total Anomalies"     value={kpis.totalAnomalies.toLocaleString()}  color="text-amber-400" />
        <MiniKPI label="Strong Anomalies"    value={kpis.strongAnomalies.toLocaleString()} color="text-red-400"   />
        <MiniKPI label="Anomaly Rate"        value={`${kpis.anomalyRate.toFixed(2)}%`}     color={kpis.anomalyRate > 10 ? 'text-red-400' : 'text-white'} />
      </div>
    </div>
  );
};

// ── Tiny sub-components ────────────────────────────────────────────────────────
const ReadingCard: React.FC<{ label: string; value: string; unit: string; warn?: boolean; color?: string }> = ({
  label, value, unit, warn, color,
}) => (
  <div className="bg-[#171b26] border border-white/5 rounded-xl p-4">
    <p className="text-[9px] font-label text-[#bbc9cf] uppercase tracking-widest mb-1">{label}</p>
    <p
      className={`text-xl font-bold font-mono ${color ? '' : warn ? 'text-amber-400' : 'text-white'}`}
      style={color ? { color } : undefined}
    >
      {value}
      {unit && <span className="text-sm text-[#bbc9cf] ml-1">{unit}</span>}
    </p>
  </div>
);

const MiniKPI: React.FC<{ label: string; value: string; color?: string }> = ({
  label, value, color = 'text-white',
}) => (
  <div className="bg-[#171b26] border border-white/5 rounded-xl px-5 py-4">
    <p className="text-[10px] font-label text-[#bbc9cf] uppercase tracking-wider mb-2">{label}</p>
    <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
  </div>
);
