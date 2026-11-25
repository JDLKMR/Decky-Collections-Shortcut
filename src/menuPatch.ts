import { createElement } from "react";
import { CollectionsIcon } from "./icon";
import { DEFAULT_ROUTE, getCurrent } from "./settings";

/*
 * Steam Menu Injection
 *
 * Steam's main menu renders each navigation entry (Home, Library, Downloads, ...) as an element
 * with props like { route, active, label, icon, onGamepadFocus }. This file hooks the shared JSX
 * runtime (and React.createElement as a fallback) and, whenever the Library entry
 * (route "/library") is created, also creates a copy of it with the label "Collections", the
 * collections icon, and the collections route. Both are returned together in a Fragment, so the
 * new entry is a real sibling of Library with the same styling, navigation behavior, and
 * controller focus handling.
 *
 * With Debug Logging on, menu-related elements are recorded so a report can be saved from the
 * plugin panel (see getDebugReport).
 */

const TAG = "[Collections Shortcut]";
const VERSION = "1.0.0";
const INJECTED_KEY = "collections-shortcut-item";
const NEW_LABEL = "Collections";
const LIBRARY_ROUTE = "/library";
const LIBRARY_LABEL = "library";
const NEIGHBOR_LABELS = ["home", "store", "downloads", "friends", "media", "settings", "power"];
const KNOWN_LABELS = new Set<string>([LIBRARY_LABEL, ...NEIGHBOR_LABELS]);
const LABEL_PROPS = ["children", "label", "title", "text", "name"];

const REACT_ELEMENT = Symbol.for("react.element");
const REACT_TRANSITIONAL_ELEMENT = Symbol.for("react.transitional.element");

const counters: Record<string, number> = { jsx: 0, jsxs: 0, createElement: 0, arraysSeen: 0, injected: 0 };
const hooksInstalled: string[] = [];
const debugEntries: string[] = [];
const debugSeen = new Set<string>();
const MAX_ENTRIES = 60;

let jsxsOriginal: any = null;
let fragmentType: any = null;
let jsxRuntime: any = null;

const isElement = (v: any): boolean =>
  !!v && typeof v === "object" && (v.$$typeof === REACT_ELEMENT || v.$$typeof === REACT_TRANSITIONAL_ELEMENT);

const isPlainObject = (v: any): boolean =>
  !!v && typeof v === "object" && !Array.isArray(v) && !isElement(v) && Object.getPrototypeOf(v) === Object.prototype;

/* ----------------------------- Debug helpers ----------------------------- */

function typeName(type: any): string {
  if (typeof type === "string") return type;
  if (typeof type === "function") return type.displayName || type.name || "anonymous";
  if (type && typeof type === "object") {
    if (type.displayName) return String(type.displayName);
    if (type.type) return `memo(${typeName(type.type)})`;
    if (type.render) return `forwardRef(${typeName(type.render)})`;
    return "object";
  }
  return String(type);
}

function matchLabel(node: any, depth: number): string | null {
  if (typeof node === "string") {
    if (node.length > 20) return null;
    const t = node.trim().toLowerCase();
    return KNOWN_LABELS.has(t) ? t : null;
  }
  if (node == null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const m = matchLabel(node[i], depth);
      if (m) return m;
    }
    return null;
  }
  if (depth <= 0 || !isElement(node)) return null;
  const props = node.props;
  if (!props) return null;
  for (let i = 0; i < LABEL_PROPS.length; i++) {
    const p = props[LABEL_PROPS[i]];
    if (p != null) {
      const m = matchLabel(p, depth - 1);
      if (m) return m;
    }
  }
  return null;
}

function describeNode(node: any, depth: number): string {
  if (typeof node === "string") return JSON.stringify(node.slice(0, 40));
  if (!isElement(node)) return typeof node;
  const props = node.props ?? {};
  const keys: string[] = [];
  const strings: Record<string, string> = {};
  for (const k of Object.keys(props).slice(0, 20)) {
    const v = props[k];
    keys.push(`${k}:${Array.isArray(v) ? "array" : isElement(v) ? `element<${typeName(v.type)}>` : isPlainObject(v) ? "object" : typeof v}`);
    if (typeof v === "string" && v.length < 60) strings[k] = v;
  }
  let out = `${typeName(node.type)} key=${String(node.key)} props=[${keys.join(", ")}] strings=${JSON.stringify(strings)}`;
  if (depth > 0) {
    const c = props.children;
    if (isElement(c)) out += `\n      > ${describeNode(c, depth - 1)}`;
    else if (Array.isArray(c)) {
      c.slice(0, 4).forEach((x: any) => {
        if (isElement(x)) out += `\n      > ${describeNode(x, depth - 1)}`;
      });
    }
  }
  return out;
}

function addEntry(signature: string, text: string) {
  if (!getCurrent().debug || debugSeen.has(signature) || debugEntries.length >= MAX_ENTRIES) return;
  debugSeen.add(signature);
  debugEntries.push(text);
  console.log(TAG, text);
}

function recordArray(type: any, children: any[]) {
  if (!getCurrent().debug || children.length < 2 || children.length > 60) return;
  const labels: string[] = [];
  for (let i = 0; i < children.length; i++) {
    if (isElement(children[i])) {
      const m = matchLabel(children[i], 3);
      if (m) labels.push(m);
    }
  }
  if (!labels.length) return;
  const parent = typeName(type);
  addEntry(
    `array:${parent}:${children.length}:${labels.join(",")}`,
    `ARRAY parent=${parent} count=${children.length} labelsFound=[${labels.join(", ")}]\n` +
      children
        .slice(0, 30)
        .map((c, i) => `  [${i}] ${describeNode(c, 2)}`)
        .join("\n"),
  );
}

function recordLeaf(type: any, props: any) {
  for (const k in props) {
    const v = props[k];
    if (typeof v === "string" && v.length < 60 && v.toLowerCase().indexOf("library") !== -1) {
      addEntry(`leaf:${typeName(type)}:${k}:${v}`, `LEAF ${describeNode({ $$typeof: REACT_ELEMENT, type, key: null, props }, 1)}`);
      return;
    }
  }
}

export function getDebugReport(): string {
  const runtime = (window as any).SP_JSX;
  const lines = [
    `Collections Shortcut ${VERSION} debug report`,
    `Generated: ${new Date().toISOString()}`,
    `Settings: ${JSON.stringify(getCurrent())}`,
    `SP_JSX present: ${!!runtime}${runtime ? ` (keys: ${Object.keys(runtime).join(", ")})` : ""}`,
    `SP_REACT present: ${!!(window as any).SP_REACT}`,
    `Hooks installed: ${hooksInstalled.join(", ") || "none"}`,
    `Counters: ${JSON.stringify(counters)}`,
    `Entries recorded: ${debugEntries.length}`,
    "",
    ...debugEntries,
  ];
  return lines.join("\n");
}

/* ----------------------------- Item building ----------------------------- */

const isLibraryItem = (props: any): boolean =>
  !!props && props.route === LIBRARY_ROUTE && typeof props.label === "string" && !!props.icon;

function collectionsProps(props: any): Record<string, any> {
  const next: Record<string, any> = {
    ...props,
    route: getCurrent().route || DEFAULT_ROUTE,
    label: NEW_LABEL,
    icon: createElement(CollectionsIcon, {}),
  };
  delete next.ref;
  delete next.key;
  return next;
}

function noteInjection(type: any, props: any) {
  counters.injected++;
  addEntry("injected", `INJECTED ${NEW_LABEL} next to ${describeNode({ $$typeof: REACT_ELEMENT, type, key: null, props }, 0)}`);
}

/* -------------------------------- Hooking -------------------------------- */

function replaceMethod(target: any, key: string, patched: any, original: any): (() => void) | null {
  try {
    target[key] = patched;
  } catch {
    /* fall through to defineProperty */
  }
  if (target[key] !== patched) {
    try {
      Object.defineProperty(target, key, { value: patched, configurable: true, writable: true });
    } catch {
      return null;
    }
  }
  return () => {
    if (target[key] === patched) target[key] = original;
  };
}

function hookJsx(runtime: any, key: "jsx" | "jsxs"): (() => void) | null {
  const original = runtime?.[key];
  if (typeof original !== "function") return null;

  const patched = function (this: any, type: any, props: any, ...rest: any[]) {
    counters[key]++;
    if (props) {
      const settings = getCurrent();
      if (settings.debug) {
        recordLeaf(type, props);
        if (Array.isArray(props.children)) {
          counters.arraysSeen++;
          recordArray(type, props.children);
        }
      }
      if (settings.enabled && isLibraryItem(props) && jsxsOriginal && fragmentType) {
        try {
          const libraryEl = original.call(this, type, props, ...rest);
          const collectionsEl = original.call(this, type, collectionsProps(props), INJECTED_KEY);
          const pair = settings.position === "above" ? [collectionsEl, libraryEl] : [libraryEl, collectionsEl];
          noteInjection(type, props);
          return jsxsOriginal.call(jsxRuntime, fragmentType, { children: pair }, rest[0]);
        } catch (e) {
          console.error(TAG, "Injection failed", e);
        }
      }
    }
    return original.call(this, type, props, ...rest);
  };

  return replaceMethod(runtime, key, patched, original);
}

function hookCreateElement(react: any): (() => void) | null {
  const original = react?.createElement;
  if (typeof original !== "function") return null;

  const patched = function (this: any, type: any, props: any, ...rest: any[]) {
    counters.createElement++;
    if (props) {
      const settings = getCurrent();
      if (settings.debug) {
        recordLeaf(type, props);
        if (Array.isArray(props.children)) {
          counters.arraysSeen++;
          recordArray(type, props.children);
        }
      }
      if (settings.enabled && isLibraryItem(props) && fragmentType) {
        try {
          const libraryEl = original.call(this, type, props, ...rest);
          const collectionsEl = original.call(this, type, { ...collectionsProps(props), key: INJECTED_KEY }, ...rest);
          const pair = settings.position === "above" ? [collectionsEl, libraryEl] : [libraryEl, collectionsEl];
          noteInjection(type, props);
          return original.call(this, fragmentType, props.key != null ? { key: props.key } : null, ...pair);
        } catch (e) {
          console.error(TAG, "Injection failed", e);
        }
      }
    }
    return original.call(this, type, props, ...rest);
  };

  return replaceMethod(react, "createElement", patched, original);
}

export function installMenuPatch(): (() => void) | null {
  const runtime = (window as any).SP_JSX;
  const react = (window as any).SP_REACT;
  const restores: Array<() => void> = [];

  jsxRuntime = runtime ?? null;
  jsxsOriginal = runtime?.jsxs ?? null;
  fragmentType = runtime?.Fragment ?? react?.Fragment ?? null;

  if (runtime) {
    for (const key of ["jsx", "jsxs"] as const) {
      const restore = hookJsx(runtime, key);
      if (restore) {
        restores.push(restore);
        hooksInstalled.push(`SP_JSX.${key}`);
      }
    }
  } else {
    console.error(TAG, "SP_JSX is not available");
  }

  const restoreCreate = hookCreateElement(react);
  if (restoreCreate) {
    restores.push(restoreCreate);
    hooksInstalled.push("SP_REACT.createElement");
  }

  (window as any).__collectionsShortcutReport = getDebugReport;

  if (!restores.length) {
    console.error(TAG, "Could not hook the UI renderer");
    return null;
  }
  return () => restores.forEach((r) => r());
}
