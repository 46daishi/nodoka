<script>
    import {
        currentMode,
        currentColor,
        themeOptions,
        applyTheme,
    } from "$lib/themes/store.js";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import { slide } from "svelte/transition";
    import { cubicOut, quadOut, cubicInOut, cubicIn } from "svelte/easing";

    let open = false;

    let themeIcon = "\udb80\udfd8";

    $: mode = $currentMode;
    $: color = $currentColor;

    function toggleOpen() {
        open = !open;
    }

    function toggleMode() {
        const newMode = mode === "light" ? "dark" : "light";
        applyTheme(newMode, color);
    }

    function selectColor(colorKey) {
        applyTheme(mode, colorKey);
    }
</script>

<div
    class="theme-selector"
    on:mouseenter={() => (open = true)}
    on:mouseleave={() => (open = false)}
>
    <ActionButton
        icon={themeIcon}
        label=""
        variant="secondary"
        size="small"
        on:mouseenter={() => (open = true)}
        on:mouseleave={() => (open = false)}
    />

    {#if open}
        <div
            class="theme-grid"
            transition:slide={{ duration: 250, easing: cubicInOut, delay: 0 }}
        >
            <button
                class="theme-swatch"
                style="background-color: {$currentMode === 'dark'
                    ? '#ffffff'
                    : '#1a1a1a'}"
                on:click={toggleMode}
            >
            </button>

            {#each themeOptions as theme (theme.value)}
                <button
                    class="theme-swatch {$currentColor === theme.value
                        ? 'selected'
                        : ''}"
                    style="background-color: {theme.colors.primary}"
                    on:click={() => selectColor(theme.value)}
                >
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

    .theme-grid {
        display: grid;
        grid-template-columns: repeat(2, 0.2fr);
        gap: 0.5rem;
        padding-left: 0;
        align-items: center;
        justify-content: center;
    }

    .theme-swatch {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 1px solid var(--theme-border);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
    }

    .dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
    }

    @font-face {
        font-family: "Symbols Nerd Font";
        src: url("/fonts/SymbolsNerdFont-Regular.ttf") format("truetype");
    }
</style>
