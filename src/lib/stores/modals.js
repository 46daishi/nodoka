/**
 * modals.js
 * Centralized modal state management.
 * Instead of scattering modal booleans throughout components,
 * define all modals here and use actions to control them.
 */

import { writable } from "svelte/store";

/**
 * @typedef {{
 *   noise: boolean,
 *   extension: boolean,
 * }} ModalState
 */

/**
 * Create the initial modal state.
 * @returns {ModalState}
 */
function createInitialState() {
    return {
        noise: false,
        extension: false,
    };
}

const { subscribe, set, update } = writable(createInitialState());

/**
 * Toggle a specific modal open/closed.
 * @param {string} name - The modal name (e.g. "noise", "extension")
 */
export function toggleModal(name) {
    update((state) => ({
        ...state,
        [name]: !state[name],
    }));
}

/**
 * Open a specific modal.
 * @param {string} name
 */
export function openModal(name) {
    update((state) => ({
        ...state,
        [name]: true,
    }));
}

/**
 * Close a specific modal.
 * @param {string} name
 */
export function closeModal(name) {
    update((state) => ({
        ...state,
        [name]: false,
    }));
}

/**
 * Close all modals at once.
 */
export function closeAllModals() {
    set(createInitialState());
}

export const modals = { subscribe };
