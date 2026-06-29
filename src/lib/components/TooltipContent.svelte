<!--
  TooltipContent.svelte
  Reusable tooltip rendering for BarChart and LineChart.
  Handles date formatting, series rows, and optional total.
-->
<script>
    import { formatDate, formatValue } from "$lib/utils/chartFormatters.js";

    /** The data point being hovered (object with date, series values, etc.) */
    export let dataPoint = null;

    /** Array of series configs: { key, label, color } */
    export let series = [];

    /** Unit for formatting values ("m" for minutes) */
    export let unit = "";

    /** If true, omit the total row and rows with zero values */
    export let filterZeroRows = false;

    $: total = dataPoint
        ? series.reduce((s, ser) => s + (dataPoint[ser.key] ?? 0), 0)
        : 0;
</script>

{#if dataPoint}
    <div class="tt-date">{formatDate(dataPoint.date)}</div>
    {#each series as ser}
        {@const val = dataPoint[ser.key] ?? 0}
        {#if !filterZeroRows || val !== 0}
            <div class="tt-row">
                <span class="tt-dot" style="background:{ser.color}" />
                <span class="tt-label">{ser.label}</span>
                <span class="tt-val">{formatValue(val, unit)}</span>
            </div>
        {/if}
    {/each}
    {#if series.length > 1 && !filterZeroRows}
        <div class="tt-total">Total {formatValue(total, unit)}</div>
    {/if}
{/if}

<style>
    .tt-date {
        font-weight: 600;
        margin-bottom: 6px;
        color: var(--theme-textSecondary, #b3b3b3);
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    .tt-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 3px 0;
    }

    .tt-dot {
        width: 8px;
        height: 8px;
        border-radius: 2px;
        flex-shrink: 0;
    }

    .tt-label {
        flex: 1;
        color: var(--theme-textSecondary, #b3b3b3);
        padding-right: 12px;
    }

    .tt-val {
        font-weight: 600;
    }

    .tt-total {
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid var(--theme-border, #404040);
        font-weight: 600;
        text-align: right;
        font-size: 0.82rem;
    }
</style>
