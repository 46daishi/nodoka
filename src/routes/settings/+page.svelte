<script>
    import { settings, settingsStorage } from "$lib/settings/store.js";
    import { DEFAULT_SETTINGS } from "$lib/settings/defaults.js";
    import Dropdown from "$lib/components/Dropdown.svelte";
    import Settings from "$lib/components/Settings.svelte";
    import ActionButton from "$lib/components/ActionButton.svelte";

    let localSettings;
    settings.subscribe((value) => {
        localSettings = { ...value };
    });

    let backIcon = "\uf060";
    let trashIcon = "\uf1f8";

    let profiles = [];
    let selectedProfile = "";
    let showNewProfileModal = false;
    let newProfileName = "";
    /** @type {Array<{value: string, label: string}>} */
    $: profileOptions = [
        { value: "new", label: "+ New Profile" },
        ...profiles.map((profile) => ({
            value: profile.id,
            label: profile.name,
        })),
    ];

    function goBack() {
        const newSettings = {
            focusMinutes: localSettings.focusMinutes,
            shortBreakMinutes: localSettings.shortBreakMinutes,
            longBreakMinutes: localSettings.longBreakMinutes,
            longBreakEvery: localSettings.longBreakEvery,
            discordPresence: localSettings.discordPresence,
            autoStartNext: localSettings.autoStartNext,
        };
        settings.set(newSettings);
        window.location.href = "/";
    }

    function loadProfiles() {
        profiles = settingsStorage.getProfiles();
        const currentData = settingsStorage.getSettingsData();
        selectedProfile = currentData
            ? currentData.currentProfileId
            : "default";
    }

    function switchProfile(profileId) {
        if (profileId === "new") {
            showNewProfileModal = true;
            return;
        }

        if (settingsStorage.switchProfile(profileId)) {
            loadProfiles();
            const currentProfileData = profiles.find((p) => p.id === profileId);
            if (currentProfileData) {
                localSettings = { ...currentProfileData.settings };
            }
        }
    }

    function createNewProfile() {
        if (newProfileName.trim()) {
            settingsStorage.addProfile(newProfileName.trim(), DEFAULT_SETTINGS);
            loadProfiles();
            showNewProfileModal = false;
            newProfileName = "";
        }
    }

    function deleteProfile() {
        if (profiles.length > 1) {
            if (
                confirm(
                    `Are you sure you want to delete "${profiles.find((p) => p.id === selectedProfile)?.name}"?`,
                )
            ) {
                settingsStorage.deleteProfile(selectedProfile);
                loadProfiles();
                // Switch to first available profile if we deleted current
                if (profiles.length > 0) {
                    switchProfile(profiles[0].id);
                }
            }
        }
    }

    $: canDeleteProfile = profiles.length > 1;

    loadProfiles();
</script>

<main class="container">
    <h1>Settings</h1>

    <Settings {localSettings} />

    <div class="profile-section">
        <h2>Profile Management</h2>
        <div class="profile-controls">
            <Dropdown
                id="profile-select"
                bind:value={selectedProfile}
                options={profileOptions}
                onChange={(value) => switchProfile(value)}
            />

            <ActionButton
                icon={trashIcon}
                onAction={deleteProfile}
                variant="primary"
                size="small"
                disabled={!canDeleteProfile}
            />
        </div>
    </div>
</main>

<!-- New Profile Modal -->
{#if showNewProfileModal}
    <div class="modal-overlay" on:click={() => (showNewProfileModal = false)}>
        <div class="modal" on:click|stopPropagation>
            <h3>Create New Profile</h3>
            <input
                type="text"
                bind:value={newProfileName}
                placeholder="Profile name"
                class="modal-input"
                on:keydown={(e) => {
                    if (e.key === "Enter") createNewProfile();
                    if (e.key === "Escape") showNewProfileModal = false;
                }}
            />
            <div class="modal-buttons">
                <ActionButton
                    label="Create"
                    onAction={createNewProfile}
                    variant="primary"
                />
                <ActionButton
                    label="Cancel"
                    onAction={() => (showNewProfileModal = false)}
                    variant="secondary"
                />
            </div>
        </div>
    </div>
{/if}

<div class="bottom-nav">
    <ActionButton icon={backIcon} onAction={goBack} variant="primary" />
</div>

<style>
    @font-face {
        font-family: "Symbols Nerd Font";
        src: url("/fonts/SymbolsNerdFont-Regular.ttf") format("truetype");
    }

    :root {
        font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
        font-size: 16px;
        line-height: 24px;
        font-weight: 400;

        color: var(--theme-text, #f6f6f6);
        background-color: var(--theme-background, #2f2f2f);

        font-synthesis: none;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: Antialiased;
        -moz-osx-font-smoothing: grayscale;
        -webkit-text-size-adjust: 100%;
    }

    main {
        background-color: var(--theme-background, #2f2f2f);
        min-height: 100vh;
        transition: background-color 0.3s ease;
    }

    .container {
        margin: 0;
        padding-top: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        min-height: 50vh;
        padding-bottom: 100px;
        background-color: var(--theme-background, #2f2f2f);
    }

    h1 {
        text-align: center;
        margin-bottom: 3rem;
    }

    .bottom-nav {
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 100;
    }

    .unit {
        font-size: 0.8em;
        opacity: 0.8;
    }

    .number-input:focus {
        outline: none;
        border-color: var(--theme-primary, #396cd8);
        background-color: rgba(255, 255, 255, 0.15);
    }

    .profile-section {
        margin-top: 3rem;
        padding-top: 2rem;
        border-top: 1px solid var(--theme-border, rgba(255, 255, 255, 0.1));
    }

    .profile-section h2 {
        text-align: center;
        margin-bottom: 1.5rem;
        font-size: 1.2em;
    }

    .profile-controls {
        display: flex;
        gap: 1rem;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
    }

    /* Modal Styles */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal {
        background-color: var(--theme-surface, #2f2f2f);
        border-radius: 16px;
        padding: 3rem;
        min-width: 100px;
        box-shadow: 0 10px 25px var(--theme-shadow, rgba(0, 0, 0, 0.5));
        border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.1));
    }

    .modal h3 {
        margin-top: 0;
        margin-bottom: 1.5rem;
        text-align: center;
        color: var(--theme-text, #f6f6f6);
    }

    .modal-input {
        min-width: 50px;
        padding: 0.9rem;
        border: 2px solid transparent;
        border-radius: 8px;
        background-color: var(--theme-surface, rgba(255, 255, 255, 0.1));
        color: var(--theme-text, #f6f6f6);
        font-size: 1em;
        margin-bottom: 1.5rem;
        transition: border-color 0.25s;
    }

    .modal-input:focus {
        outline: none;
        border-color: var(--theme-primary, #396cd8);
    }

    .modal-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
    }

    .modal-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
    }
</style>
