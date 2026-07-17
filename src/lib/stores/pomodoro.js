import { writable, get } from "svelte/store";
import { settings, isSwitchingProfile } from "$lib/stores/settings.js";
import { statisticsStorage } from "$lib/stores/stats.js";
import { createEngine, SESSION } from "../engines/pomodoro.js";

export const sessionName = writable("nodoka");

// Signals to the UI that a session just finished naturally (not stopped/reset).
export const justCompleted = writable(false);

let _lastCompletedType = SESSION.FOCUS;

function createPomodoroStore() {
  const engine = createEngine(get(settings), {
    onFocusDone: (duration, completedAt) => {
      _lastCompletedType = SESSION.FOCUS;
      statisticsStorage.addFocusSession(duration, completedAt, get(sessionName));
    },
    onBreakDone: (duration, type, completedAt) => {
      _lastCompletedType = SESSION.SHORT_BREAK;
      statisticsStorage.addBreakSession(duration, type, completedAt);
    },
    onFlowBreakEnd: () => justCompleted.set(true),
    onProfileSwitch: () => { justCompleted.set(false); _lastCompletedType = SESSION.FOCUS; },
  });

  const { subscribe, set } = writable(engine.getState());

  engine.subscribe(
    (state) => set(state),
    () => {
      justCompleted.set(true);
      engine.nextSession();
    },
  );

  settings.subscribe((newSettings) => {
    try {
      if (isSwitchingProfile) {
        engine.applyProfile(newSettings);
      } else {
        engine.updateSettings(newSettings);
      }
    } catch (e) {
      console.error("Failed to update engine settings:", e);
    }
  });

  function start() {
    justCompleted.set(false);
    engine.start();
  }

  function reset() {
    justCompleted.set(false);
    engine.reset();
  }

  function next() {
    justCompleted.set(false);
    engine.nextSession();
  }

  function startExtension(seconds) {
    justCompleted.set(false);
    engine.startExtension(seconds, () => justCompleted.set(true), _lastCompletedType);
  }

  function complete() {
    justCompleted.set(false);
    engine.complete();
  }

  return {
    subscribe,
    start,
    stop: engine.stop,
    reset,
    next,
    complete,
    applyProfile: engine.applyProfile,
    startExtension,
  };
}

export const pomodoro = createPomodoroStore();