import { todayISO } from './plan';
import type { AppData } from './types';

const KEY = 'hyrox-doubles-trainer-v1';

export function defaultData(): AppData {
  return {
    version: 1,
    settings: {
      eventDate: '2027-03-13',
      planStart: todayISO(),
      sessionsPerWeek: 3,
      roxzoneAuto: true,
      roxzoneSec: 240,
      freshToRaceFactor: 1.15,
      intervalToRaceFactor: 1.07,
      skillmillFactor: 1.0,
    },
    workouts: [],
    customTemplates: [],
  };
}

export function normalise(raw: unknown): AppData {
  const d = raw as Partial<AppData>;
  if (!d || typeof d !== 'object' || !Array.isArray(d.workouts)) throw new Error('Not a Hyrox trainer backup file');
  const base = defaultData();
  return {
    ...base,
    ...d,
    version: 1,
    settings: { ...base.settings, ...(d.settings ?? {}) },
    customTemplates: d.customTemplates ?? [],
  };
}

export function load(): AppData {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return normalise(JSON.parse(s));
  } catch {
    /* storage blocked or corrupt — start fresh */
  }
  return defaultData();
}

export function save(d: AppData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

/** Ask the browser not to evict our storage (helps on iOS Safari). */
export function requestPersistence() {
  try {
    navigator.storage?.persist?.();
  } catch {
    /* ignore */
  }
}

export function exportFile(d: AppData) {
  const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hyrox-backup-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function importFile(f: File): Promise<AppData> {
  return normalise(JSON.parse(await f.text()));
}
