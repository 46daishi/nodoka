import { writable } from "svelte/store";
import { sanitizeStatisticsData } from "./sanitizer.js";

/**
 * @typedef {object} DailyStats
 * @property {number} studyMinutes
 * @property {number} breakMinutes
 * @property {number} completedSessions
 * @property {Array<{duration: number, completedAt: string}>} focusSessions
 * @property {Array<{duration: number, type: string, completedAt: string}>} breakSessions
 */

/**
 * @typedef {object} StatisticsData
 * @property {Record<string, DailyStats>} dailyStats
 * @property {object} totalStats
 * @property {number} totalStats.allTimeStudyMinutes
 * @property {number} totalStats.allTimeBreakMinutes
 * @property {number} totalStats.allTimeSessions
 */

const STORAGE_KEY = "nodoka-statistics";

class StatisticsStorage {
  constructor() {
    this.initializeStorage();
  }

  initializeStorage() {
    if (!this.getStatisticsData()) {
      const defaultData = {
        dailyStats: {},
        totalStats: {
          allTimeStudyMinutes: 0,
          allTimeBreakMinutes: 0,
          allTimeSessions: 0,
        },
      };
      this.saveStatisticsData(defaultData);
    }
  }

  getStatisticsData() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Failed to load statistics:", error);
      return null;
    }
  }

  saveStatisticsData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save statistics:", error);
    }
  }

  getDailyStats(date) {
    const data = this.getStatisticsData();
    if (!data || !data.dailyStats[date]) {
      return {
        studyMinutes: 0,
        breakMinutes: 0,
        completedSessions: 0,
        focusSessions: [],
        breakSessions: [],
      };
    }
    return data.dailyStats[date];
  }

  updateDailyStats(date, updates) {
    const data = this.getStatisticsData();
    if (!data) return;

    if (!data.dailyStats[date]) {
      data.dailyStats[date] = {
        studyMinutes: 0,
        breakMinutes: 0,
        completedSessions: 0,
        focusSessions: [],
        breakSessions: [],
      };
    }

    data.dailyStats[date] = { ...data.dailyStats[date], ...updates };
    this.saveStatisticsData(data);
  }

  addFocusSession(duration, completedAt) {
    const date = new Date(completedAt).toISOString().split("T")[0];
    const dailyStats = this.getDailyStats(date);

    const updatedStats = {
      studyMinutes: dailyStats.studyMinutes + duration,
      completedSessions: dailyStats.completedSessions + 1,
      focusSessions: [...dailyStats.focusSessions, { duration, completedAt }],
    };

    this.updateDailyStats(date, updatedStats);
    this.updateTotalStats("study", duration);
    this.updateTotalStats("sessions", 1);
  }

  addBreakSession(duration, type, completedAt) {
    const date = new Date(completedAt).toISOString().split("T")[0];
    const dailyStats = this.getDailyStats(date);

    const updatedStats = {
      breakMinutes: dailyStats.breakMinutes + duration,
      breakSessions: [
        ...dailyStats.breakSessions,
        { duration, type, completedAt },
      ],
    };

    this.updateDailyStats(date, updatedStats);
    this.updateTotalStats("break", duration);
  }

  updateTotalStats(type, amount) {
    const data = this.getStatisticsData();
    if (!data) return;

    switch (type) {
      case "study":
        data.totalStats.allTimeStudyMinutes += amount;
        break;
      case "break":
        data.totalStats.allTimeBreakMinutes += amount;
        break;
      case "sessions":
        data.totalStats.allTimeSessions += amount;
        break;
    }

    this.saveStatisticsData(data);
  }

  getStatsByTimeRange(range) {
    const data = this.getStatisticsData();
    if (!data) return [];

    const now = new Date();
    let cutoffDate;

    switch (range) {
      case "week":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "2weeks":
        cutoffDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "all-time":
        cutoffDate = new Date("1970-01-01"); // Beginning of time
        break;
      default:
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const rawData = Object.entries(data.dailyStats)
      .filter(([date]) => {
        try {
          const dateObj = new Date(date);
          return dateObj >= cutoffDate;
        } catch (error) {
          console.warn("Invalid date in dailyStats:", date);
          return false;
        }
      })
      .map(([date, stats]) => ({
        date,
        studyMinutes: stats.studyMinutes,
        breakMinutes: stats.breakMinutes,
        completedSessions: stats.completedSessions,
      }));

    const result = sanitizeStatisticsData(rawData);
    return result;
  }

  getTotalStats() {
    const data = this.getStatisticsData();
    return data
      ? data.totalStats
      : {
          allTimeStudyMinutes: 0,
          allTimeBreakMinutes: 0,
          allTimeSessions: 0,
        };
  }

  clearAllStatistics() {
    const defaultData = {
      dailyStats: {},
      totalStats: {
        allTimeStudyMinutes: 0,
        allTimeBreakMinutes: 0,
        allTimeSessions: 0,
      },
    };
    this.saveStatisticsData(defaultData);
  }
}

const storage = new StatisticsStorage();

export const statistics = writable(
  storage.getStatisticsData() || {
    dailyStats: {},
    totalStats: {
      allTimeStudyMinutes: 0,
      allTimeBreakMinutes: 0,
      allTimeSessions: 0,
    },
  },
);

export const statisticsStorage = storage;
