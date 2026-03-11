<script>
    /** @type {string} */
    export let icon = "";
    /** @type {string} */
    export let label = "";
    /** @type {() => void} */
    export let onAction = () => {};
    /** @type {string} */
    export let variant = "primary"; // primary, secondary, danger
    /** @type {boolean} */
    export let disabled = false;
    /** @type {string} */
    export let size = "default"; // default, small, large

    function handleClick() {
        if (!disabled) {
            onAction();
        }
    }
</script>

<button
    class={`action-button ${variant} ${size} ${disabled ? "disabled" : ""}`}
    on:click={handleClick}
    {disabled}
>
    {#if icon}
        <span class="button-icon">{icon}</span>
    {/if}
    {#if label}
        <span class="button-label">{label}</span>
    {/if}
</button>

<style>
    .action-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        border-radius: 100px;
        border: 1px solid transparent;
        padding: 1em 1.2em;
        font-size: 1em;
        font-weight: 500;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px var(--theme-shadow, rgba(0, 0, 0, 0.3));
        background-color: var(--theme-button, #ffffff);
        color: var(--theme-buttonText, #0f0f0f);
    }

    .action-button:hover:not(:disabled) {
        border-color: var(--theme-primary, #396cd8);
        background-color: var(--theme-surface, #f8f9fa);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px var(--theme-shadow, rgba(0, 0, 0, 0.3));
    }

    .action-button:active:not(:disabled) {
        border-color: var(--theme-primaryHover, #0052a3);
        background-color: var(--theme-surface, #e8e8e8);
    }

    .action-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }

    /* Variants */
    .action-button.primary {
        border-color: var(--theme-primary, #396cd8);
        background-color: var(--theme-primary, #396cd8);
        color: var(--theme-text, #ffffff);
    }

    .action-button.primary:hover:not(:disabled) {
        background-color: var(--theme-primaryHover, #0052a3);
        border-color: var(--theme-primaryHover, #0052a3);
    }

    .action-button.danger {
        border-color: var(--theme-accent, #dc3545);
        background-color: var(--theme-accent, #dc3545);
        color: var(--theme-text, #ffffff);
    }

    .action-button.danger:hover:not(:disabled) {
        background-color: var(--theme-accent, #dc3545b9);
        border-color: var(--theme-accent, #dc3545b9);
    }

    /* Sizes */

    .action-button.xsmall {
        padding: 0.6em 0.1em;
        font-size: 0.5em;
    }

    .action-button.small {
        padding: 0.8em 1em;
        font-size: 1em;
    }

    .action-button.large {
        padding: 1.2em 1.5em;
        font-size: 1.1em;
    }

    .button-icon {
        font-family: "Symbols Nerd Font", monospace;
        font-size: 1.2em;
        line-height: 1;
    }

    .button-label {
        font-weight: 500;
    }

    /* Theme overrides */
    .action-button.secondary {
        background-color: var(--theme-surface, #2d2d2d);
        color: var(--theme-text, #ffffff);
    }

    .action-button.secondary:hover:not(:disabled) {
        background-color: var(--theme-button, #0f0f0f98);
    }
</style>
