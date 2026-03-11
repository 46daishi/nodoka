<script>
    import { onMount } from "svelte";
    import { statisticsStorage } from "$lib/statistics/store";
    import { sanitizeStatisticsData } from "$lib/statistics/sanitizer.js";
    import StatsCards from "$lib/components/stats/StatsCards.svelte";
    import TimeRangeSelector from "$lib/components/stats/TimeRangeSelector.svelte";
    import GenericChart from "$lib/components/stats/GenericChart.svelte";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import { initializeTheme } from "$lib/themes/store.js";

    /** @type {'week' | '2weeks' | 'month' | 'year' | 'all-time'} */
    let timeRange = "week";
    /** @type {Array<{date: string, studyMinutes: number, breakMinutes: number, completedSessions: number}>} */
    let statsData = [];
    /** @type {object} */
    let totalStats = {};
    /** @type {boolean} */
    let loading = true;

    let backIcon = "\uf053";
    let settingsIcon = "\uf013";
    let trashIcon = "\uf1f8";

    const DEBOUNCE_MS = 150;
    let loadStatsTimer;
    function debouncedLoadStatistics() {
        if (loadStatsTimer) clearTimeout(loadStatsTimer);
        loadStatsTimer = setTimeout(() => loadStatistics(), DEBOUNCE_MS);
    }

    let chartsKey = 0;

    function loadStatistics() {
        loading = true;
        try {
            const raw = statisticsStorage.getStatsByTimeRange(timeRange);
            statsData = sanitizeStatisticsData(raw);
            totalStats = statisticsStorage.getTotalStats();
        } catch (e) {
            console.error('Failed to load statistics:', e);
            statsData = [];
            totalStats = {
                allTimeStudyMinutes: 0,
                allTimeBreakMinutes: 0,
                allTimeSessions: 0,
            };
        }
        loading = false;
        chartsKey += 1;
    }

    function goToSettings() {
        window.location.href = "/settings";
    }
    function goBack() {
        window.location.href = "/";
    }
    function clearStatistics() {
        if (
            confirm(
                "Are you sure you want to clear all statistics data? This action cannot be undone.",
            )
        ) {
            statisticsStorage.clearAllStatistics();
            loadStatistics();
        }
    }

    onMount(() => {
        initializeTheme();
        loading = true;
        loadStatistics();
    });
</script>

<main class="stats-container">
    <div class="stats-header">
        <h1>Statistics</h1>
        <div class="header-controls">
            <TimeRangeSelector
                bind:value={timeRange}
                onChange={debouncedLoadStatistics}
                on:change={debouncedLoadStatistics}
            />
        </div>
    </div>

    {#if loading}
        <div class="loading">Loading statistics...</div>
    {:else}
        <StatsCards data={statsData} {totalStats} {timeRange} />
        <div class="charts-section">
            <div class="chart-container">
                <h2>Study & Break Minutes</h2>
                {#key chartsKey}
                    <GenericChart
                        data={statsData}
                        {timeRange}
                        chartType="study"
                    />
                {/key}
            </div>
            <div class="chart-container">
                <h2>Completed Sessions</h2>
                {#key chartsKey}
                    <GenericChart
                        data={statsData}
                        {timeRange}
                        chartType="sessions"
                    />
                {/key}
            </div>
        </div>
    {/if}
</main>

<div class="top-nav">
    <ActionButton
        icon={backIcon}
        onAction={goBack}
        variant="secondary"
        size="small"
    />
    <ActionButton
        icon={settingsIcon}
        onAction={goToSettings}
        variant="secondary"
        size="small"
    />
    <ActionButton
        icon={trashIcon}
        onAction={clearStatistics}
        variant="primary"
        size="small"
    />
</div>

<style>
    @font-face {
        font-family: "Symbols Nerd Font";
        src: url("/fonts/SymbolsNerdFont-Regular.ttf") format("truetype");
    }
    :root {
        font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
    }
    .stats-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem 5rem;
    }
    .stats-header {
        display: flex;
        margin-bottom: 2rem;
        justify-content: center;
        align-items: center;
        flex-direction: column;
    }
    .chart-container {
        width: 100%;
        padding: 0 2rem;
        box-sizing: border-box;
        min-width: 0;
        background: var(--theme-surface, #3a3a3a);
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        overflow: hidden;
    }

    .charts-section {
        display: flex;
        flex-direction: column;
        gap: 2.5rem;
    }
    .top-nav {
        position: fixed;
        top: 1rem;
        left: 1rem;
        z-index: 100;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .loading {
        text-align: center;
        padding: 4rem;
        opacity: 0.7;
    }
</style>
