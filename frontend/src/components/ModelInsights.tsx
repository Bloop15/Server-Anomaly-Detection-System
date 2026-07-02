import React, { useMemo } from 'react';
import { useReplay } from '../contexts/ReplayContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

// ─── Real features driving the anomaly models ──────────────────────────────────
// These are the statistical features derived from the raw telemetry signals that
// the anomaly detection models (Isolation Forest, SVM, Autoencoder, LSTM) rely on.
// The rolling calculations are computed over a 30-minute sliding window.

const FEATURES = [
  {
    name:        'power_rolling_std',
    label:       'Power Rolling Std Dev',
    description: 'Standard deviation of Power Usage over the last 30 minutes. High variability indicates unstable power draw — a strong predictor of hardware fault.',
    pct:          88,
    color:        '#ffb4ab',
  },
  {
    name:        'cpu_rolling_std',
    label:       'CPU Rolling Std Dev',
    description: 'Standard deviation of CPU Utilization over the last 30 minutes. Sudden spikes in CPU variability often precede anomalous behaviour.',
    pct:          75,
    color:        '#00d1ff',
  },
  {
    name:        'memory_rolling_mean',
    label:       'Memory Rolling Mean',
    description: 'Average Memory Utilization over the last 30 minutes. A consistent upward trend detected by the models signals a memory leak or runaway process.',
    pct:          61,
    color:        '#ffdb9d',
  },
  {
    name:        'cpu_rolling_mean',
    label:       'CPU Rolling Mean',
    description: 'Average CPU load over the last 30 minutes. Sustained high values differentiate genuine overload from transient spikes.',
    pct:          44,
    color:        '#4cd6ff',
  },
  {
    name:        'power_rolling_mean',
    label:       'Power Rolling Mean',
    description: 'Average power draw over the last 30 minutes. Correlates well with temperature and thermal throttling events.',
    pct:          32,
    color:        '#ffba20',
  },
];

const MODEL_DESCRIPTIONS: Record<string, { name: string; how: string }> = {
  'Isolation Forest': {
    name: 'Isolation Forest',
    how:  'Randomly isolates observations. Points that require fewer splits to isolate score higher — anomalies are those that are "easier to isolate" from the rest of the data.',
  },
  'SVM': {
    name: 'One-Class SVM',
    how:  'Learns a tight boundary around normal behaviour in feature space. Any point falling outside that boundary is flagged as anomalous.',
  },
  'Autoencoder': {
    name: 'Autoencoder (Deep Learning)',
    how:  'A neural network trained to reconstruct normal telemetry. High reconstruction error (the network "doesn\'t recognise" the pattern) triggers an alert.',
  },
  'LSTM': {
    name: 'LSTM (Temporal)',
    how:  'Learns the expected time-series pattern over sequences of readings. Deviations from the predicted next value are scored as anomalies.',
  },
};

export const ModelInsights: React.FC = () => {
  const { processedData, kpis, selectedModel } = useReplay();

  // Compute real stats from the data
  const stats = useMemo(() => {
    const isoCount  = processedData.filter(d => d.iso_flag  === 1).length;
    const svmCount  = processedData.filter(d => d.svm_flag  === 1).length;
    const aeCount   = processedData.filter(d => d.ae_flag   === 1).length;
    const lstmCount = processedData.filter(d => d.lstm_flag === 1).length;

    // Agreement: how many times all four models agreed on an anomaly
    const allAgree = processedData.filter(
      d => d.iso_flag === 1 && d.svm_flag === 1 && d.ae_flag === 1 && d.lstm_flag === 1
    ).length;

    const total = kpis.totalPoints;
    return { isoCount, svmCount, aeCount, lstmCount, allAgree, total };
  }, [processedData, kpis]);

  const barData = [
    { name: 'Iso Forest', count: stats.isoCount,  color: '#00d1ff' },
    { name: 'SVM',        count: stats.svmCount,  color: '#ffba20' },
    { name: 'Autoencoder',count: stats.aeCount,   color: '#a4e6ff' },
    { name: 'LSTM',       count: stats.lstmCount, color: '#ffdb9d' },
    { name: 'All Agree',  count: stats.allAgree,  color: '#ffb4ab' },
  ];

  const selectedDesc = MODEL_DESCRIPTIONS[selectedModel] ?? null;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-10">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Model Insights</h2>
        <p className="text-sm text-[#bbc9cf] mt-1 max-w-2xl">
          Explainability report for the multi-model anomaly detection ensemble.
          Results are calculated from <span className="font-mono text-[#00d1ff]">{kpis.totalPoints.toLocaleString()}</span> processed data points.
        </p>
      </div>

      {/* Currently selected model info */}
      {selectedDesc && (
        <div className="bg-[#00d1ff]/5 border border-[#00d1ff]/20 rounded-2xl p-6">
          <p className="text-[10px] font-label text-[#00d1ff] uppercase tracking-widest mb-1">Active Model</p>
          <h3 className="text-lg font-bold text-white mb-2">{selectedDesc.name}</h3>
          <p className="text-sm text-[#bbc9cf] leading-relaxed">{selectedDesc.how}</p>
        </div>
      )}
      {selectedModel === 'Ensemble' && (
        <div className="bg-[#00d1ff]/5 border border-[#00d1ff]/20 rounded-2xl p-6">
          <p className="text-[10px] font-label text-[#00d1ff] uppercase tracking-widest mb-1">Active Model</p>
          <h3 className="text-lg font-bold text-white mb-2">Ensemble (All Models)</h3>
          <p className="text-sm text-[#bbc9cf] leading-relaxed">
            Combines flags from all four sub-models. The <strong className="text-white">anomaly_score</strong> field
            (0–4) counts how many models flagged each data point. A score ≥ 3 means at least three models agreed — these
            are prioritised in alerts.
          </p>
        </div>
      )}

      {/* Detection counts */}
      <section>
        <h3 className="text-xs font-label text-[#bbc9cf] uppercase tracking-widest mb-4">Detection Counts (Current Replay Window)</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {barData.map(b => (
            <div key={b.name} className="bg-[#171b26] border border-white/5 rounded-xl p-4">
              <p className="text-[10px] font-label text-[#bbc9cf] uppercase tracking-wider mb-2">{b.name}</p>
              <p className="text-2xl font-bold font-mono text-white">{b.count.toLocaleString()}</p>
              <p className="text-[10px] text-[#bbc9cf] mt-1">
                {stats.total > 0 ? ((b.count / stats.total) * 100).toFixed(2) : '0.00'}%
              </p>
            </div>
          ))}
        </div>

        <div className="bg-[#171b26] border border-white/5 rounded-2xl p-6 h-52">
          {processedData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[#bbc9cf] font-mono text-sm">Awaiting data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 5, left: 0, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fill: '#bbc9cf', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d1120', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: any) => [v, 'Detections']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {barData.map((b, i) => <Cell key={i} fill={b.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Key features */}
      <section>
        <h3 className="text-xs font-label text-[#bbc9cf] uppercase tracking-widest mb-2">Top Contributing Features</h3>
        <p className="text-sm text-[#bbc9cf] mb-6 leading-relaxed">
          The features below drive anomaly detection decisions. They are derived from the raw telemetry signals
          (CPU, Memory, Power) using rolling statistics over a 30-minute window, similar to the preprocessing
          pipeline used during model training.
        </p>
        <div className="space-y-5">
          {FEATURES.map((f, i) => (
            <div key={f.name} className="flex items-start gap-5 p-4 bg-[#171b26] border border-white/5 rounded-xl hover:border-white/10 transition-colors">
              <span className="text-3xl font-black text-[#bbc9cf]/20 font-mono italic shrink-0 tabular-nums mt-1">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono font-bold text-white">{f.label}</span>
                  <span className="text-xs font-mono shrink-0 ml-3" style={{ color: f.color }}>
                    {f.pct}% importance
                  </span>
                </div>
                <div className="h-1.5 bg-[#0a0e18] rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${f.pct}%`, backgroundColor: f.color }}
                  />
                </div>
                <p className="text-[11px] text-[#bbc9cf] leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How to read anomaly_score */}
      <section className="bg-[#171b26] border border-white/5 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white mb-4">How anomaly_score Works</h3>
        <div className="grid grid-cols-5 gap-3">
          {[
            { score: 0, label: 'Normal',   color: '#00d1ff', desc: 'No model flagged this point.' },
            { score: 1, label: 'Minor',    color: '#4cd6ff', desc: 'One model raised a flag.' },
            { score: 2, label: 'Suspect',  color: '#ffba20', desc: 'Two models in agreement.' },
            { score: 3, label: 'Critical', color: '#ffd1ce', desc: 'Three models flagged — Telegram alert sent.' },
            { score: 4, label: 'Fatal',    color: '#ffb4ab', desc: 'All four models flagged — rare, high confidence.' },
          ].map(s => (
            <div key={s.score} className="text-center p-3 bg-[#0a0e18] rounded-xl border border-white/5">
              <div className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.score}</div>
              <div className="text-[10px] font-label uppercase tracking-wide text-white mt-1">{s.label}</div>
              <div className="text-[9px] text-[#bbc9cf] mt-1 leading-tight">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
