import { get } from "svelte/store";
import { noiseStore } from "../stores/noise.js";

class NoiseEngine {
  constructor() {
    this._ctx = null;
    this._nodes = {}; // id -> { source, gain }
    this._buffers = {}; // id -> ArrayBuffer
    this._loading = new Set();
    this._inited = false;
  }

  async init() {
    if (this._inited) return;
    if (typeof window === "undefined") return;
    this._inited = true;
    
    noiseStore.subscribe((state) => this._applyState(state));
    await this._applyState(get(noiseStore));
  }

  async _getAudioContext() {
    if (!this._ctx || this._ctx.state === "closed") {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this._ctx.state === "suspended") {
      await this._ctx.resume();
    }
    return this._ctx;
  }

  async _applyState(state) {
    for (const sound of state.sounds) {
      const effectiveVolume = state.muted ? 0 : sound.volume;
      const existing = this._nodes[sound.id];

      if (effectiveVolume > 0) {
        // Update volume live if already playing
        if (existing) {
          existing.gain.gain.value = effectiveVolume;
          continue;
        }

        if (this._loading.has(sound.id)) continue;
        this._loading.add(sound.id);

        try {
          const ctx = await this._getAudioContext();

          // Fetching array buffer works reliably on Linux/WebKitGTK
          if (!this._buffers[sound.id]) {
            const res = await fetch(sound.src);
            this._buffers[sound.id] = await res.arrayBuffer();
          }

          // Abort if state changed to muted while fetching
          const currentState = get(noiseStore);
          const currentSound = currentState.sounds.find(s => s.id === sound.id);
          const currentVol = currentState.muted || !currentSound ? 0 : currentSound.volume;
          
          if (currentVol === 0) {
            this._loading.delete(sound.id);
            continue;
          }

          const decoded = await ctx.decodeAudioData(this._buffers[sound.id].slice());

          const source = ctx.createBufferSource();
          source.buffer = decoded;
          source.loop = true;

          const gain = ctx.createGain();
          gain.gain.value = currentVol;

          source.connect(gain);
          gain.connect(ctx.destination);
          
          // Safe start without absolute 0 timestamp overflow
          source.start();

          this._nodes[sound.id] = { source, gain };
        } catch (e) {
          console.warn(`Failed to start noise ${sound.id}:`, e);
        } finally {
          this._loading.delete(sound.id);
        }

      } else {
        // Clean teardown when muted or volume is 0
        if (existing) {
          try {
            existing.gain.gain.value = 0;
            existing.source.stop();
            existing.source.disconnect();
            existing.gain.disconnect();
          } catch (e) {
            // Ignore cleanup errors
          }
          delete this._nodes[sound.id];
        }
      }
    }
  }
}

export const noiseEngine = new NoiseEngine();
