<script>
    import { settings } from "$lib/stores/settings.js";
    import { onMount } from "svelte"; // 1. Import onMount

    /**
     * Local copy of settings — the parent page controls when changes are
     * committed to the store.
     * @type {import("$lib/defaults/settings.js").DEFAULT_SETTINGS}
     */
    export let localSettings;

    let isAndroid = false; // 2. Flag tracking the platform

    /** Persist localSettings to the store (and therefore localStorage). */
    export function save() {
        settings.set({ ...localSettings });
    }

    // 3. Set the flag on mount using the same check as your home page
    onMount(() => {
        isAndroid = /Android/i.test(navigator.userAgent);
    });
</script>

<div class="settings-form">
    <!-- ── Timer ── -->
    <fieldset class="group">
        <div class="legend">Timer</div>

        <!-- Count-up mode toggle — always visible at the top -->
        <div class="row">
            <label for="count-up">Count-up (Flow) mode</label>
            <label class="toggle">
                <input
                    id="count-up"
                    type="checkbox"
                    bind:checked={localSettings.countUp}
                    on:change={save}
                />
                <span class="slider"></span>
            </label>
        </div>

        {#if !localSettings.countUp}
            <!-- ── Standard pomodoro fields ── -->
            <div class="separator"></div>
            <div class="row">
                <label for="focus">Focus time</label>
                <div class="control">
                    <input
                        id="focus"
                        type="number"
                        min="1"
                        bind:value={localSettings.focusMinutes}
                        on:blur={save}
                        class="num-input"
                    />
                    <span class="unit">分</span>
                </div>
            </div>

            <div class="row">
                <label for="short-break">Short break</label>
                <div class="control">
                    <input
                        id="short-break"
                        type="number"
                        min="1"
                        bind:value={localSettings.shortBreakMinutes}
                        on:blur={save}
                        class="num-input"
                    />
                    <span class="unit">分</span>
                </div>
            </div>

            <div class="row">
                <label for="long-break">Long break</label>
                <div class="control">
                    <input
                        id="long-break"
                        type="number"
                        min="1"
                        bind:value={localSettings.longBreakMinutes}
                        on:blur={save}
                        class="num-input"
                    />
                    <span class="unit">分</span>
                </div>
            </div>

            <div class="row">
                <label for="long-break-every">Long break every</label>
                <div class="control">
                    <input
                        id="long-break-every"
                        type="number"
                        min="1"
                        bind:value={localSettings.longBreakEvery}
                        on:blur={save}
                        class="num-input"
                    />
                    <span class="unit">回</span>
                </div>
            </div>
        {:else}
            <!-- ── Count-up / Flow fields ── -->
            <div class="row">
                <label for="countup-breaks">Use breaks</label>
                <label class="toggle">
                    <input
                        id="countup-breaks"
                        type="checkbox"
                        bind:checked={localSettings.countUpBreaks}
                        on:change={save}
                    />
                    <span class="slider"></span>
                </label>
            </div>

            {#if localSettings.countUpBreaks}
                <div class="separator"></div>
                <div class="row">
                    <label for="break-pct">Break</label>
                    <div class="control">
                        <input
                            id="break-pct"
                            type="number"
                            min="1"
                            max="99"
                            bind:value={localSettings.countUpBreakPercent}
                            on:blur={save}
                            class="num-input num-input--wide"
                        />
                        <span class="unit">％</span>
                    </div>
                </div>

                <div class="row">
                    <label for="long-break-threshold">Long break after</label>
                    <div class="control">
                        <input
                            id="long-break-threshold"
                            type="number"
                            min="1"
                            bind:value={localSettings.countUpLongBreakThresholdMinutes}
                            on:blur={save}
                            class="num-input num-input--wide"
                        />
                        <span class="unit">分</span>
                    </div>
                </div>

                <div class="row">
                    <label for="long-break-pct">Long break</label>
                    <div class="control">
                        <input
                            id="long-break-pct"
                            type="number"
                            min="1"
                            max="99"
                            bind:value={localSettings.countUpLongBreakPercent}
                            on:blur={save}
                            class="num-input num-input--wide"
                        />
                        <span class="unit">％</span>
                    </div>
                </div>
            {/if}
        {/if}
    </fieldset>

    <!-- ── Behaviour toggles ── -->
    <fieldset class="group">
        <div class="legend">Behaviour</div>
    
        {#if !isAndroid}
            <div class="row">
                <label for="discord">Discord RPC</label>
                <label class="toggle">
                    <input
                        id="discord"
                        type="checkbox"
                        bind:checked={localSettings.discordPresence}
                        on:change={save}
                    />
                    <span class="slider"></span>
                </label>
            </div>
        {/if}
    
        <div class="row">
            <label for="auto-start">Auto-start</label>
            <div class="toggle">
                <input
                    id="auto-start"
                    type="checkbox"
                    bind:checked={localSettings.autoStartNext}
                    on:change={save}
                />
                <span class="slider" />
            </div>
        </div>
    </fieldset>
</div>

<style>
    /* ── Separator between toggle rows and numeric inputs ── */
    :global(.separator) {
        height: 1px;
        margin: 0.4rem 0.3rem;
        background: var(--theme-textSecondary, #36b7bd);
        opacity: 0.2;
        border-radius: 1px;
    }

    /* ── Shell ── */
    .settings-form {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        width: 100%;
    }

    :global(.form-card) fieldset {
        padding: 0;
        margin: 0;
        min-inline-size: 0;
    }

    /* ── Fieldset / group ── */
    fieldset.group {
        margin: 0;
        padding: 0;
        border: none;
        display: flex;
        flex-direction: column;
        min-inline-size: 0;
    }

    .legend {
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--theme-primary, #36b7bd);
        padding: 0 0 0.5rem 0;
        margin-bottom: 0.5rem;
        width: 100%;
        border-bottom: 1px solid var(--theme-border, #404040);
    }

    /* ── Row: label on left, control on right ── */
    .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.5rem 0.3rem;
        border-radius: 8px;
        transition: background-color 0.2s ease;
    }

    .row:hover {
        background-color: rgba(255, 255, 255, 0.03);
    }

    label {
        font-size: 0.95rem;
        font-weight: 500;
        color: var(--theme-text, #f6f6f6);
        flex-shrink: 0;
        cursor: pointer;
    }

    /* ── Number input + unit ── */
    .control {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
    }

    .num-input {
        width: 24px;
        padding: 0.5rem;
        border: 1px solid var(--theme-border, #404040);
        border-radius: 6px;
        background-color: rgba(0, 0, 0, 0.2);
        color: var(--theme-text, #f6f6f6);
        font-size: 0.9rem;
        font-weight: 500;
        text-align: center;
        transition: all 0.2s ease;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
        -moz-appearance: textfield;
    }

    /* Slightly wider box for 2–3 digit values (%, minutes thresholds) */
    .num-input--wide {
        width: 24px;
    }

    .num-input::-webkit-outer-spin-button,
    .num-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
    }

    .num-input:focus {
        outline: none;
        border-color: var(--theme-primary, #36b7bd);
        background-color: var(--theme-background, #1a1a1a);
        box-shadow: 0 0 0 3px rgba(54, 183, 189, 0.2);
    }

    .unit {
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--theme-textSecondary, #b3b3b3);
        min-width: 0.4rem;
    }

    /* ── Toggle switch ── */
    .toggle {
        position: relative;
        width: 50px;
        height: 26px;
        flex-shrink: 0;
    }

    .toggle input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .slider {
        position: absolute;
        inset: 0;
        background-color: var(--theme-border, #404040);
        border-radius: 26px;
        cursor: pointer;
        transition: background-color 0.3s ease;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .slider::before {
        content: "";
        position: absolute;
        width: 20px;
        height: 20px;
        left: 3px;
        bottom: 3px;
        background: white;
        border-radius: 50%;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    input:checked + .slider {
        background-color: var(--theme-primary, #36b7bd);
    }

    input:checked + .slider::before {
        transform: translateX(24px);
    }
</style>