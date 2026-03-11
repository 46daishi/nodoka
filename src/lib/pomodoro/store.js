import { writable, get } from "svelte/store";
import { settings } from "../settings/store";
import { createEngine } from "./engine";

function createPomodoroStore() {
  const engine = createEngine(get(settings));
  const { subscribe, set } = writable(engine.getState());

  engine.subscribe(
    /** @param {{sessionType: string, remainingSeconds: number, completedFocusSessions: number, isRunning: boolean}} state */
    (state) => set(state),
    () => engine.nextSession(),
  );

  settings.subscribe((newSettings) => {
    try {
      engine.updateSettings(newSettings);
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  });

  return {
    subscribe,
    start: engine.start,
    stop: engine.stop,
    reset: engine.reset,
    next: engine.nextSession,
  };
}

export const pomodoro = createPomodoroStore();
