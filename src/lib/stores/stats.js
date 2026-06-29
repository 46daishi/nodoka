import { writable } from "svelte/store";
import { sanitizeStatisticsData } from "../sanitizer.js";

/**
 * @typedef {{
 *   studyMinutes: number,
 *   breakMinutes: number,
 *   completedSessions: number,
 *   focusSessions: Array<{duration: number, completedAt: string, sessionName: string}>,
 *   breakSessions: Array<{duration: number, type: string, completedAt: string}>,
 * }} DailyStats
 *
 * @typedef {{
 *   dailyStats: Record<string, DailyStats>,
 *   totalStats: { allTimeStudyMinutes: number, allTimeBreakMinutes: number, allTimeSessions: number },
 * }} StatisticsData
 */

const STORAGE_KEY = "nodoka-statistics";

const EMPTY_DAY = () => ({
  studyMinutes: 0,
  breakMinutes: 0,
  completedSessions: 0,
  focusSessions: [],
  breakSessions: [],
});

const EMPTY_TOTALS = () => ({
  allTimeStudyMinutes: 0,
  allTimeBreakMinutes: 0,
  allTimeSessions: 0,
});

// ─── Storage class ────────────────────────────────────────────────────────────

class StatisticsStorage {
  constructor() {
    this._ensureInitialized();
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /** @returns {StatisticsData | null} */
  _read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /** @param {StatisticsData} data */
  _write(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save statistics:", e);
    }
  }

  _ensureInitialized() {
    if (!this._read()) {
      this._write({ dailyStats: {}, totalStats: EMPTY_TOTALS() });
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /** @returns {StatisticsData | null} */
  getStatisticsData() {
    return this._read();
  }

  /** @param {string} date  ISO date string (YYYY-MM-DD) */
  getDailyStats(date) {
    return this._read()?.dailyStats[date] ?? EMPTY_DAY();
  }

  /**
   * Merge partial updates into a day's stats.
   * @param {string} date
   * @param {Partial<DailyStats>} updates
   */
  _updateDay(date, updates) {
    const data = this._read();
    if (!data) return;
    data.dailyStats[date] = {
      ...EMPTY_DAY(),
      ...data.dailyStats[date],
      ...updates,
    };
    this._write(data);
  }

  /**
   * Record a completed focus session.
   * @param {number} duration  minutes
   * @param {string} completedAt  ISO datetime string
   */
  addFocusSession(duration, completedAt, sessionName = "nodoka") {
    const date = new Date(completedAt).toISOString().split("T")[0];
    const day = this.getDailyStats(date);
    this._updateDay(date, {
      studyMinutes: day.studyMinutes + duration,
      completedSessions: day.completedSessions + 1,
      focusSessions: [
        ...day.focusSessions,
        { duration, completedAt, sessionName },
      ],
    });
    this._bumpTotals({ allTimeStudyMinutes: duration, allTimeSessions: 1 });
  }

  /**
   * Record a completed break session.
   * @param {number} duration  minutes
   * @param {"short" | "long"} type
   * @param {string} completedAt  ISO datetime string
   */
  addBreakSession(duration, type, completedAt) {
    const date = new Date(completedAt).toISOString().split("T")[0];
    const day = this.getDailyStats(date);
    this._updateDay(date, {
      breakMinutes: day.breakMinutes + duration,
      breakSessions: [...day.breakSessions, { duration, type, completedAt }],
    });
    this._bumpTotals({ allTimeBreakMinutes: duration });
  }

  /** @param {Partial<StatisticsData["totalStats"]>} deltas */
  _bumpTotals(deltas) {
    const data = this._read();
    if (!data) return;
    data.totalStats = {
      ...data.totalStats,
      allTimeStudyMinutes:
        data.totalStats.allTimeStudyMinutes + (deltas.allTimeStudyMinutes ?? 0),
      allTimeBreakMinutes:
        data.totalStats.allTimeBreakMinutes + (deltas.allTimeBreakMinutes ?? 0),
      allTimeSessions:
        data.totalStats.allTimeSessions + (deltas.allTimeSessions ?? 0),
    };
    this._write(data);
  }

  /**
   * Return sanitized daily stats filtered to the given time range.
   * @param {"week" | "2weeks" | "month" | "year" | "all-time"} range
   */
  getStatsByTimeRange(range) {
    const data = this._read();
    if (!data) return [];

    const now = new Date();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    /** @type {Record<string, number>} */
    const RANGE_DAYS = { week: 7, "2weeks": 14, month: 30, year: 365 };
    const cutoff =
      range === "all-time"
        ? new Date(0)
        : new Date(now.getTime() - RANGE_DAYS[range] * MS_PER_DAY);

    const raw = Object.entries(data.dailyStats)
      .filter(([date]) => {
        try {
          return new Date(date) >= cutoff;
        } catch {
          return false;
        }
      })
      .map(([date, stats]) => ({
        date,
        studyMinutes: stats.studyMinutes,
        breakMinutes: stats.breakMinutes,
        completedSessions: stats.completedSessions,
      }));

    return sanitizeStatisticsData(raw);
  }

  /**
   * Return a deduplicated, sorted list of all session names ever used.
   * Excludes the default "nodoka" label so the autocomplete only surfaces
   * names the user actually typed.
   * @returns {string[]}
   */
  getKnownSessionNames() {
    const data = this._read();
    if (!data) return [];
    const names = new Set();
    for (const day of Object.values(data.dailyStats)) {
      for (const session of day.focusSessions ?? []) {
        if (session.sessionName && session.sessionName !== "nodoka") {
          names.add(session.sessionName);
        }
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }

  /** @returns {StatisticsData["totalStats"]} */
  getTotalStats() {
    return this._read()?.totalStats ?? EMPTY_TOTALS();
  }

  clearAllStatistics() {
    this._write({ dailyStats: {}, totalStats: EMPTY_TOTALS() });
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const statisticsStorage = new StatisticsStorage();

// ─── Svelte store ─────────────────────────────────────────────────────────────

export const statistics = writable(
  statisticsStorage.getStatisticsData() ?? {
    dailyStats: {},
    totalStats: EMPTY_TOTALS(),
  },
);
