import { writable } from "svelte/store";
import brownNoise from "$lib/assets/noise/Brown_Noise.ogg";
import rain from "$lib/assets/noise/Rain_Ambience.ogg";
import fire from "$lib/assets/noise/Fireplace_Ambience.ogg";
import crow from "$lib/assets/noise/CH_Crow_Ambience.ogg";
import computer from "$lib/assets/noise/CH_Computer_Noises.ogg";
import { ICONS } from "$lib/icons";

const STORAGE_KEY = "nodoka-noise";

const DEFAULTS = [
  {
    id: "brown-noise",
    label: "Noise",
    src: brownNoise,
    volume: 0,
    icon: ICONS.unmute,
  },
  { id: "rain", label: "Rain", src: rain, volume: 0, icon: ICONS.rain },
  { id: "fire", label: "Fire", src: fire, volume: 0, icon: ICONS.fire },
  { id: "crow", label: "Crow", src: crow, volume: 0, icon: ICONS.bird },
  {
    id: "computer",
    label: "PC",
    src: computer,
    volume: 0,
    icon: ICONS.monitor,
  },
];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { muted: false, sounds: DEFAULTS };
    const saved = JSON.parse(raw);
    // Merge saved volumes into DEFAULTS so src is always fresh
    return {
      muted: saved.muted ?? false,
      sounds: DEFAULTS.map((d) => ({
        ...d,
        volume: saved.sounds?.find((s) => s.id === d.id)?.volume ?? 0,
      })),
    };
  } catch {
    return { muted: false, sounds: DEFAULTS };
  }
}

function createNoiseStore() {
  const { subscribe, set, update } = writable(loadState());

  function persist(state) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        muted: state.muted,
        sounds: state.sounds.map((s) => ({ id: s.id, volume: s.volume })),
      }),
    );
    return state;
  }

  return {
    subscribe,
    setVolume(id, volume) {
      update((state) =>
        persist({
          ...state,
          sounds: state.sounds.map((s) => (s.id === id ? { ...s, volume } : s)),
        }),
      );
    },
    setMuted(muted) {
      update((state) => persist({ ...state, muted }));
    },
  };
}

export const noiseStore = createNoiseStore();
