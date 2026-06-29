<script>
    import { formatDate, formatValue, calculateNiceMax, calculateLabelStep } from "$lib/utils/chartFormatters.js";
    import TooltipContent from "$lib/components/TooltipContent.svelte";

    export let data = [];
    export let series = [];
    export let unit = "";
    export let mode = "stacked"; // "stacked" | "grouped"
    /** When true, tooltip rows with a zero value are hidden. */
    export let filterZeroTooltip = false;

    const MARGIN = { top: 16, right: 16, bottom: 48, left: 48 };
    const H = 260;
    let W = 0; // starts at 0; bind:clientWidth fills it before first paint
    let wrapEl;

    const uid = Math.random().toString(36).slice(2, 8);

    $: innerW = Math.max(W - MARGIN.left - MARGIN.right, 1);
    $: innerH = H - MARGIN.top - MARGIN.bottom;

    let tooltip = null;

    // ── Scale ──────────────────────────────────────────────────────────── [...]

    $: maxRaw =
        mode === "stacked"
            ? Math.max(
                  ...data.map((d) =>
                      series.reduce((s, ser) => s + (d[ser.key] ?? 0), 0),
                  ),
                  1,
              )
            : Math.max(
                  ...data.flatMap((d) => series.map((ser) => d[ser.key] ?? 0)),
                  1,
              );

    $: yMax = calculateNiceMax(maxRaw);

    $: yTicks = Array.from({ length: 5 }, (_, i) => (yMax / 4) * i);

    // ── X layout — fully reactive so every resize recalculates ───────────────

    $: barGroupW = innerW / Math.max(data.length, 1);
    $: barPad = Math.min(barGroupW * 0.18, 10);
    $: groupW = Math.max(barGroupW - barPad * 2, 1);
    $: barW =
        mode === "grouped"
            ? Math.max(groupW / Math.max(series.length, 1), 1)
            : groupW;

    // ── Bar geometry — reactive derived array ─────────────────────────────────

    $: bars = data.flatMap((d, gi) => {
        const gx = gi * barGroupW + barPad;
        if (mode === "stacked") {
            let yOff = 0;
            return series
                .map((ser) => {
                    const val = d[ser.key] ?? 0;
                    const bh = (val / yMax) * innerH;
                    const by = innerH - yOff - bh;
                    yOff += bh;
                    return {
                        x: gx,
                        y: by,
                        h: Math.max(bh, 0),
                        w: barW,
                        color: ser.color,
                        label: ser.label,
                        val,
                        gi,
                        d,
                    };
                })
                .filter((b) => b.h > 0);
        }
        return series
            .map((ser, si) => {
                const val = d[ser.key] ?? 0;
                const bh = (val / yMax) * innerH;
                return {
                    x: gx + si * barW,
                    y: innerH - bh,
                    h: Math.max(bh, 0),
                    w: barW,
                    color: ser.color,
                    label: ser.label,
                    val,
                    gi,
                    d,
                };
            })
            .filter((b) => b.h > 0);
    });

    $: labelStep = calculateLabelStep(data.length);

    $: xLabels = data
        .map((d, gi) => ({ d, gi, x: gi * barGroupW + barPad + groupW / 2 }))
        .filter((_, gi) => gi % labelStep === 0);

    // ── Tooltip ─────────────────────────────────────────────────────────── [...]

    function updateTooltip(e, d, gi) {
        if (!wrapEl) return;
        const rect = wrapEl.getBoundingClientRect();
        tooltip = { x: e.clientX - rect.left, y: e.clientY - rect.top, d, gi };
    }
    function onBarLeave() {
        tooltip = null;
    }

    $: ttX = tooltip ? Math.min(tooltip.x + 14, W - 164) : 0;
    $: ttY = tooltip ? Math.max(tooltip.y - 10, 4) : 0;

    $: if (data || W) tooltip = null;
</script>

<div class="chart-wrap" bind:clientWidth={W} bind:this={wrapEl}>
    {#if W > 0 && data.length === 0}
        <div class="empty">No data for this period</div>
    {:else if W > 0}
        <!-- width/height as plain pixel attrs; no viewBox, no CSS override.
             W is measured from bind:clientWidth so it's always exact.        -->
        <svg width={W} height={H}>
            <defs>
                <clipPath id="bar-clip-{uid}">
                    <rect x="0" y="0" width={innerW} height={innerH} />
                </clipPath>
            </defs>

            <g transform="translate({MARGIN.left},{MARGIN.top})">
                <!-- Grid + Y labels -->
                {#each yTicks as tick}
                    {@const y = innerH - (tick / yMax) * innerH}
                    <line
                        x1="0"
                        x2={innerW}
                        y1={y}
                        y2={y}
                        stroke="var(--theme-border,#404040)"
                        stroke-width="1"
                        stroke-dasharray="3,3"
                        opacity="0.4"
                    />
                    <text
                        x="-6"
                        {y}
                        text-anchor="end"
                        dominant-baseline="middle"
                        fill="var(--theme-textSecondary,#b3b3b3)"
                        font-size="10"
                    >
                        {formatValue(tick, unit)}
                    </text>
                {/each}

                <!-- Bars clipped to plot area -->
                <g clip-path="url(#bar-clip-{uid})">
                    {#each bars as b (`${b.gi}-${b.label}`)}
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <rect
                            x={b.x}
                            y={b.y}
                            width={b.w}
                            height={b.h}
                            fill={b.color}
                            rx="2"
                            ry="2"
                            opacity={tooltip && tooltip.gi !== b.gi ? 0.3 : 1}
                            style="transition:opacity 0.1s;cursor:pointer;"
                            on:mouseenter={(e) => updateTooltip(e, b.d, b.gi)}
                            on:mousemove={(e) => updateTooltip(e, b.d, b.gi)}
                            on:mouseleave={onBarLeave}
                        />
                    {/each}
                </g>

                <!-- X labels -->
                {#each xLabels as lbl}
                    <text
                        x={lbl.x}
                        y={innerH + 18}
                        text-anchor="middle"
                        fill="var(--theme-textSecondary,#b3b3b3)"
                        font-size="10"
                    >
                        {formatDate(lbl.d.date)}
                    </text>
                {/each}

                <!-- Baseline -->
                <line
                    x1="0"
                    x2={innerW}
                    y1={innerH}
                    y2={innerH}
                    stroke="var(--theme-border,#404040)"
                    stroke-width="1"
                />
            </g>
        </svg>

        {#if tooltip}
            <div class="tooltip" style="left:{ttX}px;top:{ttY}px;">
                <TooltipContent dataPoint={tooltip.d} {series} {unit} filterZeroRows={filterZeroTooltip} />
            </div>
        {/if}
    {/if}
</div>

<style>
    .chart-wrap {
        position: relative;
        width: 100%;
        overflow: visible;
    }
    svg {
        display: block;
    }

    .empty {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 260px;
        color: var(--theme-textSecondary, #b3b3b3);
        font-size: 0.9rem;
    }
    .tooltip {
        position: absolute;
        pointer-events: none;
        background: var(--theme-background, #1a1a1a);
        border: 1px solid var(--theme-border, #404040);
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 0.8rem;
        color: var(--theme-text, #f6f6f6);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
        white-space: nowrap;
        z-index: 999;
    }
</style>
