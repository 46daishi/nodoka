/**
 * settingsActions.js
 * Separates profile-switching logic from store management.
 * Returns new state values; let stores handle reactivity.
 */

import { settingsStorage } from "$lib/stores/settings.js";

/**
 * Attempt to switch the active profile.
 * @param {string} profileId
 * @returns {{ settings: Settings, profileId: string, name: string } | null}
 *   Returns the new settings and profile info, or null if switch failed.
 */
export function switchProfileAction(profileId) {
    if (!settingsStorage.switchProfile(profileId)) {
        return null;
    }

    const newSettings = settingsStorage.getCurrentSettings();
    const data = settingsStorage.getSettingsData();
    const profile = data?.profiles.find((p) => p.id === profileId);

    return {
        settings: newSettings,
        profileId,
        name: profile?.name ?? "Default",
    };
}

/**
 * Create a new profile with the given name and settings.
 * @param {string} name
 * @param {Settings} settings
 * @returns {{ id: string, name: string, settings: Settings, isDefault: boolean }}
 */
export function createProfileAction(name, settings) {
    return settingsStorage.addProfile(name, settings);
}

/**
 * Delete a profile and return the fallback profile info (usually "Default").
 * @param {string} profileId
 * @returns {{ profileId: string, name: string } | null} Fallback profile or null if delete failed
 */
export function deleteProfileAction(profileId) {
    if (!settingsStorage.deleteProfile(profileId)) {
        return null;
    }

    // After deletion, resolve what the active profile should be
    const data = settingsStorage.getSettingsData();
    if (!data) return null;

    const profile = data.profiles.find((p) => p.id === data.currentProfileId);
    return {
        profileId: data.currentProfileId,
        name: profile?.name ?? "Default",
    };
}

/**
 * Rename or update a profile's metadata.
 * @param {string} profileId
 * @param {{ name?: string }} updates
 * @returns {boolean} Success
 */
export function updateProfileAction(profileId, updates) {
    return settingsStorage.updateProfile(profileId, updates);
}

/**
 * Reorder profiles (e.g., after drag-and-drop).
 * @param {Array} orderedProfiles
 * @returns {boolean} Success
 */
export function reorderProfilesAction(orderedProfiles) {
    settingsStorage.reorderProfiles(orderedProfiles);
    return true;
}
