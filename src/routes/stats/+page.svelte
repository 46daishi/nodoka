<script>
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { statisticsStorage } from "$lib/stores/stats.js";
    import { sanitizeStatisticsData } from "$lib/sanitizer.js";
    import { ICONS } from "$lib/icons.js";
    import StatsCards from "$lib/components/StatsCards.svelte";
    import SelectInput from "$lib/components/SelectInput.svelte";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import BarChart from "$lib/components/BarChart.svelte";
    import LineChart from "$lib/components/LineChart.svelte";
    import DonutChart from "$lib/components/DonutChart.svelte";
    import HeatMap from "$lib/components/HeatMap.svelte";

    const TIME_RANGE_OPTIONS = [
        { value: "week", label: "Last Week" },
        { value: "2weeks", label: "Last 2 Weeks" },
        { value: "month", label: "Last Month" },
        { value: "year", label: "Last Year" },
        { value: "all-time", label: "All Time" },
    ];

    /** @type {"week" | "2weeks" | "month" | "year" | "all-time"} */
    let timeRange = "week";
    let statsData = [];
    let totalStatsData = [];
    let totalStats = {};
    let loading = true;

    // ── Theme colors (read after mount) ───────────────────────────────────────
    let primaryColor = "#36B7BD";
    let accentColor = "#59CBD0";

    onMount(() => {
        const style = getComputedStyle(document.documentElement);
        primaryColor =
            style.getPropertyValue("--theme-primary").trim() || primaryColor;
        accentColor =
            style.getPropertyValue("--theme-accent").trim() || accentColor;
        loadStatistics();
    });

    // ── Load / debounce ───────────────────────────────────────────────────────

    let _debounce;
    function scheduleLoad() {
        clearTimeout(_debounce);
        _debounce = setTimeout(loadStatistics, 150);
    }

    function loadStatistics() {
        loading = true;
        try {
            statsData = sanitizeStatisticsData(
                statisticsStorage.getStatsByTimeRange(timeRange),
            );
            totalStatsData = sanitizeStatisticsData(statisticsStorage.getStatsByTimeRange("all-time"))
            totalStats = statisticsStorage.getTotalStats();
        } catch (e) {
            console.error("Failed to load statistics:", e);
            statsData = [];
            totalStats = {
                allTimeStudyMinutes: 0,
                allTimeBreakMinutes: 0,
                allTimeSessions: 0,
            };
        }
        loading = false;
    }

    // ── Derived chart data ────────────────────────────────────────────────────

    // Stacked bar: focus + break minutes per day
    $: focusBreakSeries = [
        { key: "studyMinutes", label: "Focus", color: primaryColor },
        { key: "breakMinutes", label: "Break", color: accentColor },
    ];

    // Bar: sessions per day
    $: sessionSeries = [
        { key: "completedSessions", label: "Sessions", color: primaryColor },
    ];

    // Line: rolling 7-day average of focus minutes
    $: rollingData = (() => {
        if (statsData.length < 2)
            return statsData.map((d) => ({ ...d, rolling: d.studyMinutes }));
        const W = 7;
        return statsData.map((d, i) => {
            const window = statsData.slice(Math.max(0, i - W + 1), i + 1);
        
            const avg =
                window.reduce((s, x) => s + x.studyMinutes, 0) / window.length;
            return { ...d, rolling: Math.round(avg) };
        });
    })();

    $: lineSeries = [
        { key: "studyMinutes", label: "Daily focus", color: primaryColor },
        { key: "rolling", label: "7-day average", color: accentColor },
    ];

    // Donut: total focus vs break split for the period
    $: totalFocus = statsData.reduce((s, d) => s + d.studyMinutes, 0);
    $: totalBreak = statsData.reduce((s, d) => s + d.breakMinutes, 0);
    $: donutSegments = [
        { label: "Focus", value: totalFocus, color: primaryColor },
        { label: "Break", value: totalBreak, color: accentColor },
    ];
    $: focusPct =
        totalFocus + totalBreak > 0
            ? Math.round((totalFocus / (totalFocus + totalBreak)) * 100)
            : 0;

    function fmtMins(m) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        return h > 0 ?
            (min > 0 ? `${h}h ${min}m` : `${h}h`) : `${min}m`;
    }

    // ── Session-name charts ───────────────────────────────────────────────────

    /**
     * Generates a unique, completely stable color for any given string.
     * Uses 360 degrees of hue distribution so no two sessions share the exact same color,
     * while keeping Saturation and Lightness balanced for dark & light UI themes.
     */
    function getStableColor(name) {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            // Standard string hashing algorithm (djb2-inspired)
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // Use a large prime multiplier (137) to spread out hues on the color wheel 
        // ensuring maximum visual distinction even for similar names (e.g., "Study 1" vs "Study 2")
        const hue = (Math.abs(hash) * 137) % 360;
        
        // Saturation 65% and Lightness 55% provides excellent contrast 
        // against both dark surfaces and light background elements.
        return `hsl(${hue}, 65%, 55%)`;
    }

    /**
     * Build per-session-name data from raw storage, filtered to the current
     * time range.
     */
    $: sessionNameData = (() => {
        const raw = statisticsStorage.getStatisticsData();
    
        if (!raw) return null;

        const now = Date.now();
        const MS = 24 * 60 * 60 * 1000;
        const RANGE_DAYS = { week: 7, "2weeks": 14, month: 30, year: 365 };
        const cutoffMs =
            timeRange === "all-time" ? 0 : now - RANGE_DAYS[timeRange] * MS;

        // Accumulate minutes: dayTotals[date][name] and overall totals[name]
        const dayTotals = {};
        const totals = {};

        for (const [date, day] of Object.entries(raw.dailyStats)) {
            const dateMs = new Date(date).getTime();
            if (isNaN(dateMs) || dateMs < cutoffMs) continue;

            for (const session of day.focusSessions ?? []) {
                // Skip entries that pre-date the sessionName feature
                if (!session.sessionName) continue;
                const name = session.sessionName;
                const mins = session.duration ?? 0;

                dayTotals[date] ??= {};
                dayTotals[date][name] = (dayTotals[date][name] ?? 0) + mins;
                totals[name] = (totals[name] ?? 0) + mins;
            }
        }

        if (Object.keys(totals).length === 0) return null;

        // Sorted names for consistent display layout
        const sessionNames = Object.keys(totals).sort((a, b) =>
            a.localeCompare(b),
        );

        // Map names to their persistent unique color hash
        const sessionColors = Object.fromEntries(
            sessionNames.map((n) => [n, getStableColor(n)]),
        );

        // Bar data: one object per date with dynamic keys
        const barData = Object.entries(dayTotals)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, names]) => ({ date, ...names }));

        // Donut segments ordered by total desc
        const donutSegments = sessionNames
            .map((n) => ({
                label: n,
                value: totals[n],
                color: sessionColors[n],
            }))
            .sort((a, b) => b.value - a.value);

        // BarChart series array
        const barSeries = sessionNames.map((n) => ({
            key: n,
            label: n,
            color: sessionColors[n],
        }));

        // Total minutes across all named sessions for center label
        const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
        const topName = donutSegments[0]?.label ?? "";
        const topPct =
            grandTotal > 0
                ? Math.round(((donutSegments[0]?.value ?? 0) / grandTotal) * 100)
                : 0;

        return {
            sessionNames,
            sessionColors,
            barData,
            barSeries,
            donutSegments,
            grandTotal,
            topName,
            topPct,
        };
    })();

    // ── Actions ───────────────────────────────────────────────────────────────

    function clearAll() {
        if (!confirm("Clear all statistics? This cannot be undone.")) return;
        statisticsStorage.clearAllStatistics();
        loadStatistics();
    }

    function handleRangeChange() {
        scheduleLoad();
    }
</script>

<main class="page stats-page">
    <header class="stats-header">
        <h1>Statistics</h1>
        <div class="profile-row">
            <SelectInput
                options={TIME_RANGE_OPTIONS}
                value={timeRange}
                on:change={(e) => {
                    timeRange = e.target.value;
                    handleRangeChange();
                }}
            />
            <ActionButton
                icon={ICONS.trash}
                onAction={clearAll}
                variant="danger"
                size="small"
            />
        </div>
    </header>

    {#if loading}
        <div class="loading">Loading…</div>
    {:else}
        <StatsCards data={statsData} {totalStats} {timeRange} />

        <div class="charts">
            <section class="chart-card">
                <div class="chart-header">
                    <div>
                        <h2>Focus &amp; Break Time</h2>
                        <p class="chart-sub">Daily minutes per session type</p>
                    </div>
                    <div class="chart-legend">
                        {#each focusBreakSeries as s}
                            <span class="leg"
                                ><span
                                    class="leg-dot"
                                    style="background:{s.color}"
                                />{s.label}</span
                            >
                        {/each}
                    </div>
                </div>
                <BarChart
                    data={statsData}
                    series={focusBreakSeries}
                    unit="m"
                    mode="stacked"
                />
            </section>

            {#if sessionNameData}
                <div class="chart-row has-side-legend">
                    <section class="chart-card">
                        <div class="chart-header">
                            <div>
                                <h2>Time by Session</h2>
                                <p class="chart-sub">
                                    Daily focus minutes per session name
                                </p>
                            </div>
                        </div>
                        <BarChart
                            data={sessionNameData.barData}
                            series={sessionNameData.barSeries}
                            unit="m"
                            mode="stacked"
                            filterZeroTooltip={true}
                        />
                        <div class="session-legend">
                            {#each sessionNameData.barSeries as s}
                                <span class="leg">
                                    <span
                                        class="leg-dot"
                                        style="background:{s.color}"
                                    />
                                    {s.label}
                                </span>
                            {/each}
                        </div>
                    </section>

                    <section class="chart-card donut-card">
                        <div class="chart-header">
                            <div>
                                <h2>Session Split</h2>
                                <p class="chart-sub">
                                    Percentage of focus time per session
                                </p>
                            </div>
                        </div>
                        <DonutChart
                            segments={sessionNameData.donutSegments}
                            centerLabel="{sessionNameData.topPct}%"
                            centerSub={sessionNameData.topName}
                            legendSide={true}
                        />
                        <div class="session-legend">
                            <span class="leg">
                                <span class="leg-dot" />
                                ‎ 
                            </span>
                        </div>
                    </section>

                    <section class="chart-card">
                        <div class="chart-header">
                            <div>
                                <h2>Sessions</h2>
                                <p class="chart-sub">Completed pomodoros per day</p>
                            </div>
                        </div>
                        <BarChart
                            data={statsData}
                            series={sessionSeries}
                            unit=""
                            mode="grouped"
                        />
                    </section>

                    <section class="chart-card donut-card">
                        <div class="chart-header">
                            <div>
                                <h2>Focus Ratio</h2>
                                <p class="chart-sub">Time split for this period</p>
                            </div>
                        </div>
                        <DonutChart
                            segments={donutSegments}
                            centerLabel="{focusPct}%"
                            centerSub="focus"
                            legendSide={true}
                        />
                    </section>
                </div>
            {:else}
                <div class="chart-row has-side-legend">
                    <section class="chart-card">
                        <div class="chart-header">
                            <div>
                                <h2>Sessions</h2>
                                <p class="chart-sub">Completed pomodoros per day</p>
                            </div>
                        </div>
                        <BarChart
                            data={statsData}
                            series={sessionSeries}
                            unit=""
                            mode="grouped"
                        />
                    </section>

                    <section class="chart-card donut-card">
                        <div class="chart-header">
                            <div>
                                <h2>Focus Ratio</h2>
                                <p class="chart-sub">Time split for this period</p>
                            </div>
                        </div>
                        <DonutChart
                            segments={donutSegments}
                            centerLabel="{focusPct}%"
                            centerSub="focus"
                            legendSide={true}
                        />
                    </section>
                </div>
            {/if}

            {#if statsData.length >= 3}
                <section class="chart-card">
                    <div class="chart-header">
                        <div>
                            <h2>Focus Trend</h2>
                            <p class="chart-sub">
                                Daily minutes with 7-day rolling average
                            </p>
                        </div>
                        <div class="chart-legend">
                            {#each lineSeries as s}
                                <span class="leg"
                                    ><span
                                        class="leg-dot"
                                        style="background:{s.color}"
                                    />{s.label}</span
                                >
                            {/each}
                        </div>
                    </div>
                    <LineChart
                        data={rollingData}
                        series={lineSeries}
                        unit="m"
                    />
                </section>
            {/if}

            <section class="chart-card">
                <div class="chart-header">
                    <div>
                        <h2>Activity</h2>
                        <p class="chart-sub">Daily focus time over the past year</p>
                    </div>
                </div>
                <HeatMap data={totalStatsData} {accentColor} weeks={52} />
            </section>
        </div>
    {/if}
</main>

<div class="bottom-nav">
    <ActionButton
        icon={ICONS.backAlt}
        onAction={() => goto("/")}
        variant="primary"
    />
</div>

<style>
    .stats-page {
        width: 100%;
        max-width: 1100px;
        margin: 3rem auto;
        padding: 0 clamp(2rem, 8vw, 5rem) 4rem;
        box-sizing: border-box;
    }

    .stats-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 3rem 0 1.5rem;
    }

    h1 {
        margin: 0;
    }

    .loading {
        text-align: center;
        padding: 4rem 1rem;
        opacity: 0.6;
    }

    .charts {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        min-width: 0;
    }

    .chart-row {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
        gap: 1.5rem;
        align-items: stretch;
    }

    .chart-row.has-side-legend {
        grid-template-columns: minmax(0, 2fr) auto;
    }

    .chart-card {
        min-width: 0;
        background: var(--theme-surface, #2d2d2d);
        border: 1px solid var(--theme-border, #404040);
        border-radius: 14px;
        padding: 1.25rem 1.5rem 1rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        overflow: visible;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
    }

    .donut-card {
        display: flex;
        flex-direction: column;
    }

    .donut-card :global(.donut-wrap) {
        justify-content: center;
        min-width: 0;
        overflow: hidden;
    }

    .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1rem;
        min-width: 0;
    }

    .chart-header h2 {
        margin: 0 0 0.2rem;
        font-size: 1rem;
        font-weight: 600;
    }

    .chart-sub {
        margin: 0;
        font-size: 0.75rem;
        color: var(--theme-textSecondary, #b3b3b3);
    }

    .chart-legend {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 0.75rem;
        flex-shrink: 0;
    }

    .session-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem 1rem;
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--theme-border, #404040);
        margin-top: auto;
    }

    .leg {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 0.75rem;
        color: var(--theme-textSecondary, #b3b3b3);
        white-space: nowrap;
    }

    .leg-dot {
        width: 8px;
        height: 8px;
        border-radius: 2px;
        flex-shrink: 0;
    }

    @media (max-width: 700px) {
        .chart-row,
        .chart-row.has-side-legend {
            grid-template-columns: 1fr;
        }

        .chart-header {
            flex-direction: column;
            align-items: stretch;
        }

        .chart-legend {
            justify-content: flex-start;
        }
    }

    /* When the donut card is too narrow for side-by-side, stack legend below */
    @media (min-width: 701px) and (max-width: 900px), (max-width: 550px) {
        .donut-card :global(.donut-wrap.legend-side) {
            flex-direction: column;
            margin-bottom: 8px;
        }
        .donut-card :global(.legend){
            margin-top: -1rem;
            margin-bottom: 1rem;
        }
    }

    @media (max-width: 440px) {
        .stats-page {
            padding-bottom: 5rem;
        }

        .chart-card {
            padding: 1rem;
        }

        .stats-header {
            padding-top: 1rem;
        }
    }
</style>