<script>
    import { pomodoro } from "$lib/pomodoro/store";
    import { settingsStorage, settings } from "$lib/settings/store";
    import Countdown from "$lib/components/Countdown.svelte";
    import Dropdown from "$lib/components/Dropdown.svelte";
    import ThemeSelector from "$lib/components/ThemeSelector.svelte";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import { onMount } from "svelte";
    import { sendNotification } from "@tauri-apps/plugin-notification";
    import { initializeTheme } from "$lib/themes/store.js";
    import selectNextTheme from "$lib/components/ThemeSelector.svelte";

    let playIcon = "\uf04b";
    let pauseIcon = "\uf04c";
    let skipIcon = "\udb81\udcac";
    let resetIcon = "\uead2";
    let settingsIcon = "\uf013";
    let themeIcon = "\udb80\udfd8";
    let statsIcon = "\udb80\udd28";

    /** @type {Array<{id: string, name: string, settings: object, isDefault: boolean}>} */
    let profiles = [];
    /** @type {string} */
    let selectedProfile = "";
    /** @type {Number} */
    let longBreakEvery = 1;
    /** @type {Array<{value: string, label: string}>} */
    $: profileOptions = profiles.map((profile) => ({
        value: profile.id,
        label: profile.name,
    }));

    function togglePlayPause() {
        if ($pomodoro.isRunning) {
            pomodoro.stop();
        } else {
            pomodoro.start();
        }
    }

    function goToSettings() {
        window.location.href = "/settings";
    }

    onMount(() => {
        initializeTheme();
    });

    /** @param {string} profileId */
    function switchProfile(profileId) {
        if (settingsStorage.switchProfile(profileId)) {
            const newSettings = settingsStorage.getCurrentSettings();
            settings.set(newSettings);
            loadProfiles();
        }
    }

    function loadProfiles() {
        profiles = settingsStorage.getProfiles();
        const currentData = settingsStorage.getSettingsData();
        selectedProfile = currentData
            ? currentData.currentProfileId
            : "default";
        longBreakEvery = currentData
            ? currentData.profiles.find((x) => x.id === selectedProfile)
                  .settings.longBreakEvery
            : 1;
    }

    onMount(() => {
        loadProfiles();
    });
</script>

<main class="container">
    <h1>Nodoka</h1>

    {#if $pomodoro}
        <Countdown seconds={$pomodoro.remainingSeconds} />

        <p class="session">
            {#if $pomodoro.sessionType === "Focus"}
                Focus {($pomodoro.completedFocusSessions % longBreakEvery) + 1}
            {:else}
                {$pomodoro.sessionType}
            {/if}
        </p>

        <div class="buttons">
            <ActionButton
                icon={$pomodoro.isRunning ? pauseIcon : playIcon}
                onAction={togglePlayPause}
                variant="primary"
            />
            <ActionButton
                icon={resetIcon}
                onAction={pomodoro.reset}
                variant="secondary"
            />
            <ActionButton
                icon={skipIcon}
                onAction={pomodoro.next}
                variant="secondary"
            />
        </div>

        <div class="profile-selector">
            <Dropdown
                id="profile-select"
                label="Profile"
                bind:value={selectedProfile}
                options={profileOptions}
                onChange={(value) => switchProfile(value)}
                disabled={$pomodoro.isRunning}
            />
        </div>
    {/if}
</main>

<div class="top-nav">
    <div class="logo">
        <img src="nodoka.png" alt="Nodoka logo" />
    </div>
    <ActionButton
        icon={settingsIcon}
        onAction={goToSettings}
        variant="secondary"
        size="small"
        disabled={$pomodoro.isRunning}
    />
    <ThemeSelector />
    <ActionButton
        icon={statsIcon}
        variant="secondary"
        size="small"
        onAction={() => (window.location.href = "/stats")}
        disabled={$pomodoro.isRunning}
    />
</div>

<style>
    @font-face {
        font-family: "Symbols Nerd Font";
        src: url("/fonts/SymbolsNerdFont-Regular.ttf") format("truetype");
    }

    .logo img {
        height: 50px;
        width: 50px;
        position: relative;
        object-fit: contain;
    }

    .buttons button {
        font-family: "Symbols Nerd Font";
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
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        -webkit-text-size-adjust: 100%;
    }

    main {
        background-color: var(--theme-background, #2f2f2f);
        min-height: 100vh;
        transition: background-color 0.3s ease;
    }

    .session {
        font-size: 1.2em;
    }

    h1 {
        margin-top: 15vh;
    }

    .container {
        margin: 0;
        padding-top: 0;
        display: flex;
        flex-direction: column;
        justify-content: top;
        text-align: center;
        gap: 1rem;
        background-color: var(--theme-background, #2f2f2f);
        min-height: 100vh;
    }

    h1 {
        text-align: center;
    }

    .buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
        align-items: center;
    }

    .top-nav {
        position: fixed;
        top: 1rem;
        left: 1rem;
        z-index: 100;
    }

    .top-nav {
        position: fixed;
        top: 1rem;
        left: 1rem;
        z-index: 100;
        display: flex;
        gap: 0.5rem;
        align-items: center;
        flex-direction: column;
    }

    .nav-button:hover {
        border-color: var(--theme-primary, #396cd8);
        background-color: var(--theme-primary, #396cd8);
    }

    .nav-button:active {
        border-color: var(--theme-primaryHover, #396cd8);
        background-color: var(--theme-primaryHover, #396cd8);
    }

    .nav-button:hover {
        border-color: var(--theme-primary, #396cd8);
        background-color: var(--theme-primaryHover, #0f0f0fb9);
    }

    .nav-button:active {
        border-color: var(--theme-primaryHover, #396cd8);
        background-color: var(--theme-primaryHover, #0f0f0f69);
    }

    .icon {
        font-family: "Symbols Nerd Font", monospace;
    }

    .profile-selector {
        margin-top: 1.5rem;
    }
</style>
