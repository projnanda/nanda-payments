type Broadcaster = (payload: any) => void;
let broadcaster: Broadcaster = () => {};

export function setBroadcaster(fn: Broadcaster) {
  broadcaster = fn;
}

export function emit(payload: any) {
  try { broadcaster(payload); } catch {}
}
