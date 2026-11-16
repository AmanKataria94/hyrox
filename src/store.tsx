import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { runModel, type ModelResult } from './model';
import { load, requestPersistence, save } from './storage';
import type { AppData } from './types';

interface Store {
  data: AppData;
  model: ModelResult;
  update: (fn: (d: AppData) => AppData) => void;
  replace: (d: AppData) => void;
  saveFailed: boolean;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => requestPersistence(), []);
  useEffect(() => setSaveFailed(!save(data)), [data]);
  const model = useMemo(() => runModel(data), [data]);
  const value = useMemo<Store>(
    () => ({ data, model, update: (fn) => setData((d) => fn(structuredClone(d))), replace: setData, saveFailed }),
    [data, model, saveFailed],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

// ---- tiny hash router: works on any static host / sub-path, no server config ----
export function useRoute(): [string, (to: string) => void] {
  const get = () => window.location.hash.replace(/^#/, '') || '/';
  const [route, setRoute] = useState(get);
  useEffect(() => {
    const on = () => {
      setRoute(get());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [route, (to) => (window.location.hash = to)];
}
