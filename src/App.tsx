import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dayKey } from './domain/dates';
import { emptyData, type AppData, type Queued, type Source } from './domain/data';
import { advance, canUseItem, finish, newProject, nextPattern, progressOf, type Project } from './domain/knit';
import { addDaysTo, cumulativeSince, mergeDays, type Days } from './domain/steps';
import { seedData } from './dev/demo';
import { loadBilling, type BillingState } from './platform/billing';
import { readerFor, type HealthState } from './platform/health';
import { isNative, onBack, onResume, success, tap } from './platform/native';
import { clearData, loadData, saveData } from './platform/storage';
import { Bag } from './ui/Bag';
import { Box } from './ui/Box';
import { Colors } from './ui/Colors';
import { Finished } from './ui/Finished';
import { Home } from './ui/Home';
import { Pick } from './ui/Pick';
import { PatternPage } from './ui/PatternPage';
import { PieceView } from './ui/PieceView';
import { Record } from './ui/Record';
import { About, Privacy, RowStepsPage, Settings, SourcePage } from './ui/Settings';
import { ShareView } from './ui/ShareView';
import { Splash } from './ui/Splash';
import { TabBar, type Tab } from './ui/TabBar';

/** 上に重ねて開く画面。戻る矢印で1つずつ閉じる */
export type Route =
  | { name: 'record' }
  | { name: 'settings' }
  | { name: 'source' }
  | { name: 'rowsteps' }
  | { name: 'about' }
  | { name: 'privacy' }
  | { name: 'pattern'; item: string }
  | { name: 'colors'; item: string; pattern?: string }
  | { name: 'share'; id?: string }
  | { name: 'piece'; id: string }
  | { name: 'bag' };

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
  /** 編みはじめる。編んでいる物があるときは「次に編むもの」として取っておく */
  choose: (q: Queued) => void;
  finishCurrent: () => void;
  markSeen: (n: number) => void;
  importDays: (days: Days) => void;
  setRowSteps: (n: number) => void;
  setBilling: (b: BillingState) => void;
  push: (r: Route) => void;
  pop: () => void;
  goTab: (t: Tab) => void;
  toast: (msg: string) => void;
  resetAll: () => Promise<void>;
}

const todayKey = () => dayKey(new Date());

/** ブラウザでの確認用: ?tab=box や ?route=record,settings で画面を直接開く(端末のアプリでは使わない) */
function devParam(name: string): string | null {
  try {
    return new URLSearchParams(location.search).get(name);
  } catch {
    return null;
  }
}
function devRoutes(): Route[] {
  const r = devParam('route');
  if (!r) return [];
  return r.split(',').map((x) => {
    const [name, a, b] = x.split(':');
    if (name === 'pattern') return { name, item: a || 'muffler' } as Route;
    if (name === 'colors') return { name, item: a || 'muffler', ...(b ? { pattern: b } : {}) } as Route;
    if (name === 'piece') return { name, id: a } as Route;
    if (name === 'share') return { name, ...(a ? { id: a } : {}) } as Route;
    return { name } as Route;
  });
}

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [today, setToday] = useState(todayKey());
  const [billing, setBilling] = useState<BillingState>({ status: 'unavailable', reason: '読み込み中', pro: false });
  const [health, setHealth] = useState<HealthState | 'checking'>('checking');
  const [reading, setReading] = useState(false);
  const [tab, setTab] = useState<Tab>(() => (!isNative ? (devParam('tab') as Tab | null) : null) ?? 'home');
  const [stack, setStack] = useState<Route[]>(() => (!isNative ? devRoutes() : []));
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

  /** 新しく編みはじめた物(余りの歩数から) */
  const startFrom = useCallback(
    (d: AppData, q: Queued): AppData => {
      const t = todayKey();
      const cum = cumulativeSince(d.days, d.installDate, t);
      const pat = nextPattern(d.done, pro, q.pattern);
      const p: Project = advance(newProject({ item: q.item, palette: q.palette, pattern: pat.id, startTotal: d.carry ?? cum, today: t, rowSteps: d.rowSteps }), cum);
      return { ...d, onboarded: true, current: p, carry: null, seen: 0, queued: null };
    },
    [pro],
  );

  const choose = useCallback(
    (q: Queued) => {
      const d = dataRef.current;
      if (!d) return;
      if (!canUseItem(q.item, pro)) return;
      const cur = d.current;
      const curDone = cur ? progressOf(cur, cumulativeSince(d.days, d.installDate, todayKey())).done : false;
      if (cur && !curDone) {
        commit({ ...d, queued: q });
        toast('いまの物が編み上がったら、続けて編みはじめます');
        setStack([]);
        setTab('home');
        return;
      }
      commit(startFrom(d, q));
      setStack([]);
      setTab('home');
    },
    [commit, pro, startFrom, toast],
  );

  const finishCurrent = useCallback(() => {
    const d = dataRef.current;
    if (!d?.current) return;
    const { done, nextStart } = finish(d.current, todayKey());
    success();
    const closed: AppData = { ...d, done: [...d.done, done], current: null, carry: nextStart, seen: 0 };
    if (d.queued && canUseItem(d.queued.item, pro)) {
      commit(startFrom(closed, d.queued));
      toast('箱にしまいました。次の物を編みはじめます');
      setTab('home');
    } else {
      commit({ ...closed, queued: null });
      toast('箱にしまいました');
      setTab('knit');
    }
    setStack([]);
  }, [commit, pro, startFrom, toast]);

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

  const setRowSteps = useCallback(
    (n: number) => {
      const d = dataRef.current;
      if (d) commit({ ...d, rowSteps: n });
    },
    [commit],
  );

  const resetAll = useCallback(async () => {
    await clearData();
    commit(emptyData(todayKey()));
    setStack([]);
    setTab('home');
    setHealth('checking');
  }, [commit]);

  const push = useCallback((r: Route) => {
    tap();
    setStack((s) => [...s, r]);
  }, []);
  const pop = useCallback(() => {
    tap();
    setStack((s) => s.slice(0, -1));
  }, []);
  const goTab = useCallback((t: Tab) => {
    tap();
    setStack([]);
    setTab(t);
  }, []);

  // Android の戻る: 重ねた画面を閉じる → ホームへ戻る → アプリを下げる
  useEffect(
    () =>
      onBack(() => {
        if (stack.length) {
          setStack((s) => s.slice(0, -1));
          return true;
        }
        if (tab !== 'home') {
          setTab('home');
          return true;
        }
        return false;
      }),
    [stack, tab],
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
    choose,
    finishCurrent,
    markSeen,
    importDays,
    setRowSteps,
    setBilling,
    push,
    pop,
    goTab,
    toast,
    resetAll,
  };

  const top = stack.at(-1);
  const progress = data.current ? progressOf(data.current, cumulative) : null;
  const finishedNow = !!progress?.done && !top;

  let body: React.ReactNode;
  if (top) body = <RouteView ctx={ctx} route={top} />;
  else if (!data.onboarded) body = <Splash onStart={() => push({ name: 'pattern', item: 'muffler' })} />;
  else if (finishedNow && tab === 'home') body = <Finished ctx={ctx} />;
  else if (tab === 'home') body = <Home ctx={ctx} progress={progress} />;
  else if (tab === 'box') body = <Box ctx={ctx} />;
  else if (tab === 'knit') body = <Pick ctx={ctx} />;
  else body = <Bag ctx={ctx} />;

  // タブを出すのは、タブの画面と今日の記録だけ(見本どおり)
  const showTabs = data.onboarded && !(finishedNow && tab === 'home') && (!top || top.name === 'record');

  return (
    <div className={`app ${showTabs ? 'has-tabs' : ''}`}>
      <main className="screen" key={top ? `${stack.length}-${top.name}` : `${tab}-${data.onboarded}`}>
        {body}
      </main>
      {showTabs && <TabBar tab={top?.name === 'record' ? 'home' : tab} onChange={goTab} />}
      {toastMsg && (
        <div className="toast" role="status">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

function RouteView({ ctx, route }: { ctx: AppCtx; route: Route }) {
  switch (route.name) {
    case 'record':
      return <Record ctx={ctx} />;
    case 'settings':
      return <Settings ctx={ctx} />;
    case 'source':
      return <SourcePage ctx={ctx} />;
    case 'rowsteps':
      return <RowStepsPage ctx={ctx} />;
    case 'about':
      return <About ctx={ctx} />;
    case 'privacy':
      return <Privacy ctx={ctx} />;
    case 'colors':
      return <Colors ctx={ctx} item={route.item} pattern={route.pattern} />;
    case 'pattern':
      return <PatternPage ctx={ctx} item={route.item} />;
    case 'share':
      return <ShareView ctx={ctx} id={route.id} />;
    case 'piece':
      return <PieceView ctx={ctx} id={route.id} />;
    case 'bag':
      return <Bag ctx={ctx} pushed />;
  }
}
