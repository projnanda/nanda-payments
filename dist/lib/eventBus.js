let broadcaster = () => { };
export function setBroadcaster(fn) {
    broadcaster = fn;
}
export function emit(payload) {
    try {
        broadcaster(payload);
    }
    catch { }
}
