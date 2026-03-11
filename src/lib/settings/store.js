import { writable } from "svelte/store";
import { DEFAULT_SETTINGS } from "./defaults";

/**
 * @typedef {object} Settings
 * @property {number} focusMinutes
 * @property {number} shortBreakMinutes
 * @property {number} longBreakMinutes
 * @property {number} longBreakEvery
 * @property {boolean} discordPresence
 * @property {boolean} autoStartNext
 */

/**
 * @typedef {object} Profile
 * @property {string} id
 * @property {string} name
 * @property {Settings} settings
 * @property {boolean} isDefault
 */

/**
 * @typedef {object} SettingsData
 * @property {string} currentProfileId
 * @property {Profile[]} profiles
 */

const STORAGE_KEY = "nodoka-settings";

class SettingsStorage {
  constructor() {
    this.initializeStorage();
  }

  initializeStorage() {
    if (!this.getSettingsData()) {
      const defaultData = {
        currentProfileId: "default",
        profiles: [
          {
            id: "default",
            name: "Default",
            settings: { ...DEFAULT_SETTINGS },
            isDefault: true,
          },
        ],
      };
      this.saveSettingsData(defaultData);
    }
  }

  getSettingsData() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Failed to load settings:", error);
      return null;
    }
  }

  saveSettingsData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }

  getCurrentSettings() {
    const data = this.getSettingsData();
    if (!data) return { ...DEFAULT_SETTINGS };

    const currentProfile = data.profiles.find(
      (p) => p.id === data.currentProfileId,
    );
    return currentProfile ? currentProfile.settings : { ...DEFAULT_SETTINGS };
  }

  updateCurrentSettings(settings) {
    const data = this.getSettingsData();
    if (!data) return;

    const profileIndex = data.profiles.findIndex(
      (p) => p.id === data.currentProfileId,
    );
    if (profileIndex !== -1) {
      data.profiles[profileIndex].settings = { ...settings };
      this.saveSettingsData(data);
    }
  }

  getProfiles() {
    const data = this.getSettingsData();
    return data ? data.profiles : [];
  }

  switchProfile(profileId) {
    const data = this.getSettingsData();
    if (!data) return;

    const profile = data.profiles.find((p) => p.id === profileId);
    if (profile) {
      data.currentProfileId = profileId;
      this.saveSettingsData(data);
      return true;
    }
    return false;
  }

  addProfile(name, settings) {
    const data = this.getSettingsData();
    if (!data) return null;

    const newProfile = {
      id: Date.now().toString(),
      name,
      settings: { ...settings },
      isDefault: false,
    };

    data.profiles.push(newProfile);
    this.saveSettingsData(data);
    return newProfile;
  }

  updateProfile(profileId, updates) {
    const data = this.getSettingsData();
    if (!data) return false;

    const profileIndex = data.profiles.findIndex((p) => p.id === profileId);
    if (profileIndex !== -1) {
      data.profiles[profileIndex] = {
        ...data.profiles[profileIndex],
        ...updates,
      };
      this.saveSettingsData(data);
      return true;
    }
    return false;
  }

  deleteProfile(profileId) {
    const data = this.getSettingsData();
    if (!data) return false;

    const profile = data.profiles.find((p) => p.id === profileId);
    if (profile && profile.isDefault) return false; // Cannot delete default profile

    data.profiles = data.profiles.filter((p) => p.id !== profileId);

    // Switch to default if we deleted the current profile
    if (data.currentProfileId === profileId) {
      data.currentProfileId = "default";
    }

    this.saveSettingsData(data);
    return true;
  }
}

const storage = new SettingsStorage();

export const settings = writable(storage.getCurrentSettings());

settings.subscribe((value) => {
  storage.updateCurrentSettings(value);
});

export const settingsStorage = storage;

function getCurrentProfile() {
  const data = storage.getSettingsData();
  return data
    ? {
        id: data.currentProfileId,
        name:
          data.profiles.find((p) => p.id === data.currentProfileId)?.name ??
          "Default",
      }
    : { id: "default", name: "Default" };
}

export const currentProfile = writable(getCurrentProfile());
