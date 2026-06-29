import { get } from "svelte/store";
import { noiseStore } from "../stores/noise.js";

class NoiseEngine {
  constructor() {
    this._ctx = null;
    this._nodes = {}; // id -> { source, gain }
    this._buffers = {}; // id -> ArrayBuffer (compressed, small)
    this._loading = new Set();
    this._inited = false;
  }

  async init() {
    if (this._inited) return;
    if (typeof window === "undefined") return;
    this._inited = true;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    await this._applyState(get(noiseStore));
    noiseStore.subscribe((state) => this._applyState(state));
  }

  async _load(sound) {
    if (this._loading.has(sound.id)) return;
    this._loading.add(sound.id);
    try {
      if (!this._buffers[sound.id]) {
        const res = await fetch(sound.src);
        this._buffers[sound.id] = await res.arrayBuffer();
      }
      const decoded = await this._ctx.decodeAudioData(
        this._buffers[sound.id].slice(),
      );

      const source = this._ctx.createBufferSource();
      source.buffer = decoded;
      source.loop = true;

      const gain = this._ctx.createGain();
      gain.gain.value = 0;

      source.connect(gain);
      gain.connect(this._ctx.destination);
      source.start(0);

      this._nodes[sound.id] = { source, gain };
    } catch (e) {
      console.warn(`Failed to load noise: ${sound.id}`, e);
    } finally {
      this._loading.delete(sound.id);
    }
  }

  _unload(id) {
    const node = this._nodes[id];
    if (!node) return;
    node.gain.gain.value = 0;
    node.source.stop();
    node.source.disconnect();
    node.gain.disconnect();
    delete this._nodes[id];
  }

  async _applyState(state) {
    for (const sound of state.sounds) {
      const effective = state.muted ? 0 : sound.volume;
      if (sound.volume > 0) {
        if (!this._nodes[sound.id] && !this._loading.has(sound.id)) {
          await this._load(sound);
        }
        if (this._nodes[sound.id]) {
          this._nodes[sound.id].gain.gain.value = effective;
        }
      } else {
        this._unload(sound.id);
      }
    }
  }
}

export const noiseEngine = new NoiseEngine();
