<script>
    import { currentTheme, themeList, applyTheme } from "$lib/stores/themes.js";
    import ActionButton from "./ActionButton.svelte";
    import { slide } from "svelte/transition";
    import { cubicInOut } from "svelte/easing";
    import { ICONS } from "$lib/icons.js";

    let open = false;

    $: active = $currentTheme;

    function toggle() { open = !open; }
    function close() { open = false; }
    function select(key) { applyTheme(key); }
</script>

<svelte:window on:click={close} />

<div class="theme-selector">
    <div on:click|stopPropagation={toggle}>
        <ActionButton icon={ICONS.theme} variant="secondary" size="small" />
    </div>

    {#if open}
        <div
            class="swatch-grid"
            transition:slide={{ duration: 250, easing: cubicInOut }}
            on:click|stopPropagation
        >
            {#each themeList as theme (theme.value)}
                <button
                    class="swatch"
                    class:active={active === theme.value}
                    title={theme.label}
                    on:click={() => select(theme.value)}
                    aria-pressed={active === theme.value}
                    aria-label="Select {theme.label} theme"
                >
                    <!-- Left half: background colour; right half: primary colour -->
                    <span class="half" style="background:{theme.colors.background}" />
                    <span class="half" style="background:{theme.colors.primary}" />
                </button>
            {/each}
        </div>
    {/if}
</div>

<style>
    .theme-selector {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .swatch-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.4rem;
    }

    .swatch {
        display: flex;
        width: 100%;
        height: 20px;
        border-radius: 6px;
        border: 1px solid var(--theme-border, #404040);
        overflow: hidden;
        cursor: pointer;
        padding: 0;
        transition:
            transform 0.15s,
            box-shadow 0.15s;
    }

    .swatch:hover {
        transform: scale(1.08);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    }

    .swatch.active {
        border-color: var(--theme-primary, #36B7BD);
        box-shadow: 0 0 0 1px var(--theme-primary, #36B7BD);
    }

    .half {
        flex: 1;
        display: block;
    }
</style>