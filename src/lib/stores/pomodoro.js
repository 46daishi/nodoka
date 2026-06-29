import { writable, get } from "svelte/store";
import { settings, isSwitchingProfile } from "$lib/stores/settings.js";
import { statisticsStorage } from "$lib/stores/stats.js";
import { createEngine } from "../engines/pomodoro.js";

export const sessionName = writable("nodoka");

// Signals to the UI that a session just finished naturally (not stopped/reset).
// The page uses this to show the extension prompt.
export const justCompleted = writable(false);

// The session type that most recently completed naturally, so startExtension
// can record stats against the right type regardless of what state.sessionType
// currently is (nextSession() has already advanced it to the next session).
let _lastCompletedType = "Focus";

function createPomodoroStore() {
  const engine = createEngine(get(settings), {
    onFocusDone: (duration, completedAt) =>
      statisticsStorage.addFocusSession(duration, completedAt, get(sessionName)),
    onBreakDone: (duration, type, completedAt) =>
      statisticsStorage.addBreakSession(duration, type, completedAt),
  });

  const { subscribe, set } = writable(engine.getState());

  engine.subscribe(
    (state) => set(state),
    () => {
      // Capture NOW before nextSession() advances sessionType.
      _lastCompletedType = engine.getState().sessionType;
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