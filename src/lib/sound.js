import notificationSound from "$lib/assets/sounds/notification.ogg";
import pianoSound from "$lib/assets/sounds/piano.ogg";

export const SOUNDS = {
  START: notificationSound,
  END: pianoSound,
};

const _ctx = new (window.AudioContext || window.webkitAudioContext)();
const _cache = {};

export async function playSound(src) {
  try {
    if (_ctx.state === "suspended") {
      await _ctx.resume();
    }
    if (!_cache[src]) {
      const res = await fetch(src);
      const buf = await res.arrayBuffer();
      _cache[src] = await _ctx.decodeAudioData(buf);
    }
    const source = _ctx.createBufferSource();
    source.buffer = _cache[src];
    source.connect(_ctx.destination);
    source.start(0);
    source.onended = () => {
      source.disconnect();
    };
  } catch (e) {
    console.error("SOUND ERROR:", e);
  }
}
