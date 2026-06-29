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

            <ActionButton
                label="Close"
                onAction={onClose}
                variant="secondary"
            />
        </div>
    </div>
{/if}

<style>
    .modal {
        background: var(--theme-background, #2d2d2d);
        border: 1px solid var(--theme-border, #404040);
        border-radius: 16px;
        padding: 2rem;
        width: min(360px, 90vw);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.25rem;
        box-sizing: border-box;
    }

    .modal-header {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .modal-header h3 {
        margin: 0;
    }

    .sound-list {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .sound-row {
        display: grid;
        grid-template-columns: 1.5rem 1fr 2fr;
        align-items: center;
        gap: 1rem;
    }

    .sound-icon {
        font-size: 1.6em;
        text-align: center;
    }

    .sound-label {
        font-size: 1em;
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
