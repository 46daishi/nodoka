<script>
    import { noiseStore } from "$lib/stores/noise.js";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import { ICONS } from "$lib/icons.js";

    export let onClose = () => {};
</script>

{#if true}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        on:click={onClose}
    >
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="modal" on:click|stopPropagation>
            <div class="modal-header">
                <h3>Ambient Sounds</h3>
                <ActionButton
                    icon={$noiseStore.muted ? ICONS.mute : ICONS.unmute}
                    onAction={() => noiseStore.setMuted(!$noiseStore.muted)}
                    variant="secondary"
                    size="small"
                />
            </div>

            <div class="sound-list">
                {#each $noiseStore.sounds as sound (sound.id)}
                    <div class="sound-row">
                        <span class="sound-icon nf" aria-hidden="true"
                            >{sound.icon}</span
                        >
                        <span class="sound-label">{sound.label}</span>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={sound.volume}
                            class="sound-slider"
                            class:muted={$noiseStore.muted}
                            on:input={(e) =>
                                noiseStore.setVolume(sound.id, +e.target.value)}
                        />
                    </div>
                {/each}
            </div>

            <div class="modal-actions">
                <button class="modal-btn" on:click={onClose}>Close</button>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-header {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .modal-header h3 {
        margin: 0;
        font-size: 1.1rem;
    }

    .sound-list {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .sound-row {
        display: grid;
        grid-template-columns: 1.5rem 1fr 2fr;
        align-items: center;
        gap: 1rem;
    }

    .sound-icon {
        font-size: 1.4em;
        text-align: center;
    }

    .sound-label {
        font-size: 0.95em;
        color: var(--theme-text, #f6f6f6);
        white-space: nowrap;
    }

    .sound-slider {
        width: 100%;
        accent-color: var(--theme-primary, #36b7bd);
        cursor: pointer;
        transition: opacity 0.2s;
    }

    .sound-slider.muted {
        opacity: 0.4;
    }
</style>
