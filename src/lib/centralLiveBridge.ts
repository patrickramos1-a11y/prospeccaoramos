// Central Ramos Ao Vivo protocol v1. This copy is self-contained for the app build.
export type CentralLiveContext = { view: string };

type Binding = {
  type: "central-live:bind";
  version: 1;
  roomId: string;
  frameId: string;
  tabId: string;
  role: "controller" | "viewer";
  epoch: number;
  context: CentralLiveContext | null;
};

const CENTRAL_ORIGIN = "https://central-ramos-apps.vercel.app";
const nativeFetch = window.fetch.bind(window);
let binding: Binding | null = null;
let parentOrigin = CENTRAL_ORIGIN;
let applyContext: ((context: CentralLiveContext) => void) | null = null;
let currentContext: CentralLiveContext | null = null;
let lastPublished = "";
let lastApplied = "";
let lastCursorAt = 0;

function acceptedOrigin(origin: string) {
  return origin === CENTRAL_ORIGIN || (import.meta.env.DEV && /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin));
}

function onMessage(event: MessageEvent) {
  if (event.source !== window.parent || !acceptedOrigin(event.origin)) return;
  const data = event.data as (Partial<Omit<Binding, "type">> & { type?: string }) | null;
  if (data?.type === "central-live:unbind" && data.frameId === window.name) {
    binding = null;
    lastApplied = "";
    delete document.documentElement.dataset.centralLiveRole;
    return;
  }
  if (data?.type !== "central-live:bind" || data.version !== 1 ||
      data.frameId !== window.name || !data.roomId || !data.tabId ||
      (data.role !== "controller" && data.role !== "viewer")) return;
  const changed = binding?.roomId !== data.roomId || binding?.epoch !== data.epoch || binding?.role !== data.role;
  binding = data as Binding;
  parentOrigin = event.origin;
  document.documentElement.dataset.centralLiveRole = binding.role;
  window.parent.postMessage({ type: "central-live:capabilities", version: 1,
    roomId: binding.roomId, frameId: binding.frameId, tabId: binding.tabId, epoch: binding.epoch,
    features: ["route", "cursor", "viewer-lock"] }, parentOrigin);
  publishCentralLiveNavigation();
  if (changed) { lastPublished = ""; lastApplied = ""; }
  const incoming = binding.context ? JSON.stringify(binding.context) : "";
  if (binding.context && incoming !== lastApplied && applyContext && (binding.role === "viewer" || changed)) {
    lastApplied = incoming;
    applyContext(binding.context);
  }
  if (binding.role === "controller" && currentContext && !binding.context) publishCentralLiveContext(currentContext);
}

function blockViewerEvent(event: Event) {
  if (binding?.role !== "viewer") return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function onPointer(event: PointerEvent) {
  if (binding?.role !== "controller" || Date.now() - lastCursorAt < 180) return;
  lastCursorAt = Date.now();
  window.parent.postMessage({ type: "central-live:cursor", frameId: binding.frameId, tabId: binding.tabId,
    x: Math.max(0, Math.min(1, event.clientX / window.innerWidth)),
    y: Math.max(0, Math.min(1, event.clientY / window.innerHeight)) }, parentOrigin);
}

export function connectCentralLive(onContext: (context: CentralLiveContext) => void) {
  applyContext = onContext;
  if (window.parent === window) return () => { applyContext = null; };
  window.addEventListener("message", onMessage);
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (binding?.role === "viewer" && method !== "GET" && method !== "HEAD") {
      return Promise.reject(new Error("Modo Ao Vivo: somente leitura para espectadores."));
    }
    return nativeFetch(input, init);
  };
  const events = ["click", "dblclick", "keydown", "keypress", "keyup", "input", "change", "submit", "pointerdown", "pointerup"];
  for (const name of events) document.addEventListener(name, blockViewerEvent, true);
  return () => {
    applyContext = null;
    binding = null;
    lastApplied = "";
    delete document.documentElement.dataset.centralLiveRole;
    window.removeEventListener("message", onMessage);
    window.removeEventListener("pointermove", onPointer);
    window.fetch = nativeFetch;
    for (const name of events) document.removeEventListener(name, blockViewerEvent, true);
  };
}

export function publishCentralLiveContext(context: CentralLiveContext) {
  currentContext = context;
  if (binding?.role !== "controller") return;
  const signature = JSON.stringify(context);
  if (signature === lastPublished) return;
  lastPublished = signature;
  window.parent.postMessage({ type: "central-live:context", frameId: binding.frameId,
    tabId: binding.tabId, context }, parentOrigin);
}

export function publishCentralLiveNavigation() {
  if (window.parent !== window && binding) {
    window.parent.postMessage({ type: "central-ramos-apps:navigation", url: window.location.href }, parentOrigin);
  }
}
