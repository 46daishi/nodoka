<script>
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
        return unit === "m" ? fmtMins(val) : String(Math.round(val));
    }

    // ── Scale ─────────────────────────────────────────────────────────────────

    $: maxY = niceMax(
        Math.max(...data.flatMap((d) => series.map((s) => d[s.key] ?? 0)), 1),
    );

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
    $: labelStep =
        data.length <= 7
            ? 1
            : data.length <= 14
              ? 2
              : data.length <= 21
                ? 3
                : Math.ceil(data.length / 7);

    $: xLabels = data
        .map((d, gi) => ({
            d,
            gi,
            x: (gi / Math.max(data.length - 1, 1)) * innerW,
        }))
        .filter((_, gi) => gi % labelStep === 0);

    // ── Hover ─────────────────────────────────────────────────────────────────

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
                        {fmtTick(tick)}
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

        {#if hoverGi !== null}
            <div class="tooltip" style="left:{ttX}px;top:{ttY}px;">
                <div class="tt-date">{fmtDate(data[hoverGi].date)}</div>
                {#each series as ser}
                    <div class="tt-row">
                        <span class="tt-dot" style="background:{ser.color}" />
                        <span class="tt-label">{ser.label}</span>
                        <span class="tt-val"
                            >{fmt(data[hoverGi][ser.key] ?? 0)}</span
                        >
                    </div>
                {/each}
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
</style>
