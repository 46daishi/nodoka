import { writable } from "svelte/store";
import { DEFAULT_SETTINGS } from "../defaults/settings.js";

/**
 * @typedef {{
 *   focusMinutes: number,
 *   shortBreakMinutes: number,
 *   longBreakMinutes: number,
 *   longBreakEvery: number,
 *   countUp: boolean,
 *   countUpBreaks: boolean,
 *   countUpBreakPercent: number,
 *   countUpLongBreakThresholdMinutes: number,
 *   countUpLongBreakPercent: number,
 *   discordPresence: boolean,
 *   autoStartNext: boolean,
 * }} Settings
 *
 * @typedef {{ id: string, name: string, settings: Settings, isDefault: boolean }} Profile
 * @typedef {{ currentProfileId: string, profiles: Profile[] }} SettingsData
 */

const STORAGE_KEY = "nodoka-settings";

// ─── Storage class ────────────────────────────────────────────────────────────

class SettingsStorage {
  constructor() {
    this._ensureInitialized();
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  _read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? /** @type {SettingsData} */ (JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  }

  _write(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }

  _ensureInitialized() {
    if (this._read()) return;
    this._write({
      currentProfileId: "default",
      profiles: [
        {
          id: "default",
          name: "Default",
          settings: { ...DEFAULT_SETTINGS },
          isDefault: true,
        },
      ],
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /** @returns {SettingsData | null} */
  getSettingsData() {
    return this._read();
  }

  /** @returns {Settings} */
  getCurrentSettings() {
    const data = this._read();
    if (!data) return { ...DEFAULT_SETTINGS };
    const profile = data.profiles.find((p) => p.id === data.currentProfileId);
    return profile ? { ...profile.settings } : { ...DEFAULT_SETTINGS };
  }

  /** @param {Settings} settings */
  updateCurrentSettings(settings) {
    const data = this._read();
    if (!data) return;
    const idx = data.profiles.findIndex((p) => p.id === data.currentProfileId);
    if (idx !== -1) {
      data.profiles[idx].settings = { ...settings };
      this._write(data);
    }
  }

  /** @returns {Profile[]} */
  getProfiles() {
    return this._read()?.profiles ?? [];
  }

  /**
   * Replace the stored profile list with a reordered copy.
   * The active profile and all profile data are preserved; only the order changes.
   * @param {Profile[]} ordered
   */
  reorderProfiles(ordered) {
    const data = this._read();
    if (!data) return;
    // Guard: the incoming list must contain exactly the same ids.
    const existingIds = new Set(data.profiles.map((p) => p.id));
    const same =
      ordered.length === data.profiles.length &&
      ordered.every((p) => existingIds.has(p.id));
    if (!same) return;
    data.profiles = ordered;
    this._write(data);
  }

  /**
   * Switch the active profile.
   * @param {string} profileId
   * @returns {boolean} whether the switch succeeded
   */
  switchProfile(profileId) {
    const data = this._read();
    if (!data) return false;
    if (!data.profiles.find((p) => p.id === profileId)) return false;
    data.currentProfileId = profileId;
    this._write(data);
    return true;
  }

  /**
   * Create a new profile.
   * @param {string} name
   * @param {Settings} settings
   * @returns {Profile}
   */
  addProfile(name, settings) {
    const data = this._read() ?? { currentProfileId: "default", profiles: [] };
    const profile = {
      id: Date.now().toString(),
      name,
      settings: { ...settings },
      isDefault: false,
    };
    data.profiles.push(profile);
    this._write(data);
    return profile;
  }

  /**
   * Rename or update a profile's metadata (not its settings).
   * @param {string} profileId
   * @param {Partial<Profile>} updates
   */
  updateProfile(profileId, updates) {
    const data = this._read();
    if (!data) return false;
    const idx = data.profiles.findIndex((p) => p.id === profileId);
    if (idx === -1) return false;
    data.profiles[idx] = { ...data.profiles[idx], ...updates };
    this._write(data);
    return true;
  }

  /**
   * Delete a profile. The default profile cannot be deleted.
   * Falls back to "default" if the active profile is deleted.
   * @param {string} profileId
   */
  deleteProfile(profileId) {
    const data = this._read();
    if (!data) return false;
    const target = data.profiles.find((p) => p.id === profileId);
    if (!target || target.isDefault) return false;

    data.profiles = data.profiles.filter((p) => p.id !== profileId);
    if (data.currentProfileId === profileId) {
      data.currentProfileId = "default";
    }
    this._write(data);
    return true;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const settingsStorage = new SettingsStorage();

// ─── Svelte stores ────────────────────────────────────────────────────────────

export const settings = writable(settingsStorage.getCurrentSettings());

// Keep localStorage in sync whenever the store changes.
settings.subscribe((value) => settingsStorage.updateCurrentSettings(value));

// ─── Derived current-profile info (id + name) ─────────────────────────────────

function _resolveCurrentProfile() {
  const data = settingsStorage.getSettingsData();
  if (!data) return { id: "default", name: "Default" };
  const profile = data.profiles.find((p) => p.id === data.currentProfileId);
  return { id: data.currentProfileId, name: profile?.name ?? "Default" };
}

export const currentProfile = writable(_resolveCurrentProfile());

// ─── Profile switching ────────────────────────────────────────────────────────

export let isSwitchingProfile = false;

export function switchProfile(profileId) {
  if (!settingsStorage.switchProfile(profileId)) return false;
  isSwitchingProfile = true;
  const newSettings = settingsStorage.getCurrentSettings();
  settings.set(newSettings);
  isSwitchingProfile = false;
  const data = settingsStorage.getSettingsData();
  const profile = data?.profiles.find((p) => p.id === profileId);
  currentProfile.set({ id: profileId, name: profile?.name ?? "Default" });
  return true;
}