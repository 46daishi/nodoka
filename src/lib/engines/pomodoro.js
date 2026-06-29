import { playSound, SOUNDS } from "$lib/sound.js";
import { notify, MESSAGES } from "$lib/notification.js";
import { discordRPC } from "$lib/rpc.js";
import { get } from "svelte/store";
import { currentProfile } from "$lib/stores/settings";
import { sessionName } from "../stores/pomodoro";
import {
  PRESENCE_DEFAULTS,
  PRESENCE_DETAILS,
  PRESENCE_ICONS,
} from "$lib/defaults/discord.js";

// ─── Session types ────────────────────────────────────────────────────────────

export const SESSION = /** @type {const} */ ({
  FOCUS: "Focus",
  FLOW: "Flow",           // count-up focus session
  SHORT_BREAK: "Short break",
  LONG_BREAK: "Long break",
  EXTENSION: "Extension",
});

// ─── Persistence (sessionStorage — survives page refresh, not tab close) ──────

const STATE_KEY = "nodoka-pomodoro-state";

/** @param {{ completedFocusSessions: number, sessionType: string }} state */
function persistState(state) {
  sessionStorage.setItem(
    STATE_KEY,
    JSON.stringify({
      completedFocusSessions: state.completedFocusSessions,
      sessionType: state.sessionType,
    }),
  );
}

function clearPersistedState() {
  sessionStorage.removeItem(STATE_KEY);
}

function loadPersistedState() {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      completedFocusSessions: parsed.completedFocusSessions ?? 0,
      sessionType: parsed.sessionType ?? SESSION.FOCUS,
    };
  } catch {
    return null;
  }
}

// ─── Engine factory ───────────────────────────────────────────────────────────

/**
 * @param {import("$lib/defaults/settings.js").DEFAULT_SETTINGS} initialSettings
 * @param {{
 *   onFocusDone?: (duration: number, completedAt: string) => void,
 *   onBreakDone?: (duration: number, type: "short"|"long", completedAt: string) => void,
 * }} [callbacks]
 */
export function createEngine(initialSettings, callbacks = {}) {
  let settings = { ...initialSettings };
  const saved = loadPersistedState();

  // ── Mutable state ─────────────────────────────────────────────────────────

  // For count-up sessions remainingSeconds is repurposed as elapsedSeconds.
  // It counts UP from 0 and never triggers a natural end — only complete() does.
  // For all other session types the field retains its original countdown meaning.
  let state = {
    sessionType: saved?.sessionType ?? (settings.countUp ? SESSION.FLOW : SESSION.FOCUS),
    remainingSeconds: 0,
    completedFocusSessions: saved?.completedFocusSessions ?? 0,
    isRunning: false,
  };

  // Initialise remainingSeconds correctly for non-countup starts
  if (!settings.countUp) {
    state.remainingSeconds = _secondsForSession(state.sessionType);
  }

  let _interval = null;
  let _sessionStart = null;
  let _extensionIsFocus = true;
  let _onUpdate = (_s) => {};
  let _onSessionEnd = () => {};

  // ── Helpers ───────────────────────────────────────────────────────────────

  function _emit() {
    _onUpdate({ ...state });
  }

  function _isFlowSession() {
    return state.sessionType === SESSION.FLOW;
  }

  function _isBreakSession() {
    return (
      state.sessionType === SESSION.SHORT_BREAK ||
      state.sessionType === SESSION.LONG_BREAK
    );
  }

  function _secondsForSession(type) {
    if (type === SESSION.FOCUS) return settings.focusMinutes * 60;
    if (type === SESSION.SHORT_BREAK) return settings.shortBreakMinutes * 60;
    if (type === SESSION.LONG_BREAK) return settings.longBreakMinutes * 60;
    return 0;
  }

  /**
   * Calculate break duration from a flow session's elapsed seconds.
   * Returns { breakSeconds, type: "short"|"long" }.
   * @param {number} elapsedSeconds
   */
  function _flowBreakFor(elapsedSeconds) {
    const elapsedMinutes = elapsedSeconds / 60;
    const isLong = elapsedMinutes >= settings.countUpLongBreakThresholdMinutes;
    const pct = isLong
      ? settings.countUpLongBreakPercent
      : settings.countUpBreakPercent;
    const breakSeconds = Math.max(60, Math.round(elapsedSeconds * (pct / 100)));
    return { breakSeconds, type: isLong ? "long" : "short" };
  }

  function _updateDiscord(extra = {}) {
    if (!settings.discordPresence) return;
    discordRPC
      .updatePresence({ ...PRESENCE_DEFAULTS, ...extra })
      .catch(console.warn);
  }

  // ── Core tick ─────────────────────────────────────────────────────────────

  function _tick() {
    if (!state.isRunning) return;

    if (_isFlowSession()) {
      // Count up — remainingSeconds holds elapsed seconds in Flow mode
      state.remainingSeconds += 1;
      _emit();
    } else {
      state.remainingSeconds -= 1;
      if (state.remainingSeconds <= 0) {
        state.remainingSeconds = 0;
        state.isRunning = false;
        _emit();
        _onSessionEnd();
        return;
      }
      _emit();
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  function start() {
    if (_interval) return;
    state.isRunning = true;
    _sessionStart = Date.now();

    _tick();
    _interval = setInterval(_tick, 1000);
    playSound(SOUNDS.START);

    const now = Math.floor(Date.now() / 1000);
    const isFocusLike =
      state.sessionType === SESSION.FOCUS ||
      state.sessionType === SESSION.FLOW ||
      (state.sessionType === SESSION.EXTENSION && _extensionIsFocus);

    _updateDiscord({
      // Flow: elapsed timer via startTimestamp offset by already-accumulated seconds.
      // Non-flow: countdown via endTimestamp.
      ...(_isFlowSession()
        ? { startTimestamp: now - state.remainingSeconds }
        : { endTimestamp: now + state.remainingSeconds }),
      details: isFocusLike
        ? get(sessionName) === "nodoka"
          ? PRESENCE_DETAILS.focusDetails
          : PRESENCE_DETAILS.focusDetails + " - " + get(sessionName)
        : PRESENCE_DETAILS.breakDetails,
      smallText: state.sessionType,
      smallImage: isFocusLike ? PRESENCE_ICONS.focusIcon : PRESENCE_ICONS.breakIcon,
      status: "Profile: " + get(currentProfile).name,
    });
  }

  function stop() {
    if (_interval) {
      clearInterval(_interval);
      _interval = null;
    }
    _sessionStart = null;
    state.isRunning = false;
    _updateDiscord();
    _emit();
  }

  // ── Complete: ends an active Flow session and moves to break (or resets) ──

  /**
   * Called when the user presses "Complete" during a Flow session.
   * Records the elapsed time, then either starts a countdown break or resets
   * the timer back to 0:00 depending on countUpBreaks.
   */
  function complete() {
    if (!_isFlowSession()) return; // safety guard

    const elapsedSeconds = state.remainingSeconds; // count-up elapsed
    const elapsedMinutes = Math.round(elapsedSeconds / 60);
    const completedAt = new Date().toISOString();

    // Record focus stats (minimum 1 minute to avoid noise)
    if (elapsedMinutes > 0) {
      callbacks.onFocusDone?.(elapsedMinutes, completedAt);
    }

    stop();
    playSound(SOUNDS.END);
    notify(MESSAGES.SESSION_END).catch(console.warn);

    if (!settings.countUpBreaks) {
      // No breaks — reset straight back to Flow
      state.sessionType = SESSION.FLOW;
      state.remainingSeconds = 0;
      persistState(state);
      _emit();
      return;
    }

    // Determine break length from elapsed flow time
    const { breakSeconds, type } = _flowBreakFor(elapsedSeconds);

    state.sessionType =
      type === "long" ? SESSION.LONG_BREAK : SESSION.SHORT_BREAK;
    state.remainingSeconds = breakSeconds;
    state.completedFocusSessions += 1;
    persistState(state);
    _emit();

    // After break ends, return to Flow
    const savedOnSessionEnd = _onSessionEnd;
    _onSessionEnd = () => {
      const breakCompletedAt = new Date().toISOString();
      const breakMinutes = Math.round(breakSeconds / 60);
      if (breakMinutes > 0) {
        callbacks.onBreakDone?.(breakMinutes, type, breakCompletedAt);
      }

      playSound(SOUNDS.END);
      notify(MESSAGES.BREAK_END).catch(console.warn);

      _onSessionEnd = savedOnSessionEnd;

      state.sessionType = SESSION.FLOW;
      state.remainingSeconds = 0;
      persistState(state);
      stop();
      _emit();

      if (settings.autoStartNext) setTimeout(start, 1000);
    };

    if (settings.autoStartNext) setTimeout(start, 1000);
  }

  // ── Next session (standard pomodoro) ─────────────────────────────────────

  function nextSession() {
    // In count-up mode, the "skip" concept doesn't exist for Flow sessions.
    // But breaks during count-up are standard countdowns, so nextSession is
    // still wired for those (e.g. skipping a break early).
    if (_isFlowSession()) {
      complete();
      return;
    }

    const totalSeconds = _secondsForSession(state.sessionType);
    const elapsedMinutes = Math.round(
      (totalSeconds - state.remainingSeconds) / 60,
    );

    if (elapsedMinutes > 0) {
      const completedAt = new Date().toISOString();
      if (state.sessionType === SESSION.FOCUS) {
        callbacks.onFocusDone?.(elapsedMinutes, completedAt);
      } else {
        const type =
          state.sessionType === SESSION.SHORT_BREAK ? "short" : "long";
        callbacks.onBreakDone?.(elapsedMinutes, type, completedAt);
      }
    }

    stop();
    playSound(SOUNDS.END);

    if (state.sessionType === SESSION.FOCUS) {
      notify(MESSAGES.SESSION_END).catch(console.warn);
      state.completedFocusSessions += 1;

      const isLong =
        state.completedFocusSessions % settings.longBreakEvery === 0;
      state.sessionType = isLong ? SESSION.LONG_BREAK : SESSION.SHORT_BREAK;
      state.remainingSeconds = _secondsForSession(state.sessionType);
    } else {
      // Break finished — return to the right focus type for this profile
      if (state.sessionType === SESSION.LONG_BREAK)
        state.completedFocusSessions = 0;

      notify(MESSAGES.BREAK_END).catch(console.warn);
      state.sessionType = settings.countUp ? SESSION.FLOW : SESSION.FOCUS;
      state.remainingSeconds = settings.countUp
        ? 0
        : _secondsForSession(SESSION.FOCUS);
    }

    persistState(state);
    _emit();

    if (settings.autoStartNext) setTimeout(start, 1000);
  }

  function reset() {
    stop();
    if (_isFlowSession()) {
      state.remainingSeconds = 0;
    } else {
      state.remainingSeconds = _secondsForSession(state.sessionType);
    }
    persistState(state);
    _emit();
  }

  /**
   * Start an extension timer.
   * @param {number} seconds
   * @param {() => void} [onDone]
   */
  function startExtension(seconds, onDone, extendingType) {
    const snapshot = {
      sessionType: state.sessionType,
      remainingSeconds: state.remainingSeconds,
      completedFocusSessions: state.completedFocusSessions,
    };

    const extendingFocus = extendingType === SESSION.FOCUS || extendingType === SESSION.FLOW;
    const breakType = extendingType === SESSION.SHORT_BREAK ? "short" : "long";

    state.sessionType = SESSION.EXTENSION;
    state.remainingSeconds = seconds;
    state.isRunning = false;
    _emit();

    const savedOnSessionEnd = _onSessionEnd;
    _onSessionEnd = () => {
      const completedAt = new Date().toISOString();
      const duration = Math.round(seconds / 60);
      if (duration > 0) {
        if (extendingFocus) {
          callbacks.onFocusDone?.(duration, completedAt);
        } else {
          callbacks.onBreakDone?.(duration, breakType, completedAt);
        }
      }

      playSound(SOUNDS.END);
      (extendingFocus
        ? notify(MESSAGES.SESSION_END)
        : notify(MESSAGES.BREAK_END)
      ).catch(console.warn);

      state.sessionType = snapshot.sessionType;
      state.remainingSeconds = snapshot.remainingSeconds;
      state.completedFocusSessions = snapshot.completedFocusSessions;
      _onSessionEnd = savedOnSessionEnd;
      stop();
      _emit();
      onDone?.();
    };

    _extensionIsFocus = extendingFocus;
    start();
  }

  /**
   * Apply new settings without resetting a running timer (settings page saves).
   * @param {typeof initialSettings} newSettings
   */
  function updateSettings(newSettings) {
    settings = { ...newSettings };
    if (!state.isRunning) {
      if (settings.countUp && state.sessionType === SESSION.FOCUS) {
        state.sessionType = SESSION.FLOW;
        state.remainingSeconds = 0;
      } else if (!settings.countUp && state.sessionType === SESSION.FLOW) {
        state.sessionType = SESSION.FOCUS;
        state.remainingSeconds = _secondsForSession(SESSION.FOCUS);
      } else if (!_isFlowSession()) {
        state.remainingSeconds = _secondsForSession(state.sessionType);
      }
    }
    _emit();
  }

  /**
   * Apply a full profile switch (stops any running timer).
   * @param {typeof initialSettings} newSettings
   */
  function applyProfile(newSettings) {
    stop();
    settings = { ...newSettings };

    // Reset session type to match new profile's mode
    if (settings.countUp) {
      state.sessionType = SESSION.FLOW;
      state.remainingSeconds = 0;
    } else {
      state.sessionType = SESSION.FOCUS;
      state.remainingSeconds = _secondsForSession(SESSION.FOCUS);
    }

    persistState(state);
    _emit();
  }

  /**
   * @param {(s: typeof state) => void} onUpdate
   * @param {() => void} onSessionEnd
   */
  function subscribe(onUpdate, onSessionEnd) {
    _onUpdate = onUpdate;
    _onSessionEnd = onSessionEnd;
    _emit();
  }

  function getState() {
    return { ...state };
  }

  return {
    start,
    stop,
    reset,
    nextSession,
    complete,
    updateSettings,
    applyProfile,
    startExtension,
    subscribe,
    getState,
  };
}