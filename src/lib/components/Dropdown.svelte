<script>
    /** @type {string} */
    export let value = "";
    /** @type {Array<{value: string, label: string}>} */
    export let options = [];
    /** @type {string} */
    export let label = "";
    /** @type {string} */
    export let id = "";
    /** @type {(value: string) => void} */
    export let onChange = () => {};
    /** @type {boolean} */
    export let disabled = false;

    let isOpen = false;
    let selectedOption = null;
    let dropdownElement;
    let listboxId;

    /** @param {string} optionValue */
    function selectOption(optionValue) {
        value = optionValue;
        isOpen = false;
        onChange(optionValue);
    }

    /** @param {Event} event */
    function handleOptionClick(event, /** @type {string} */ optionValue) {
        event.stopPropagation();
        selectOption(optionValue);
    }

    /** @param {Event} event */
    function toggleDropdown(event) {
        event.stopPropagation();
        isOpen = !isOpen;
    }

    function closeDropdown() {
        isOpen = false;
    }

    /** @param {KeyboardEvent} event */
    function handleKeydown(event) {
        if (event.key === "Escape") {
            closeDropdown();
        } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleDropdown(event);
        } else if (
            isOpen &&
            (event.key === "ArrowDown" || event.key === "ArrowUp")
        ) {
            event.preventDefault();
            navigateOptions(event.key === "ArrowDown" ? 1 : -1);
        }
    }

    /** @param {number} direction */
    function navigateOptions(direction) {
        const currentIndex = options.findIndex(
            (option) => option.value === value,
        );
        let newIndex = currentIndex + direction;

        if (newIndex < 0) newIndex = options.length - 1;
        if (newIndex >= options.length) newIndex = 0;

        if (options[newIndex]) {
            selectOption(options[newIndex].value);
        }
    }

    $: selectedOption = options.find((option) => option.value === value) || {
        label: "",
    };
    $: listboxId = `listbox-${id || "dropdown"}`;
</script>

<div class="dropdown-group" bind:this={dropdownElement}>
    {#if label}
        <label for={id}>{label}</label>
    {/if}
    <div class="dropdown-container">
        <button
            {id}
            class={`dropdown-button ${disabled ? "disabled" : ""}`}
            on:click={toggleDropdown}
            on:keydown={handleKeydown}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={listboxId}
            role="combobox"
            {disabled}
        >
            <span class="dropdown-text">{selectedOption.label}</span>
            <span class="dropdown-arrow" class:open={isOpen}>▼</span>
        </button>

        {#if isOpen}
            <div id={listboxId} class="dropdown-list" role="listbox">
                {#each options as option}
                    <button
                        class="dropdown-option"
                        class:selected={option.value === value}
                        on:click={(e) => handleOptionClick(e, option.value)}
                        role="option"
                        aria-selected={option.value === value}
                    >
                        {option.label}
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</div>

<!-- Click outside to close -->
<svelte:window
    on:click={closeDropdown}
    on:keydown={(/** @type {KeyboardEvent} */ e) =>
        e.key === "Escape" && closeDropdown()}
/>

<style>
    .dropdown-group {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        position: relative;
    }

    .dropdown-group label {
        font-size: 0.9em;
        opacity: 0.8;
    }

    .dropdown-container {
        position: relative;
        width: 150px;
    }

    .dropdown-button {
        width: 100%;
        padding: 0.6rem;
        border: 1px solid transparent;
        border-radius: 12px;
        background-color: var(--theme-surface, rgba(255, 255, 255, 0.1));
        color: var(--theme-text, #f6f6f6);
        font-size: 0.9em;
        text-align: left;
        transition:
            border-color 0.25s,
            background-color 0.25s;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .dropdown-button:hover {
        border-color: var(--theme-primary, #396cd8);
        background-color: var(--theme-surface, rgba(255, 255, 255, 0.15));
    }

    .dropdown-button:focus {
        outline: none;
        border-color: var(--theme-primary, #396cd8);
        background-color: var(--theme-surface, rgba(255, 255, 255, 0.15));
    }

    .dropdown-text {
        flex: 1;
        text-align: center;
    }

    .dropdown-arrow {
        font-size: 0.8em;
        transition: transform 0.25s;
        opacity: 0.7;
    }

    .dropdown-arrow.open {
        transform: rotate(180deg);
    }

    .dropdown-list {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin-top: 0.25rem;
        border: 1px solid var(--theme-primary, #396cd8);
        border-radius: 12px;
        background-color: var(--theme-surface, #2f2f2f);
        box-shadow: 0 4px 12px var(--theme-shadow, rgba(0, 0, 0, 0.3));
        z-index: 1000;
        max-height: 200px;
        overflow-y: auto;
    }

    .dropdown-option {
        width: 100%;
        padding: 0.3rem 0.2rem;
        border: none;
        background-color: transparent;
        color: var(--theme-text, #f6f6f6);
        font-size: 0.9em;
        text-align: center;
        cursor: pointer;
        transition: background-color 0.15s;
    }

    .dropdown-option:hover,
    .dropdown-option.selected {
        background-color: var(--theme-primary, rgba(57, 108, 216, 0.3));
    }

    .dropdown-option:first-child {
        border-radius: 10px 10px 0 0;
    }

    .dropdown-option:last-child {
        border-radius: 0 0 10px 10px;
    }

    .dropdown-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }

    .dropdown-list::-webkit-scrollbar {
        width: 6px;
    }

    .dropdown-list::-webkit-scrollbar-track {
        background: var(--theme-surface, rgba(255, 255, 255, 0.1));
        border-radius: 3px;
    }

    .dropdown-list::-webkit-scrollbar-thumb {
        background: var(--theme-border, rgba(255, 255, 255, 0.3));
        border-radius: 3px;
    }

    .dropdown-list::-webkit-scrollbar-thumb:hover {
        background: var(--theme-textSecondary, rgba(255, 255, 255, 0.5));
    }
</style>
