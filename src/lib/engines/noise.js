import { get } from "svelte/store";
import { noiseStore } from "../stores/noise.js";

class NoiseEngine {
  constructor() {
    this._elements = {}; // id -> HTMLAudioElement
    this._inited = false;
  }

  init() {
    if (this._inited) return;
    if (typeof window === "undefined") return;
    this._inited = true;
    
    this._applyState(get(noiseStore));
    noiseStore.subscribe((state) => this._applyState(state));
  }

  _applyState(state) {
    for (const sound of state.sounds) {
      const effectiveVolume = state.muted ? 0 : sound.volume;
      let audio = this._elements[sound.id];

      if (effectiveVolume > 0) {
        if (!audio) {
          audio = new Audio(sound.src);
          audio.loop = true;
          audio.volume = effectiveVolume;
          this._elements[sound.id] = audio;
          
          audio.play().catch((e) => {
            console.warn(`Failed to play noise element: ${sound.id}`, e);
          });
        } else {
          audio.volume = effectiveVolume;
          if (audio.paused) {
            audio.play().catch(() => {});
          }
        }
      } else {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
          delete this._elements[sound.id];
        }
      }
    }
  }
}

export const noiseEngine = new NoiseEngine();
