<script>
    import { settings } from "$lib/settings/store.js";

    export let localSettings;

    function saveSettings() {
        settings.set({ ...localSettings });
    }

    export function saveAndNavigate() {
        saveSettings();
        return true;
    }

    function handleToggleChange() {
        saveSettings();
    }

    function handleInputUnfocus() {
        saveSettings();
    }
</script>

<div class="settings">
    <div class="controls">
        <div class="control-group">
            <label for="focus"> Focus Duration </label>
            <input
                id="focus"
                type="number"
                bind:value={localSettings.focusMinutes}
                min="1"
                class="number-input"
                on:blur={handleInputUnfocus}
            />
            <span class="unit">(minutes)</span>
        </div>

        <div class="control-group">
            <label for="short-break"> Short Break </label>
            <input
                id="short-break"
                type="number"
                bind:value={localSettings.shortBreakMinutes}
                min="1"
                class="number-input"
                on:blur={handleInputUnfocus}
            />
            <span class="unit">(minutes)</span>
        </div>

        <div class="control-group">
            <label for="long-break"> Long Break </label>
            <input
                id="long-break"
                type="number"
                bind:value={localSettings.longBreakMinutes}
                min="1"
                class="number-input"
                on:blur={handleInputUnfocus}
            />
            <span class="unit">(minutes)</span>
        </div>

        <div class="control-group">
            <label for="long-break-every"> Long Break Every </label>
            <input
                id="long-break-every"
                type="number"
                bind:value={localSettings.longBreakEvery}
                min="1"
                class="number-input"
                on:blur={handleInputUnfocus}
            />
            <span class="unit">(sessions)</span>
        </div>

        <div class="control-group">
            <label class="toggle-label">
                <span>Discord Presence</span>
                <div class="toggle-switch">
                    <input
                        type="checkbox"
                        bind:checked={localSettings.discordPresence}
                        on:change={handleToggleChange}
                    />
                    <span class="toggle-slider"></span>
                </div>
            </label>
        </div>

        <div class="control-group">
            <label class="toggle-label">
                <span>Auto-start Next</span>
                <div class="toggle-switch">
                    <input
                        type="checkbox"
                        bind:checked={localSettings.autoStartNext}
                        on:change={handleToggleChange}
                    />
                    <span class="toggle-slider"></span>
                </div>
            </label>
        </div>
    </div>
</div>

<style>
    .settings {
        max-width: 600px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .controls {
        display: flex;
        flex-direction: row;
        gap: 2rem 0;
        max-width: 600px;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
    }

    h2 {
        text-align: center;
        margin-bottom: 2rem;
    }

    .control-group {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        flex: 0 0 calc(50% - 1rem);
    }

    label {
        display: flex;
        flex-direction: column;
        align-items: center;
        font-size: 1.1em;
        gap: 0.3rem;
    }

    .unit {
        font-size: 0.8em;
        opacity: 0.8;
    }

    .number-input {
        width: 60px;
        padding: 0.8rem;
        border: 2px solid transparent;
        border-radius: 12px;
        background-color: var(--theme-surface, rgba(255, 255, 255, 0.1));
        color: var(--theme-text, #f6f6f6);
        font-size: 1em;
        text-align: center;
        transition:
            border-color 0.25s,
            background-color 0.25s;
    }

    .number-input:focus {
        outline: none;
        border-color: var(--theme-primary, #396cd8);
        background-color: var(--theme-surface, rgba(255, 255, 255, 0.15));
    }

    .toggle-label {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        font-size: 1em;
        width: 100%;
    }

    .toggle-switch {
        position: relative;
        width: 50px;
        height: 26px;
    }

    .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--theme-surface, rgba(255, 255, 255, 0.2));
        border-radius: 26px;
        transition: background-color 0.25s;
        border: 2px solid var(--theme-border, rgba(255, 255, 255, 0.1));
    }

    .toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        border-radius: 50%;
        transition: transform 0.25s;
    }

    input:checked + .toggle-slider {
        background-color: var(--theme-primary, #396cd8);
        border-color: var(--theme-primary, #396cd8);
    }

    input:checked + .toggle-slider:before {
        transform: translateX(24px);
    }
</style>
