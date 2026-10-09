import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dayKey } from './domain/dates';
import { emptyData, type AppData, type Source } from './domain/data';
import { advance, finish, newProject, nextPattern, progressOf, type Project } from './domain/knit';
import { addDaysTo, cumulativeSince, mergeDays, type Days } from './domain/steps';
import { seedData } from './dev/demo';
import { loadBilling, type BillingState } from './platform/billing';
import { readerFor, type HealthState } from './platform/health';
import { isNative, onBack, onResume, success, tap } from './platform/native';
import { clearData, loadData, saveData } from './platform/storage';
import { Box } from './ui/Box';
import { Home } from './ui/Home';
import { Intro } from './ui/Intro';
import { Log } from './ui/Log';
import { NextSheet } from './ui/NextSheet';
import { Paywall } from './ui/Paywall';
import { PieceSheet } from './ui/PieceSheet';
import { Privacy } from './ui/Privacy';
import { Settings } from './ui/Settings';
import { Sheet } from './ui/Sheet';
import { TabBar, type Tab } from './ui/TabBar';

export type SheetKind = { kind: 'settings' } | { kind: 'paywall'; from?: SheetKind } | { kind: 'next' } | { kind: 'piece'; id: string } | { kind: 'privacy' };

export interface AppCtx {
  data: AppData;
  today: string;
  cumulative: number;
  pro: boolean;
  billing: BillingState;
  health: HealthState | 'checking';
  reading: boolean;
  /** 0 のまま読めている(iOS で読み取りを断られたときもこうなる) */
  noData: boolean;
  refresh: () => Promise<void>;
  connect: () => Promise<void>;
  useSource: (s: Source) => Promise<void>;
  startProject: (args: { item: string; palette: string; pattern?: string }) => void;
  finishCurrent: () => void;
  markSeen: (n: number) => void;
  importDays: (days: Days) => void;
  setBilling: (b: BillingState) => void;
  open: (s: SheetKind) => void;
  close: () => void;
  toast: (msg: string) => void;
  resetAll: () => Promise<void>;
}

const todayKey = () => dayKey(new Date());

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [today, setToday] = useState(todayKey());
  const [billing, setBilling] = useState<BillingState>({ status: 'unavailable', reason: '読み込み中', pro: false });
  const [health, setHealth] = useState<HealthState | 'checking'>('checking');
  const [reading, setReading] = useState(false);
  const [tab, setTab] = useState<Tab>('knit');
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const dataRef = useRef<AppData | null>(null);
  dataRef.current = data;

  const commit = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
    void saveData(next);
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg((m) => (m === msg ? null : m)), 2600);
  }, []);

  // 起動: 記録と課金の状態を読む
  useEffect(() => {
    const t = todayKey();
    (async () => {
      const seeded = !isNative ? seedData(t) : null;
      const d = seeded ?? (await loadData(t));
      commit(d);
    })();
    loadBilling().then(setBilling).catch(() => {});
  }, [commit]);

  /** 歩数を読み直す。権限が無ければ状態だけ更新する */
  const refresh = useCallback(async () => {
    const d = dataRef.current;
    if (!d) return;
    const t = todayKey();
    setToday(t);
    const reader = readerFor(d.source);
    const st = await reader.check(d.asked);
    setHealth(st);
    if (st !== 'ready') return;
    setReading(true);
    try {
      const res = await reader.read(t, d.sensor);
      const cur = dataRef.current ?? d;
      const days = res.mode === 'replace' ? mergeDays(cur.days, res.days) : addDaysTo(cur.days, res.days);
      const next: AppData = {
        ...cur,
        days,
        lastReadAt: Date.now(),
        source: cur.source ?? reader.source,
        sensor: res.mode === 'add' ? res.mark : cur.sensor,
      };
      if (next.current) next.current = advance(next.current, cumulativeSince(days, next.installDate, t));
      commit(next);
    } catch (e) {
      console.error('[tekuami] read', e);
      setHealth('error');
    } finally {
      setReading(false);
    }
  }, [commit]);

  // 記録を読んだら一度、そのあとは前に戻るたびに読み直す
  const loaded = !!data;
  useEffect(() => {
    if (!loaded) return;
    void refresh();
    return onResume(() => void refresh());
  }, [loaded, refresh]);

  const connect = useCallback(async () => {
    const d = dataRef.current;
    if (!d) return;
    tap();
    const reader = readerFor(d.source);
    const st = await reader.request();
    commit({ ...(dataRef.current ?? d), asked: true, source: (dataRef.current ?? d).source ?? reader.source });
    setHealth(st);
    if (st === 'ready') await refresh();
  }, [commit, refresh]);

  const useSource = useCallback(
    async (s: Source) => {
      const d = dataRef.current;
      if (!d) return;
      commit({ ...d, source: s, asked: false, sensor: s === 'sensor' ? d.sensor : null });
      const reader = readerFor(s);
      const st = await reader.request();
      commit({ ...(dataRef.current ?? d), source: s, asked: true });
      setHealth(st);
      if (st === 'ready') await refresh();
    },
    [commit, refresh],
  );

  const cumulative = data ? cumulativeSince(data.days, data.installDate, today) : 0;
  const pro = billing.pro;

  const startProject = useCallback(
    (args: { item: string; palette: string; pattern?: string }) => {
      const d = dataRef.current;
      if (!d) return;
      const t = todayKey();
      const cum = cumulativeSince(d.days, d.installDate, t);
      const pat = nextPattern(d.done, pro, args.pattern);
      const p: Project = advance(newProject({ item: args.item, palette: args.palette, pattern: pat.id, startTotal: d.carry ?? cum, today: t }), cum);
      commit({ ...d, onboarded: true, current: p, carry: null, seen: 0 });
      setSheet(null);
      setTab('knit');
    },
    [commit, pro],
  );

  const finishCurrent = useCallback(() => {
    const d = dataRef.current;
    if (!d?.current) return;
    const { done, nextStart } = finish(d.current, todayKey());
    success();
    commit({ ...d, done: [...d.done, done], current: null, carry: nextStart, seen: 0 });
    setSheet({ kind: 'next' });
  }, [commit]);

  const markSeen = useCallback(
    (n: number) => {
      const d = dataRef.current;
      if (d && d.seen !== n) commit({ ...d, seen: n });
    },
    [commit],
  );

  const importDays = useCallback(
    (days: Days) => {
      const d = dataRef.current;
      if (!d) return;
      commit({ ...d, imported: { ...d.imported, ...days } });
    },
    [commit],
  );

  const resetAll = useCallback(async () => {
    await clearData();
    const fresh = emptyData(todayKey());
    commit(fresh);
    setSheet(null);
    setTab('knit');
    setHealth('checking');
  }, [commit]);

  const open = useCallback((s: SheetKind) => {
    tap();
    setSheet(s);
  }, []);
  // 毛糸ぶくろを、別の面から開いたときは元の面へ戻る
  const close = useCallback(() => setSheet((s) => (s?.kind === 'paywall' && s.from ? s.from : null)), []);

  // Android の戻る: 下から出た面を閉じる → 編むタブへ戻る
  useEffect(
    () =>
      onBack(() => {
        if (sheet) {
          close();
          return true;
        }
        if (tab !== 'knit') {
          setTab('knit');
          return true;
        }
        return false;
      }),
    [sheet, tab, close],
  );

  const noData = useMemo(() => {
    if (!data || health !== 'ready' || data.lastReadAt === null) return false;
    return Object.values(data.days).every((v) => v === 0);
  }, [data, health]);

  if (!data) return <div className="boot" />;

  const ctx: AppCtx = {
    data,
    today,
    cumulative,
    pro,
    billing,
    health,
    reading,
    noData,
    refresh,
    connect,
    useSource,
    startProject,
    finishCurrent,
    markSeen,
    importDays,
    setBilling,
    open,
    close,
    toast,
    resetAll,
  };

  if (!data.onboarded) {
    return <Intro onStart={(palette) => startProject({ item: 'muffler', palette })} />;
  }

  const progress = data.current ? progressOf(data.current, cumulative) : null;

  return (
    <div className="app">
      <main className="screen" key={tab}>
        {tab === 'knit' && <Home ctx={ctx} progress={progress} />}
        {tab === 'log' && <Log ctx={ctx} />}
        {tab === 'box' && <Box ctx={ctx} />}
      </main>
      <TabBar
        tab={tab}
        onChange={(t) => {
          tap();
          setTab(t);
        }}
      />
      {toastMsg && (
        <div className="toast" role="status">
          {toastMsg}
        </div>
      )}
      <Sheet open={!!sheet} onClose={close} tall={sheet?.kind === 'privacy' || sheet?.kind === 'next'}>
        {sheet?.kind === 'settings' && <Settings ctx={ctx} />}
        {sheet?.kind === 'paywall' && <Paywall ctx={ctx} />}
        {sheet?.kind === 'next' && <NextSheet ctx={ctx} />}
        {sheet?.kind === 'piece' && <PieceSheet ctx={ctx} id={sheet.id} />}
        {sheet?.kind === 'privacy' && <Privacy />}
      </Sheet>
    </div>
  );
}
