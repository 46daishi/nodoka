<script>
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { pomodoro, sessionName, justCompleted } from "$lib/stores/pomodoro.js";
    import {
        settings,
        settingsStorage,
        currentProfile,
        switchProfile,
    } from "$lib/stores/settings.js";
    import { statisticsStorage } from "$lib/stores/stats.js";
    import { ICONS } from "$lib/icons.js";
    import { ANDROID_CLASS } from "$lib/platform.js";
    import SelectInput from "$lib/components/SelectInput.svelte";
    import { autocomplete } from "$lib/actions/autocomplete.js";
    import Countdown from "$lib/components/Countdown.svelte";
    import ThemeSelector from "$lib/components/ThemeSelector.svelte";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import NoiseModal from "$lib/components/NoiseModal.svelte";
    import { modals, openModal, closeModal } from "$lib/stores/modals.js";

    // ── Profile state ────────────────────────────────────────────────────────[...]

    let profiles = [];

    $: profileOptions = profiles.map((p) => ({ value: p.id, label: p.name }));

    function loadProfiles() {
        profiles = settingsStorage.getProfiles();
    }

    /** @param {string} profileId */
    function handleProfileSwitch(profileId) {
        if (!switchProfile(profileId)) return;
        pomodoro.applyProfile($settings);
        loadProfiles();
    }

    onMount(() => {
        if (/Android/i.test(navigator.userAgent)) {
            document.body.classList.add(ANDROID_CLASS);
        }

        loadProfiles();

        function updateScale() {
            // Keeps your vertical behavior exactly the same (only shrinks below 270px height)
            const heightScale = window.innerHeight / 270;
            
            // Low horizontal threshold (only shrinks below 350px width)
            // You can lower this to 320 or 300 if you want it to wait even longer before shrinking
            const widthScale = window.innerWidth / 190; 
            
            // Takes whichever one is smaller to prevent clipping on both axes, capped at 1
            const scale = Math.min(1, heightScale, widthScale);
            
            document.documentElement.style.setProperty("--page-scale", scale);
        }

        updateScale();
        window.addEventListener("resize", updateScale);
        return () => window.removeEventListener("resize", updateScale);
    });

    // ── Session name editing ──────────────────────────────────────────────────

    let editingName = false;
    let localName = "nodoka";
    $: knownNames = statisticsStorage.getKnownSessionNames();

    function startEdit() {
        localName = $sessionName;
        editingName = true;
    }

    function commitName() {
        editingName = false;
        const trimmed = localName.trim();
        sessionName.set(trimmed || "nodoka");
    }

    function cancelEdit() {
        editingName = false;
        localName = $sessionName;
    }

    function focusOnMount(node) {
        node.focus();
        node.select();
    }

    // ── Extension modal ───────────────────────────────────────────────────────

    let extensionMinutes = 5;

    // Captured when the user clicks +, because nextSession() has already advanced
    // sessionType to the upcoming session by then.
    let extensionContext = "Focus";

    function openExtensionModal() {
        const upcoming = $pomodoro.sessionType;
        // nextSession() has already advanced sessionType to the upcoming session.
        // If the upcoming session is a break, the thing that just finished was focus.
        // If the upcoming session is focus/flow, the thing that just finished was a break.
        const upcomingIsBreak =
            upcoming === "Short break" || upcoming === "Long break";
        extensionContext = upcomingIsBreak ? "Focus" : "Break";
        extensionMinutes = 5;
        openModal("extension");
    }

    function confirmExtension() {
        const mins = Math.max(1, Math.round(extensionMinutes));
        closeModal("extension");
        pomodoro.startExtension(mins * 60);
    }

    function cancelExtension() {
        closeModal("extension");
    }

    function focusExtensionInput(node) {
        node.focus();
        node.select();
    }

    // ── Helpers ─────────────────────────────────────────────────────────── [...]

    function togglePlayPause() {
        $pomodoro.isRunning ? pomodoro.stop() : pomodoro.start();
    }

    // Whether the current session is a Flow (count-up focus) session.
    $: isFlowSession = $pomodoro.sessionType === "Flow";

    // In Flow mode remainingSeconds holds elapsed time (counts up from 0).
    // The Countdown component just formats seconds, so we can pass it directly.
    // The component doesn't care about direction — it'll display 0:00, 0:01 etc.

    $: sessionLabel = (() => {
        const t = $pomodoro.sessionType;
        if (t === "Flow") {
            return "Flow";
        }
        if (t === "Focus") {
            return `Focus ${($pomodoro.completedFocusSessions % $settings.longBreakEvery) + 1}`;
        }
        if (t === "Extension") {
            return `Extension (${extensionContext})`;
        }
        return t;
    })();

</script>

<main class="page home">
    {#if editingName}
        <input
            class="name-input"
            bind:value={localName}
            on:blur={commitName}
            use:focusOnMount
            use:autocomplete={{
                names: knownNames,
                onCommit: commitName,
                onCancel: cancelEdit,
            }}
        />
    {:else}
        <h1>
            {$sessionName}
            <button
                class="edit-btn"
                on:click={startEdit}
                disabled={$pomodoro.isRunning}
            >
                <span class="icon nf" aria-hidden="true">{ICONS.edit}</span>
            </button>
        </h1>
    {/if}

    {#if $pomodoro}
        <Countdown seconds={$pomodoro.remainingSeconds} />

        <p class="session-label">
            {sessionLabel}
            {#if $justCompleted && !$pomodoro.isRunning && !$settings.countUp}
                <button class="edit-btn extend-btn" on:click={openExtensionModal}>
                    <span class="icon nf" aria-hidden="true">{ICONS.plus}</span>
                </button>
            {/if}
        </p>

        <div class="timer-controls">
            <ActionButton
                icon={$pomodoro.isRunning ? ICONS.pause : ICONS.play}
                onAction={togglePlayPause}
                variant="primary"
            />
            <ActionButton
                icon={ICONS.reset}
                onAction={pomodoro.reset}
                variant="secondary"
            />
            {#if isFlowSession}
                <!-- Flow mode: Complete button replaces Skip -->
                <ActionButton
                    icon={ICONS.check}
                    onAction={pomodoro.complete}
                    variant="secondary"
                />
            {:else}
                <ActionButton
                    icon={ICONS.skip}
                    onAction={pomodoro.next}
                    variant="secondary"
                />
            {/if}
        </div>

        <div class="profile-picker">
            <SelectInput
                options={profileOptions}
                value={$currentProfile.id}
                on:change={(e) => handleProfileSwitch(e.target.value)}
                disabled={$pomodoro.isRunning}
            />
        </div>

        <a
            class="credit"
            href="https://x.com/46daishi"
            target="_blank"
            rel="noopener noreferrer"
        >
            <img src="46hana.png" alt="" class="credit-icon" />
            nodoka. Made by 46dai
        </a>
    {/if}
</main>

<!-- Fixed left-side navigation -->
<div class="logo">
    <a href="https://x.com/46daishi" target="_blank" rel="noopener noreferrer"><img src="nodoka.png" alt="nodoka" /></a>
</div>
<nav class="side-nav" aria-label="App navigation">
    <div class="nav-actions">
        <ActionButton
            icon={ICONS.settings}
            onAction={() => goto("/settings")}
            variant="secondary"
            size="small"
            disabled={$pomodoro.isRunning}
        />
        <ActionButton
            icon={ICONS.stats}
            onAction={() => goto("/stats")}
            variant="secondary"
            size="small"
            disabled={$pomodoro.isRunning}
        />
        <ThemeSelector />
        <ActionButton
            icon={ICONS.unmute}
            onAction={() => openModal("noise")}
            variant="secondary"
            size="small"
        />
    </div>
</nav>

{#if $modals.noise}
    <NoiseModal onClose={() => closeModal("noise")} />
{/if}

<!-- Extension modal -->
{#if $modals.extension}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="modal-backdrop"
        on:click={cancelExtension}
        on:keydown={(e) => e.key === "Escape" && cancelExtension()}
    >
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="modal" on:click|stopPropagation>
            <h2 class="modal-title">Extend session</h2>
            <p class="modal-sub">How many extra minutes?</p>
            <input
                class="duration-input"
                type="number"
                min="1"
                max="120"
                bind:value={extensionMinutes}
                use:focusExtensionInput
                on:keydown={(e) => e.key === "Enter" && confirmExtension()}
            />
            <div class="modal-actions">
                <button class="modal-btn cancel" on:click={cancelExtension}>
                    Cancel
                </button>
                <button class="modal-btn confirm" on:click={confirmExtension}>
                    Start
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .home {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        text-align: center;
        gap: 1rem;

        transform: scale(var(--page-scale, 1));
        transform-origin: top center;
        height: 100vh;
        overflow: hidden;
    }

    h1 {
        font-size: 1.7em;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        margin-top: 15vh;
        margin-bottom: 0;
    }

    .session-label {
        font-size: 1.2em;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .timer-controls {
        display: flex;
        gap: 1rem;
        align-items: center;
    }

    .profile-picker {
        margin-top: 1.5rem;
        transition: opacity 0.2s ease;
    }

    .logo img {
        width: 50px;
        height: 50px;
        object-fit: contain;
    }

    /* Shared pill button style (edit + extend) */
    .edit-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--theme-surface, #2d2d2d);
        color: var(--theme-text, #ffffff);
        border: 1px solid transparent;
        border-radius: 100px;
        padding: 0.3em 0.4em;
        font-size: 0.45em;
        cursor: pointer;
        box-shadow: 0 4px 8px var(--theme-shadow, rgba(0, 0, 0, 0.3));
        transition: all 0.3s ease;
        transform: translateY(1px);
    }

    .edit-btn:hover:not(:disabled) {
        border-color: var(--theme-primary, #36b7bd);
        background-color: var(--theme-button, #1a1a1a);
        transform: translateY(0px);
    }

    .edit-btn:active {
        transform: translateY(1px);
    }

    .edit-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }

    .extend-btn {
        font-size: 0.55em;
    }

    .name-input {
        background: transparent;
        border: none;
        border-bottom: 2px solid var(--theme-primary, #36b7bd);
        color: var(--theme-text, #ffffff);
        font-size: 1.7em;
        font-weight: bold;
        font-family: inherit;
        text-align: center;
        width: 16ch;
        outline: none;
        margin-top: 15vh;
    }

    /* ── Extension modal ─────────────────────────────────────────────────── */

    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
    }

    .modal {
        background: var(--theme-surface, #2d2d2d);
        border: 1px solid var(--theme-border, #404040);
        border-radius: 16px;
        padding: 2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        min-width: 220px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }

    .modal-title {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--theme-text, #f6f6f6);
    }

    .modal-sub {
        margin: 0;
        font-size: 0.82rem;
        color: var(--theme-textSecondary, #b3b3b3);
    }

    .duration-input {
        background: var(--theme-background, #1a1a1a);
        border: 2px solid var(--theme-border, #404040);
        border-radius: 8px;
        color: var(--theme-text, #f6f6f6);
        font-size: 2rem;
        font-weight: 700;
        font-family: inherit;
        text-align: center;
        width: 5ch;
        padding: 0.3rem 0.5rem;
        outline: none;
        transition: border-color 0.2s;
    }

    .duration-input:focus {
        border-color: var(--theme-primary, #36b7bd);
    }

    .duration-input::-webkit-inner-spin-button,
    .duration-input::-webkit-outer-spin-button {
        -webkit-appearance: none;
    }
    .duration-input[type="number"] {
        -moz-appearance: textfield;
    }

    .modal-actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 0.25rem;
    }

    .modal-btn {
        border: none;
        border-radius: 8px;
        padding: 0.5rem 1.25rem;
        font-size: 0.9rem;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        transition: opacity 0.15s;
    }

    .modal-btn:hover {
        opacity: 0.85;
    }

    .modal-btn.cancel {
        background: var(--theme-background, #1a1a1a);
        color: var(--theme-textSecondary, #b3b3b3);
    }

    .modal-btn.confirm {
        background: var(--theme-primary, #36b7bd);
        color: #fff;
    }

    @media (max-height: 372px) {
        .profile-picker {
            opacity: 0;
            pointer-events: none;
        }

        
    }

    @media (max-height: 450px) {
        .credit {
            opacity: 0 !important;
            pointer-events: none;
        }
    }

    /* ── Credit footer ───────────────────────────────────────────────────── */
    .credit {
        position: fixed;
        bottom: 1.2rem;
        left: 50%;
        transform: translateX(-50%) translateY(0);
        display: flex;
        align-items: center;
        gap: 0.35em;
        font-size: 0.8rem;
        color: var(--theme-textSecondary, #b3b3b3);
        text-decoration: none;
        opacity: 0.30;
        transition: opacity 0.3s ease, transform 0.3s ease;
        white-space: nowrap;
        pointer-events: auto;
    }

    .credit:hover {
        opacity: 1;
        transform: translateX(-50%) translateY(-3px);
    }

    .credit-icon {
        width: 14px;
        height: 14px;
        object-fit: contain;
        opacity: 0.8;
        border-radius: 3px;
    }
</style>