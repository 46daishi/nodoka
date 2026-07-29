import notificationSound from "$lib/assets/sounds/notification.ogg";
import pianoSound from "$lib/assets/sounds/piano.ogg";

export const SOUNDS = {
  START: notificationSound,
  END: pianoSound,
};

let ctx = null;
const cache = {};

// Helper to reliably get/create an active AudioContext
function getAudioContext() {
  if (!ctx || ctx.state === "closed") {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    ctx = new AudioContextClass({ latencyHint: "interactive" });
  }
  return ctx;
}

// Unlock audio context on first user interaction
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    const audioCtx = getAudioContext();
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };

  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);
}

// Fetch sound buffer
async function loadBuffer(src) {
  if (cache[src]) return cache[src];

  try {
    const res = await fetch(src);
    const arrayBuffer = await res.arrayBuffer();
    const audioCtx = getAudioContext();
    
    // Fallback for older WebKit syntax using callback if promise-based decode fails
    const decodedBuffer = await new Promise((resolve, reject) => {
      audioCtx.decodeAudioData(arrayBuffer, resolve, reject);
    });

    cache[src] = decodedBuffer;
    return decodedBuffer;
  } catch (err) {
    console.error("Failed to load or decode audio sound:", err);
    return null;
  }
}

export async function playSound(src) {
  try {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;

    // Ensure audio context is running
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    // Fetch / retrieve cached buffer
    const buffer = await loadBuffer(src);
    if (!buffer) return;

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    
    source.start(0);

    source.onended = () => {
      source.disconnect();
    };
  } catch (e) {
    console.error("SOUND ERROR:", e);
  }
}
