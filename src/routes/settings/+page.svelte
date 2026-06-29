<script>
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import {
        settings,
        settingsStorage,
        currentProfile,
        switchProfile,
    } from "$lib/stores/settings.js";
    import { DEFAULT_SETTINGS } from "$lib/defaults/settings.js";
    import { ICONS } from "$lib/icons.js";
    import Settings from "$lib/components/Settings.svelte";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import SelectInput from "$lib/components/SelectInput.svelte";

    // ── Local settings ────────────────────────────────────────────────────────

    let localSettings;
    settings.subscribe((v) => {
        localSettings = { ...v };
    });

    function saveAndGoBack() {
        settings.set({ ...localSettings });
        goto("/");
    }

    // ── Profile management ────────────────────────────────────────────────────

    let profiles = [];

    $: profileOptions = profiles.map((p) => ({ value: p.id, label: p.name }));
    $: canDelete = profiles.length > 1 && $currentProfile.id !== "default";

    function loadProfiles() {
        profiles = settingsStorage.getProfiles();
    }

    /** @param {Event} e */
    function handleProfileChange(e) {
        const id = /** @type {HTMLSelectElement} */ (e.target).value;
        if (!switchProfile(id)) return;
        loadProfiles();
        localSettings = { ...settingsStorage.getCurrentSettings() };
    }

    function deleteProfile() {
        const target = profiles.find((p) => p.id === $currentProfile.id);
        if (
            !target ||
            !confirm(`Delete "${target.name}"? This cannot be undone.`)
        )
            return;
        settingsStorage.deleteProfile($currentProfile.id);
        const data = settingsStorage.getSettingsData();
        const active = data?.profiles.find((p) => p.id === data.currentProfileId);
        currentProfile.set({ id: data.currentProfileId, name: active?.name ?? "Default" });
        loadProfiles();
        settings.set(settingsStorage.getCurrentSettings());
        localSettings = { ...settingsStorage.getCurrentSettings() };
    }

    // ── New-profile modal ─────────────────────────────────────────────────────

    let showModal = false;
    let newName = "";

    function showCreateModal() {
        newName = "";
        showModal = true;
    }

    function createProfile() {
        if (!newName.trim()) return;
        const profile = settingsStorage.addProfile(newName.trim(), { ...DEFAULT_SETTINGS });
        switchProfile(profile.id);
        loadProfiles();
        localSettings = { ...settingsStorage.getCurrentSettings() };
        showModal = false;
    }

    // ── Reorder modal ─────────────────────────────────────────────────────────

    let showReorder = false;
    /** @type {typeof profiles} Working copy manipulated during drag. */
    let reorderList = [];

    function openReorder() {
        reorderList = [...profiles];
        showReorder = true;
    }

    function saveReorder() {
        settingsStorage.reorderProfiles(reorderList);
        loadProfiles();
        showReorder = false;
    }

    function cancelReorder() {
        showReorder = false;
    }

    // ── Drag-and-drop ─────────────────────────────────────────────────────────

    let dragIndex = null;
    let dragOverIndex = null;

    function onDragStart(e, i) {
        dragIndex = i;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", i.toString());
    }

    function onDragOver(e, i) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        dragOverIndex = i;
    }

    function onDrop(e, i) {
        e.preventDefault();
        const from = dragIndex;
        dragIndex = null;
        dragOverIndex = null;
        if (from === null || from === i) return;
        const list = [...reorderList];
        const [moved] = list.splice(from, 1);
        list.splice(i, 0, moved);
        reorderList = list;
    }

    function onDragEnd() {
        dragIndex = null;
        dragOverIndex = null;
    }

    onMount(() => {
        loadProfiles();
    });
</script>

<main class="page settings-page">
    <!-- ── Profile header ── -->
    <header class="settings-header">
        <h1>Settings</h1>
        <div class="profile-row">
            <SelectInput
                options={profileOptions}
                value={$currentProfile.id}
                on:change={handleProfileChange}
            />

            <ActionButton
                icon={ICONS.plus}
                onAction={showCreateModal}
                variant="primary"
                size="tiny"
            />

            <ActionButton
                icon={ICONS.edit}
                onAction={openReorder}
                variant="secondary"
                size="tiny"
                disabled={profiles.length < 2}
            />

            <ActionButton
                icon={ICONS.trash}
                onAction={deleteProfile}
                disabled={!canDelete}
                variant="danger"
                size="tiny"
            />
        </div>
    </header>

    <!-- ── Settings form ── -->
    <div class="form-card">
        <Settings {localSettings} />
    </div>
</main>

<!-- New-profile modal -->
{#if showModal}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        on:click={() => (showModal = false)}
    >
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="modal" on:click|stopPropagation>
            <h3>New Profile</h3>
            <input
                type="text"
                bind:value={newName}
                placeholder="Profile name"
                class="modal-input"
                on:keydown={(e) => {
                    if (e.key === "Enter") createProfile();
                    if (e.key === "Escape") showModal = false;
                }}
            />
            <div class="modal-buttons">
                <ActionButton
                    label="Create"
                    onAction={createProfile}
                    variant="primary"
                />
                <ActionButton
                    label="Cancel"
                    onAction={() => (showModal = false)}
                    variant="secondary"
                />
            </div>
        </div>
    </div>
{/if}

<!-- Reorder profiles modal -->
{#if showReorder}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        on:click={cancelReorder}
    >
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="modal reorder-modal" on:click|stopPropagation>
            <h3>Reorder Profiles</h3>
            <p class="reorder-hint">Drag to rearrange</p>

            <ul class="reorder-list" on:dragover|preventDefault>
                {#each reorderList as profile, i (profile.id)}
                    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                    <li
                        class="reorder-item"
                        class:drag-over={dragOverIndex === i && dragIndex !== i}
                        class:dragging={dragIndex === i}
                        draggable="true"
                        on:dragstart={(e) => onDragStart(e, i)}
                        on:dragover={(e) => onDragOver(e, i)}
                        on:drop={(e) => onDrop(e, i)}
                        on:dragend={onDragEnd}
                    >
                        <span class="drag-handle nf">{ICONS.reorder}</span>
                        <span class="profile-name">{profile.name}</span>
                        {#if profile.isDefault}
                            <span class="default-badge">default</span>
                        {/if}
                    </li>
                {/each}
            </ul>

            <div class="modal-buttons">
                <ActionButton
                    label="Save"
                    onAction={saveReorder}
                    variant="primary"
                />
                <ActionButton
                    label="Cancel"
                    onAction={cancelReorder}
                    variant="secondary"
                />
            </div>
        </div>
    </div>
{/if}

<!-- Fixed back button -->
<div class="bottom-nav">
    <ActionButton
        icon={ICONS.backAlt}
        onAction={saveAndGoBack}
        variant="primary"
    />
</div>

<style>
    /* ── Page shell ── */
    .settings-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 1rem 8rem;
        min-height: 100vh;
        box-sizing: border-box;
    }

    /* ── Header ── */
    .settings-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 4rem 0 1.5rem;
        width: 100%;
        max-width: 520px;
    }

    h1 {
        margin: 0;
    }

    /* ── Form card ── */
    .form-card {
        width: 100%;
        max-width: 520px;
        background: var(--theme-surface, #2d2d2d);
        border: 1px solid var(--theme-border, #404040);
        border-radius: 16px;
        padding: 1.5rem 2rem;
        box-sizing: border-box;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        overflow: hidden;
    }

    /* ── Modal ── */
    .modal {
        background: var(--theme-surface, #2d2d2d);
        border: 1px solid var(--theme-border, #404040);
        border-radius: 16px;
        padding: 2rem;
        width: min(320px, 90vw);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.25rem;
        box-sizing: border-box;
    }

    .modal h3 {
        margin: 0;
    }

    /* ── New profile modal ── */
    .modal-input {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 2px solid transparent;
        border-radius: 8px;
        background-color: var(--theme-background, #1a1a1a);
        color: var(--theme-text, #f6f6f6);
        font-size: 1em;
        box-sizing: border-box;
        transition: border-color 0.2s;
    }

    .modal-input:focus {
        outline: none;
        border-color: var(--theme-primary, #36b7bd);
    }

    .modal-buttons {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
    }

    /* ── Reorder modal ── */
    .reorder-modal {
        width: min(360px, 90vw);
    }

    .reorder-hint {
        margin: -0.5rem 0 0;
        font-size: 0.82rem;
        color: var(--theme-textSecondary, #b3b3b3);
    }

    .reorder-list {
        list-style: none;
        margin: 0;
        padding: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .reorder-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.65rem 0.9rem;
        border-radius: 10px;
        border: 1px solid var(--theme-border, #404040);
        background: var(--theme-background, #1a1a1a);
        cursor: grab;
        user-select: none;
        transition: background 0.15s, border-color 0.15s, opacity 0.15s, transform 0.15s;
    }

    .reorder-item:active {
        cursor: grabbing;
    }

    .reorder-item.dragging {
        opacity: 0.4;
    }

    .reorder-item.drag-over {
        border-color: var(--theme-primary, #36b7bd);
        background: color-mix(in srgb, var(--theme-primary, #36b7bd) 10%, var(--theme-background, #1a1a1a));
        transform: scale(1.02);
    }

    .drag-handle {
        font-size: 1rem;
        color: var(--theme-textSecondary, #b3b3b3);
        flex-shrink: 0;
        line-height: 1;
    }

    .profile-name {
        flex: 1;
        font-size: 0.95rem;
        font-weight: 500;
        color: var(--theme-text, #f6f6f6);
    }

    .default-badge {
        font-size: 0.72rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: var(--theme-primary, #36b7bd);
        background: color-mix(in srgb, var(--theme-primary, #36b7bd) 12%, transparent);
        border: 1px solid color-mix(in srgb, var(--theme-primary, #36b7bd) 35%, transparent);
        border-radius: 100px;
        padding: 0.15em 0.55em;
        flex-shrink: 0;
    }
</style>