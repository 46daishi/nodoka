<script>
    import { formatDate, formatValue, calculateNiceMax, calculateLabelStep } from "$lib/utils/chartFormatters.js";
    import TooltipContent from "$lib/components/TooltipContent.svelte";

    export let data = [];
    export let series = [];
    export let unit = "";

    const MARGIN = { top: 16, right: 16, bottom: 48, left: 48 };
    const H = 260;
    let W = 600;
    let wrapEl;

    const uid = Math.random().toString(36).slice(2, 8);

    $: innerW = Math.max(W - MARGIN.left - MARGIN.right, 1);
    $: innerH = H - MARGIN.top - MARGIN.bottom;

    let hoverGi = null;
    let tooltipX = 0;
    let tooltipY = 0;

    // ── Scale ──────────────────────────────────────────────────────────── [...]

    $: maxY = calculateNiceMax(
        Math.max(...data.flatMap((d) => series.map((s) => d[s.key] ?? 0)), 1),
    );

    $: yTicks = Array.from({ length: 5 }, (_, i) => (maxY / 4) * i);

    // ── Coordinate helpers — reactive so paths rebuild on resize ──────────────

    $: _px = (gi) => (gi / Math.max(data.length - 1, 1)) * innerW;
    $: _py = (val) => innerH - (val / maxY) * innerH;

    // ── Paths — reactive derived strings ──────────────────────────────────────

    function buildLinePath(key, iW, iH, myMax) {
        if (data.length === 0) return "";
        const pts = data.map((d, i) => ({
            x: (i / Math.max(data.length - 1, 1)) * iW,
            y: iH - ((d[key] ?? 0) / myMax) * iH,
        }));
        if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
        let path = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 1; i < pts.length; i++) {
            const dx = (pts[i].x - pts[i - 1].x) / 3;
            path += ` C ${pts[i - 1].x + dx} ${pts[i - 1].y}, ${pts[i].x - dx} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
        }
        return path;
    }

    function buildAreaPath(key, iW, iH, myMax) {
        if (data.length === 0) return "";
        const lp = buildLinePath(key, iW, iH, myMax);
        const lastX = ((data.length - 1) / Math.max(data.length - 1, 1)) * iW;
        return `${lp} L ${lastX} ${iH} L 0 ${iH} Z`;
    }

    // Rebuild whenever innerW, innerH, maxY, or data changes
    $: linePaths = series.map((ser) => ({
        key: ser.key,
        line: buildLinePath(ser.key, innerW, innerH, maxY),
        area: buildAreaPath(ser.key, innerW, innerH, maxY),
    }));

    // Dot positions for the hover crosshair — reactive on hoverGi AND innerW
    $: hoverDots =
        hoverGi !== null
            ? series.map((ser) => ({
                  color: ser.color,
                  cx: (hoverGi / Math.max(data.length - 1, 1)) * innerW,
                  cy: innerH - ((data[hoverGi][ser.key] ?? 0) / maxY) * innerH,
              }))
            : [];

    $: hoverCrossX =
        hoverGi !== null
            ? (hoverGi / Math.max(data.length - 1, 1)) * innerW
            : null;

    // X-label positions
    $: labelStep = calculateLabelStep(data.length);

    $: xLabels = data
        .map((d, gi) => ({
            d,
            gi,
            x: (gi / Math.max(data.length - 1, 1)) * innerW,
        }))
        .filter((_, gi) => gi % labelStep === 0);

    // ── Hover ──────────────────────────────────────────────────────────── [...]

    function onMouseMove(e) {
        if (!wrapEl) return;
        const rect = wrapEl.getBoundingClientRect();
        const relX = e.clientX - rect.left - MARGIN.left;
        const relY = e.clientY - rect.top - MARGIN.top;

        if (relX < 0 || relX > innerW || relY < 0 || relY > innerH) {
            hoverGi = null;
            return;
        }

        const step = innerW / Math.max(data.length - 1, 1);
        hoverGi = Math.round(
            Math.max(0, Math.min(relX / step, data.length - 1)),
        );
        tooltipX = e.clientX - rect.left;
        tooltipY = e.clientY - rect.top;
    }

    function onLeave() {
        hoverGi = null;
    }

    $: ttX = hoverGi !== null ? Math.min(tooltipX + 14, W - 164) : 0;
    $: ttY = hoverGi !== null ? Math.max(tooltipY - 10, 4) : 0;

    $: if (data) hoverGi = null;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    class="chart-wrap"
    bind:clientWidth={W}
    bind:this={wrapEl}
    on:mousemove={onMouseMove}
    on:mouseleave={onLeave}
>
    {#if data.length === 0}
        <div class="empty">No data for this period</div>
    {:else}
        <!--
            viewBox uses the live W so coordinate math is 1:1.
            CSS width:100% makes the SVG fill its container at every size.
            height:auto preserves the aspect ratio so there's no whitespace gap.
        -->
        <svg
            viewBox="0 0 {W} {H}"
            width={W}
            height={H}
            style="display:block;width:100%;height:auto;"
        >
            <defs>
                {#each series as ser}
                    <linearGradient
                        id="lg-{uid}-{ser.key}"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="0%"
                            stop-color={ser.color}
                            stop-opacity="0.2"
                        />
                        <stop
                            offset="100%"
                            stop-color={ser.color}
                            stop-opacity="0.01"
                        />
                    </linearGradient>
                {/each}
                <clipPath id="plot-clip-{uid}">
                    <rect x="0" y="0" width={innerW} height={innerH} />
                </clipPath>
            </defs>

            <g transform="translate({MARGIN.left},{MARGIN.top})">
                <!-- Grid + Y labels -->
                {#each yTicks as tick}
                    {@const y = innerH - (tick / maxY) * innerH}
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

                <!-- Areas + lines -->
                <g clip-path="url(#plot-clip-{uid})">
                    {#each linePaths as lp}
                        <path d={lp.area} fill="url(#lg-{uid}-{lp.key})" />
                    {/each}
                    {#each linePaths as lp, i}
                        <path
                            d={lp.line}
                            fill="none"
                            stroke={series[i].color}
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    {/each}

                    <!-- Crosshair + dots -->
                    {#if hoverCrossX !== null}
                        <line
                            x1={hoverCrossX}
                            x2={hoverCrossX}
                            y1={0}
                            y2={innerH}
                            stroke="var(--theme-text,#fff)"
                            stroke-width="1"
                            opacity="0.2"
                        />
                        {#each hoverDots as dot}
                            <circle
                                cx={dot.cx}
                                cy={dot.cy}
                                r="4"
                                fill={dot.color}
                                stroke="var(--theme-background,#1a1a1a)"
                                stroke-width="2"
                            />
                        {/each}
                    {/if}
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

        {#if hoverGi !== null}
            <div class="tooltip" style="left:{ttX}px;top:{ttY}px;">
                <TooltipContent dataPoint={data[hoverGi]} {series} {unit} />
            </div>
        {/if}
    {/if}
</div>

<style>
    .chart-wrap {
        position: relative;
        width: 100%;
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
        z-index: 10;
    }
</style>
