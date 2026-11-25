import { callable } from "@decky/api";

export type Position = "above" | "below";

export interface Settings {
  enabled: boolean;
  position: Position;
  route: string;
  debug: boolean;
}

export const DEFAULT_ROUTE = "/library/collections";

export const DEFAULTS: Settings = {
  enabled: true,
  position: "below",
  route: DEFAULT_ROUTE,
  debug: false,
};

const getSettings = callable<[], Partial<Settings>>("get_settings");
const saveSettings = callable<[Settings], boolean>("set_settings");

let current: Settings = { ...DEFAULTS };
const listeners = new Set<() => void>();

export const getCurrent = (): Settings => current;

export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export async function loadSettings(): Promise<Settings> {
  try {
    current = { ...DEFAULTS, ...(await getSettings()) };
  } catch (e) {
    console.error("[Collections Shortcut] Could not load settings", e);
  }
  listeners.forEach((l) => l());
  return current;
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  current = { ...current, ...patch };
  listeners.forEach((l) => l());
  try {
    await saveSettings(current);
  } catch (e) {
    console.error("[Collections Shortcut] Could not save settings", e);
  }
}
