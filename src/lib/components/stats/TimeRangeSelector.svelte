<script>
    import { createEventDispatcher } from "svelte";
    /** @type {'week' | '2weeks' | 'month' | 'year' | 'all-time'} */
    export let value = "week";
    /** @type {(newRange: 'week' | '2weeks' | 'month' | 'year' | 'all-time') => void} */
    export let onChange = () => {};
    const dispatch = createEventDispatcher();

    const timeRangeOptions = [
        { value: "week", label: "Last Week" },
        { value: "2weeks", label: "Last 2 Weeks" },
        { value: "month", label: "Last Month" },
        { value: "year", label: "Last Year" },
        { value: "all-time", label: "All Time" },
    ];

    /** @param {Event} event */
    function handleChange(event) {
        console.log("TimeRangeSelector handleChange fired");
        const target = /** @type {HTMLSelectElement} */ (event.target);
        const newValue = target.value;
        console.log("TimeRangeSelector new value:", newValue);
        const typedValue =
            /** @type {'week' | '2weeks' | 'month' | 'year' | 'all-time'} */ (
                newValue
            );
        value = typedValue;
        // Backwards-compatible callback
        onChange(typedValue);
        // Also emit a Svelte event for consumers that listen with on:change
        dispatch("change", { value: typedValue });
    }
</script>

<div class="time-range-selector">
    <select bind:value on:change={handleChange} class="time-range-select">
        {#each timeRangeOptions as option}
            <option value={option.value}>{option.label}</option>
        {/each}
    </select>
</div>

<style>
    .time-range-selector {
        position: relative;
    }

    .time-range-select {
        background-color: var(--theme-surface, #3a3a3a);
        color: var(--theme-text, #f6f6f6);
        border: 2px solid var(--theme-border, #4a4a4a);
        border-radius: 8px;
        padding: 0.75rem 2.5rem 0.75rem 1rem;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        appearance: none;
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
        background-position: right 0.75rem center;
        background-repeat: no-repeat;
        background-size: 1.5rem 1.5rem;
        min-width: 160px;
    }

    .time-range-select:hover {
        border-color: var(--theme-primary, #396cd8);
        background-color: var(--theme-surfaceHover, #4a4a4a);
    }

    .time-range-select:focus {
        outline: none;
        border-color: var(--theme-primary, #396cd8);
        box-shadow: 0 0 0 3px rgba(57, 108, 216, 0.1);
    }

    .time-range-select:active {
        background-color: var(--theme-surfaceActive, #5a5a5a);
    }
</style>
