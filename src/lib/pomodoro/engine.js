export const SESSION = {
  FOCUS: "Focus",
  SHORT_BREAK: "Short break",
  LONG_BREAK: "Long break",
};

import { playNotificationSound, sounds } from "$lib/sound";
import { notify, messages } from "$lib/notification";
import { discordRPC } from "$lib/discord/discord";
import { PRESENCE_DEFAULTS } from "$lib/discord/defaults";
import { statisticsStorage } from "$lib/statistics/store";

const POMODORO_STORAGE_KEY = "nodoka-pomodoro-state";

function saveState(state) {
  sessionStorage.setItem(
    POMODORO_STORAGE_KEY,
    JSON.stringify({
      completedFocusSessions: state.completedFocusSessions,
      sessionType: state.sessionType,
    }),
  );
}

function clearState() {
  sessionStorage.removeItem(POMODORO_STORAGE_KEY);
}

function loadState() {
  try {
    const saved = sessionStorage.getItem(POMODORO_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return {
      completedFocusSessions: parsed.completedFocusSessions || 0,
      sessionType: parsed.sessionType || SESSION.FOCUS,
    };
  } catch {
    return null;
  }
}

/** @param {Settings} initialSettings */
export function createEngine(initialSettings) {
  let settings = { ...initialSettings };
  const savedState = loadState();

  let state = {
    sessionType: savedState?.sessionType || SESSION.FOCUS,
    remainingSeconds: initialSettings.focusMinutes * 60,
    completedFocusSessions: savedState?.completedFocusSessions || 0,
    isRunning: false,
  };

  let interval = null;
  let sessionStartTime = null;
  let onUpdate = () => {};
  let onSessionEnd = () => {};

  function tick() {
    if (!state.isRunning) return;

    state.remainingSeconds -= 1;

    if (state.remainingSeconds <= 0) {
      state.remainingSeconds = 0;
      state.isRunning = false;
      onUpdate({ ...state });
      onSessionEnd();
      return;
    }

    onUpdate({ ...state });
  }

  function start() {
    if (interval) return;

    state.isRunning = true;
    sessionStartTime = Date.now();

    tick();
    interval = setInterval(tick, 1000);
    playNotificationSound(sounds.START);

    if (settings.discordPresence) {
      const now = Math.floor(Date.now() / 1000);
      discordRPC.updatePresence({
        ...PRESENCE_DEFAULTS,
        endTimestamp: now + state.remainingSeconds,
        details: state.sessionType,
        smallText: state.sessionType,
        smallImage: state.sessionType === SESSION.FOCUS ? "focus" : "break",
        status:
          state.sessionType === SESSION.FOCUS ? "Working..." : "Recharging...",
      });
    }
  }

  function stop() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }

    sessionStartTime = null;
    state.isRunning = false;

    if (settings.discordPresence) {
      discordRPC.updatePresence(PRESENCE_DEFAULTS);
    }

    onUpdate({ ...state });
  }

  function nextSession() {
    const startedAt = sessionStartTime;

    if (startedAt) {
      const duration = Math.round((Date.now() - startedAt) / 60000);

      if (duration > 0) {
        if (state.sessionType === SESSION.FOCUS) {
          statisticsStorage.addFocusSession(
            settings.focusMinutes,
            new Date().toISOString(),
          );
        } else {
          statisticsStorage.addBreakSession(
            duration,
            state.sessionType === SESSION.SHORT_BREAK ? "short" : "long",
            new Date().toISOString(),
          );
        }
      }
    }

    stop();
    playNotificationSound(sounds.END);

    if (state.sessionType === SESSION.FOCUS) {
      notify(messages.SESSION_END);
      state.completedFocusSessions += 1;

      const isLongBreak =
        state.completedFocusSessions % settings.longBreakEvery === 0;

      state.sessionType = isLongBreak
        ? SESSION.LONG_BREAK
        : SESSION.SHORT_BREAK;

      state.remainingSeconds = isLongBreak
        ? settings.longBreakMinutes * 60
        : settings.shortBreakMinutes * 60;
    } else {
      if (state.sessionType === SESSION.LONG_BREAK)
        state.completedFocusSessions = 0;
      notify(messages.BREAK_END);
      state.sessionType = SESSION.FOCUS;
      state.remainingSeconds = settings.focusMinutes * 60;
    }

    saveState(state);
    onUpdate({ ...state });

    if (settings.autoStartNext) {
      setTimeout(start, 1000);
    }
  }

  function reset() {
    stop();

    switch (state.sessionType) {
      case SESSION.FOCUS:
        state.remainingSeconds = settings.focusMinutes * 60;
        break;
      case SESSION.SHORT_BREAK:
        state.remainingSeconds = settings.shortBreakMinutes * 60;
        break;
      case SESSION.LONG_BREAK:
        state.remainingSeconds = settings.longBreakMinutes * 60;
        break;
    }

    saveState(state);
    onUpdate({ ...state });
  }

  function updateSettings(newSettings) {
    settings = { ...newSettings };

    // Update remaining time ONLY if not running
    if (!state.isRunning) {
      if (state.sessionType === SESSION.FOCUS) {
        state.remainingSeconds = settings.focusMinutes * 60;
      } else if (state.sessionType === SESSION.SHORT_BREAK) {
        state.remainingSeconds = settings.shortBreakMinutes * 60;
      } else {
        state.remainingSeconds = settings.longBreakMinutes * 60;
      }
    }

    onUpdate({ ...state });
  }

  function applyProfile(newSettings) {
    stop();
    clearState();

    settings = { ...newSettings };

    state.sessionType = SESSION.FOCUS;
    state.completedFocusSessions = 0;
    state.remainingSeconds = settings.focusMinutes * 60;
    state.isRunning = false;

    // 🔑 THIS IS THE MISSING PIECE
    saveState(state);

    onUpdate({ ...state });
  }

  function subscribe(updateFn, sessionEndFn) {
    onUpdate = updateFn;
    onSessionEnd = sessionEndFn;
    onUpdate({ ...state });
  }

  function getState() {
    return { ...state };
  }

  return {
    start,
    stop,
    nextSession,
    reset,
    subscribe,
    getState,
    updateSettings,
    applyProfile,
  };
}
