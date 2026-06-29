<script>
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

    // ── Formatting ────────────────────────────────────────────────────────────

    function fmtDate(s) {
        return new Date(s).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    }
    function fmtMins(m) {
        if (!m) return "0m";
        const h = Math.floor(m / 60),
            min = m % 60;
        return h > 0 ? (min > 0 ? `${h}h ${min}m` : `${h}h`) : `${min}m`;
    }
    function fmtTick(tick) {
        if (unit !== "m") return String(tick);
        if (tick === 0) return "0";
        if (tick % 60 === 0) return `${tick / 60}h`;
        return tick >= 60
            ? `${Math.floor(tick / 60)}h${tick % 60}m`
            : `${tick}m`;
    }
    function fmt(val) {
        return unit === "m" ? fmtMins(val) : String(val);
    }

    // ── Scale ─────────────────────────────────────────────────────────────────

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

    $: yMax = niceMax(maxRaw);

    function niceMax(v) {
        if (v <= 0) return 10;
        const candidates = [
            1, 2, 5, 10, 15, 20, 25, 30, 60, 90, 120, 150, 180, 240, 300, 360,
            480,
        ];
        const rawStep = v / 4;
        const step =
            candidates.find((c) => c >= rawStep) ??
            Math.ceil(rawStep / 60) * 60;
        return step * 4;
    }

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

    $: labelStep =
        data.length <= 7
            ? 1
            : data.length <= 14
              ? 2
              : data.length <= 21
                ? 3
                : Math.ceil(data.length / 7);

    $: xLabels = data
        .map((d, gi) => ({ d, gi, x: gi * barGroupW + barPad + groupW / 2 }))
        .filter((_, gi) => gi % labelStep === 0);

    // ── Tooltip ───────────────────────────────────────────────────────────────

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
                        {fmtTick(tick)}
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
                        {fmtDate(lbl.d.date)}
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
                <div class="tt-date">{fmtDate(tooltip.d.date)}</div>
                {#each series as ser}
                    {@const val = tooltip.d[ser.key] ?? 0}
                    {#if !filterZeroTooltip || val !== 0}
                    <div class="tt-row">
                        <span class="tt-dot" style="background:{ser.color}" />
                        <span class="tt-label">{ser.label}</span>
                        <span class="tt-val">{fmt(val)}</span>
                    </div>
                    {/if}
                {/each}
                {#if series.length > 1}
                    {@const total = series.reduce(
                        (s, ser) => s + (tooltip.d[ser.key] ?? 0),
                        0,
                    )}
                    <div class="tt-total">Total {fmt(total)}</div>
                {/if}
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