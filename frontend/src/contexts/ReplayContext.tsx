import React, {
  createContext, useContext, useState, useEffect,
  useMemo, useCallback, useRef,
} from 'react';
import Papa from 'papaparse';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TelemetryData {
  Timestamp: string;
  Server_ID: string;
  'CPU_Utilization_%': number;
  'Memory_Utilization_%': number;
  Power_Usage_Watts: number;
  iso_flag: number;
  svm_flag: number;
  ae_flag: number;
  lstm_flag: number;
  anomaly_score: number;
  strong_anomaly: number;
  anomaly_level: string;
}

export interface UIAlert {
  id: string;
  data: TelemetryData;
  index: number;
  sentAt: number;
}

export type TimeFilter   = 'Live' | '1H' | '1D' | '1M';
export type SpeedOption  = 1 | 2 | 5;
export type ServerFilter = 'All' | 'S1' | 'S2' | 'S3';
export type ModelOption  = 'Ensemble' | 'Isolation Forest' | 'SVM' | 'Autoencoder' | 'LSTM';

// ─── Helper ───────────────────────────────────────────────────────────────────
export const isAnomalyForModel = (d: TelemetryData, model: ModelOption): boolean => {
  switch (model) {
    case 'Isolation Forest': return d.iso_flag === 1;
    case 'SVM':              return d.svm_flag === 1;
    case 'Autoencoder':      return d.ae_flag === 1;
    case 'LSTM':             return d.lstm_flag === 1;
    default:                 return d.anomaly_score >= 1; // Ensemble
  }
};

const parseTs = (ts: string) => new Date(ts.replace(' ', 'T')).getTime();

const filterByTime = (data: TelemetryData[], tf: TimeFilter): TelemetryData[] => {
  if (tf === 'Live' || data.length === 0) return data;
  const t0 = parseTs(data[0].Timestamp);
  const dur: Record<string, number> = { '1H': 3_600_000, '1D': 86_400_000, '1M': 2_592_000_000 };
  const cutoff = t0 + dur[tf];
  return data.filter(d => parseTs(d.Timestamp) <= cutoff);
};

// ─── Telegram ─────────────────────────────────────────────────────────────────
const sendTelegramAlert = async (d: TelemetryData) => {
  const res = await fetch('http://localhost:3001/send-telegram-alert', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(d),
  });
  if (!res.ok) throw new Error('Failed to send telegram via backend');
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Backend failed');
  return data;
};

// ─── Context ──────────────────────────────────────────────────────────────────
interface ReplayContextType {
  // Data
  fullDataset:     TelemetryData[];
  filteredDataset: TelemetryData[];
  processedData:   TelemetryData[];
  windowData:      TelemetryData[];
  isLoading:       boolean;

  // Replay control
  currentIndex: number;
  isPlaying:    boolean;
  speed:        SpeedOption;
  demoMode:     boolean;

  // Filters
  serverFilter:  ServerFilter;
  timeFilter:    TimeFilter;
  selectedModel: ModelOption;

  // Alerts (max 3)
  alerts:    UIAlert[];

  // Precomputed anomaly positions in filteredDataset
  anomalyIndices: number[];

  // KPIs (computed from processedData)
  kpis: {
    totalPoints:     number;
    totalAnomalies:  number;
    strongAnomalies: number;
    anomalyRate:     number;
  };

  // Actions
  togglePlay:     () => void;
  reset:          () => void;
  setSpeed:       (s: SpeedOption) => void;
  setServerFilter:(f: ServerFilter) => void;
  setTimeFilter:  (f: TimeFilter) => void;
  setSelectedModel:(m: ModelOption) => void;
  startDemoMode:  () => void;
  resetDemoMode:  () => void;
  dismissAlert:   (id: string) => void;
  clearAlerts:    () => void;
}

const ReplayContext = createContext<ReplayContextType | undefined>(undefined);

export const useReplay = (): ReplayContextType => {
  const ctx = useContext(ReplayContext);
  if (!ctx) throw new Error('useReplay must be used inside ReplayProvider');
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ReplayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fullDataset,     setFullDataset]     = useState<TelemetryData[]>([]);
  const [filteredDataset, setFilteredDataset] = useState<TelemetryData[]>([]);
  const [isLoading,       setIsLoading]       = useState(true);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying,    setIsPlaying]    = useState(false);   // starts PAUSED
  const [speed,        setSpeedState]   = useState<SpeedOption>(1);
  const [demoMode,     setDemoMode]     = useState(false);

  const [serverFilter,   setServerFilterState] = useState<ServerFilter>('All');
  const [timeFilter,     setTimeFilterState]   = useState<TimeFilter>('Live');
  const [selectedModel,  setSelectedModel]     = useState<ModelOption>('Ensemble');

  const [alerts, setAlerts] = useState<UIAlert[]>([]);

  const notifiedRef = useRef<Set<number>>(new Set());

  // ── Load CSV ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/data.csv')
      .then(r => r.text())
      .then(csv => {
        Papa.parse<TelemetryData>(csv, {
          header:       true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: ({ data }) => {
            const valid = data.filter(
              d => d.Timestamp && typeof d.anomaly_score === 'number'
            );
            setFullDataset(valid);
            setIsLoading(false);
          },
        });
      })
      .catch(() => setIsLoading(false));
  }, []);

  // ── Rebuild filteredDataset when filter or fullDataset changes ─────────────
  useEffect(() => {
    if (!fullDataset.length) return;

    let d = serverFilter === 'All'
      ? fullDataset
      : fullDataset.filter(r => r.Server_ID === serverFilter);

    d = filterByTime(d, timeFilter);

    setFilteredDataset(d);
    setCurrentIndex(0);
    setIsPlaying(false);
    notifiedRef.current = new Set();
  }, [fullDataset, serverFilter, timeFilter]);

  // ── Replay interval ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || !filteredDataset.length) return;

    const delay: Record<SpeedOption, number> = { 1: 200, 2: 100, 5: 40 };
    const id = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= filteredDataset.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, delay[speed]);

    return () => clearInterval(id);
  }, [isPlaying, speed, filteredDataset.length]);

  // ── Anomaly alert trigger ─────────────────────────────────────────────────
  useEffect(() => {
    if (!filteredDataset.length) return;
    const d = filteredDataset[currentIndex];
    if (!d) return;

    if (d.anomaly_score >= 3 && !notifiedRef.current.has(currentIndex)) {
      notifiedRef.current.add(currentIndex);
      
      sendTelegramAlert(d)
        .then(() => {
          const alert: UIAlert = {
            id:     `${currentIndex}-${Date.now()}`,
            data:   d,
            index:  currentIndex,
            sentAt: Date.now(),
          };
          setAlerts(prev => [alert, ...prev].slice(0, 3));
        })
        .catch(err => {
          console.error("Failed to trigger alert:", err);
        });
    }
  }, [currentIndex, filteredDataset]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const processedData = useMemo(
    () => filteredDataset.slice(0, currentIndex + 1),
    [filteredDataset, currentIndex]
  );

  const windowData = useMemo(
    () => processedData.slice(Math.max(0, processedData.length - 100)),
    [processedData]
  );

  const anomalyIndices = useMemo(
    () => filteredDataset.reduce<number[]>((acc, d, i) => {
      if (d.strong_anomaly === 1 || d.anomaly_score >= 3) acc.push(i);
      return acc;
    }, []),
    [filteredDataset]
  );

  const kpis = useMemo(() => {
    const totalPoints    = processedData.length;
    const totalAnomalies = processedData.filter(d => d.anomaly_score >= 1).length;
    const strongAnomalies= processedData.filter(d => d.anomaly_score >= 3).length;
    const anomalyRate    = totalPoints > 0 ? (totalAnomalies / totalPoints) * 100 : 0;
    return { totalPoints, totalAnomalies, strongAnomalies, anomalyRate };
  }, [processedData]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => setIsPlaying(p => !p), []);

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
    setDemoMode(false);
    setSpeedState(1);
    notifiedRef.current = new Set();
  }, []);

  const setSpeed = useCallback((s: SpeedOption) => setSpeedState(s), []);

  const setServerFilter = useCallback((f: ServerFilter) => setServerFilterState(f), []);

  const setTimeFilter = useCallback((f: TimeFilter) => setTimeFilterState(f), []);

  const startDemoMode = useCallback(() => {
    if (!anomalyIndices.length) return;
    // Find anomaly within next 20, or just the next one
    let target = anomalyIndices.find(i => i > currentIndex && i <= currentIndex + 20);
    if (target === undefined) target = anomalyIndices.find(i => i > currentIndex);
    if (target === undefined) target = anomalyIndices[0]; // loop
    const jumpTo = Math.max(0, target - 5);
    setCurrentIndex(jumpTo);
    setSpeedState(5);
    setDemoMode(true);
    setIsPlaying(true);
  }, [anomalyIndices, currentIndex]);

  const resetDemoMode = useCallback(() => {
    setDemoMode(false);
    setIsPlaying(false);
    setSpeedState(1);
    setCurrentIndex(0);
    notifiedRef.current = new Set();
  }, []);

  const dismissAlert  = useCallback((id: string) =>
    setAlerts(prev => prev.filter(a => a.id !== id)), []);

  const clearAlerts = useCallback(() => setAlerts([]), []);

  return (
    <ReplayContext.Provider value={{
      fullDataset, filteredDataset, processedData, windowData, isLoading,
      currentIndex, isPlaying, speed, demoMode,
      serverFilter, timeFilter, selectedModel,
      alerts, anomalyIndices, kpis,
      togglePlay, reset, setSpeed, setServerFilter, setTimeFilter,
      setSelectedModel, startDemoMode, resetDemoMode,
      dismissAlert, clearAlerts,
    }}>
      {children}
    </ReplayContext.Provider>
  );
};
