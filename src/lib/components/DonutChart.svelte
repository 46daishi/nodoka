<!--
  DonutChart.svelte
  Renders a ring chart with hover-highlighted segments and a center label.
-->
<script>
    import { formatMinutes } from "$lib/utils/chartFormatters.js";

    /**
     * @type {Array<{label: string, value: number, color: string}>}
     */
    export let segments = [];

    /** Text shown in the center of the ring. */
    export let centerLabel = "";
    export let centerSub = "";
    /** When true, legend renders to the right of the chart instead of below. */
    export let legendSide = false;

    const SIZE = 200;
    const CX = SIZE / 2;
    const CY = SIZE / 2;
    const R_OUT = 80;
    const R_IN = 52;

    // Track hovered index rather than the arc object itself, so it stays
    // valid when `arcs` is recomputed after a time-range change.
    let hoveredIdx = null;

    $: total = segments.reduce((s, seg) => s + seg.value, 0);

    $: arcs = (() => {
        if (total === 0) return [];
        let angle = -Math.PI / 2; // start at top
        return segments.map((seg) => {
            const sweep = (seg.value / total) * 2 * Math.PI;
            const start = angle;
            const end = angle + sweep;
            angle = end;
            return { ...seg, start, end, sweep };
        });
    })();

    // Derived convenience — the arc currently under the cursor (or null)
    $: hoveredArc = hoveredIdx !== null ? (arcs[hoveredIdx] ?? null) : null;

    // Reset hover when segments change (e.g. time-range switch)
    $: if (segments) hoveredIdx = null;

    function polar(r, a) {
        return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
    }

    function arcPath(arc, expand = false) {
        const r = expand ? R_OUT + 6 : R_OUT;
        const ri = expand ? R_IN - 4 : R_IN;
        const large = arc.sweep > Math.PI ? 1 : 0;
        const o1 = polar(r, arc.start);
        const o2 = polar(r, arc.end);
        const i1 = polar(ri, arc.end);
        const i2 = polar(ri, arc.start);
        return [
            `M ${o1.x} ${o1.y}`,
            `A ${r} ${r} 0 ${large} 1 ${o2.x} ${o2.y}`,
            `L ${i1.x} ${i1.y}`,
            `A ${ri} ${ri} 0 ${large} 0 ${i2.x} ${i2.y}`,
            "Z",
        ].join(" ");
    }

    $: pct =
        hoveredArc && total > 0
            ? Math.round((hoveredArc.value / total) * 100)
            : null;
</script>

<div class="donut-wrap" class:legend-side={legendSide}>
    <svg width={SIZE} height={SIZE} viewBox="0 0 {SIZE} {SIZE}">
        {#if total === 0}
            <!-- Empty ring -->
            <circle
                cx={CX}
                cy={CY}
                r={(R_OUT + R_IN) / 2}
                fill="none"
                stroke="var(--theme-border,#404040)"
                stroke-width={R_OUT - R_IN}
            />
        {:else}
            {#each arcs as arc, i}
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <path
                    d={arcPath(arc, hoveredIdx === i)}
                    fill={arc.color}
                    opacity={hoveredIdx !== null && hoveredIdx !== i ? 0.4 : 1}
                    style="transition: opacity 0.15s; cursor: pointer;"
                    on:mouseenter={() => (hoveredIdx = i)}
                    on:mouseleave={() => (hoveredIdx = null)}
                />
            {/each}
        {/if}

        <!-- Center text -->
        {#if hoveredArc}
            <text
                x={CX}
                y={CY - 8}
                text-anchor="middle"
                dominant-baseline="middle"
                fill="var(--theme-text,#f6f6f6)"
                font-size="18"
                font-weight="700"
            >
                {pct}%
            </text>
            <text
                x={CX}
                y={CY + 12}
                text-anchor="middle"
                dominant-baseline="middle"
                fill={hoveredArc.color}
                font-size="10"
                font-weight="600"
            >
                {hoveredArc.label}
            </text>
        {:else}
            <text
                x={CX}
                y={CY - 8}
                text-anchor="middle"
                dominant-baseline="middle"
                fill="var(--theme-text,#f6f6f6)"
                font-size="16"
                font-weight="700"
            >
                {centerLabel}
            </text>
            <text
                x={CX}
                y={CY + 12}
                text-anchor="middle"
                dominant-baseline="middle"
                fill="var(--theme-textSecondary,#b3b3b3)"
                font-size="10"
            >
                {centerSub}
            </text>
        {/if}
    </svg>

    <!-- Legend -->
    <div class="legend">
        {#each segments as seg, i}
            <div
                class="leg-row"
                class:dim={hoveredIdx !== null && hoveredIdx !== i}
            >
                <span class="leg-dot" style="background:{seg.color}" />
                <span class="leg-label">{seg.label}</span>
                <span class="leg-val">{formatMinutes(seg.value)}</span>
            </div>
        {/each}
    </div>
</div>

<style>
    .donut-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        padding: 0;
        width: 100%;
    }

    svg {
        flex: 0 0 auto;
        overflow: visible;
    }

    .legend {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-start;
        min-width: 0;
    }

    .donut-wrap.legend-side {
        flex-direction: row;
        align-items: center;
        justify-content: center;
        flex-wrap: nowrap;
    }

    .donut-wrap.legend-side svg {
        flex: 0 0 auto;
    }

    .donut-wrap.legend-side .legend {
        align-self: center;
        min-width: 0;
        overflow: hidden;
        flex-shrink: 1;
    }

    .leg-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.875rem;
        transition: opacity 0.15s;
    }
    .leg-row.dim {
        opacity: 0.35;
    }

    .leg-dot {
        width: 10px;
        height: 10px;
        border-radius: 3px;
        flex-shrink: 0;
    }

    .leg-label {
        color: var(--theme-textSecondary, #b3b3b3);
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .leg-val {
        font-weight: 600;
        color: var(--theme-text, #f6f6f6);
    }
</style>
