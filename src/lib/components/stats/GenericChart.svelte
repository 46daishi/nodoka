<script>
    import {
        VisXYContainer,
        VisGroupedBar,
        VisAxis,
        VisTooltip,
    } from "@unovis/svelte";
    import { createSafeAccessor } from "$lib/statistics/sanitizer.js";
    import { onMount } from "svelte";

    export let data = [];
    export let timeRange = "week";
    export let chartType = "study";
    export let title = "";

    let chartContainer;

    $: preparedData = data.map((d) => ({
        ...d,
        x: new Date(d.date).getTime(),
        timestamp: new Date(d.date).getTime(),
    }));

    $: chartConfig = getChartConfig(chartType);

    const root = document.documentElement;
    const accentColor = getComputedStyle(root)
        .getPropertyValue("--theme-accent")
        .trim();
    const primaryColor = getComputedStyle(root)
        .getPropertyValue("--theme-primary")
        .trim();

    function getChartConfig(type) {
        if (type === "study") {
            return {
                y: [
                    createSafeAccessor((d) => d.studyMinutes),
                    createSafeAccessor((d) => d.breakMinutes),
                ],
                colors: [primaryColor, accentColor],
                names: ["Study Minutes", "Break Minutes"],
                yLabel: "Minutes",
                yTickFormat: (d) => `${d}m`,
                legend: [
                    { color: primaryColor, label: "Study" },
                    { color: accentColor, label: "Break" },
                ],
            };
        } else {
            return {
                y: [createSafeAccessor((d) => d.completedSessions)],
                colors: [primaryColor],
                names: ["Completed Sessions"],
                yLabel: "Sessions",
                yTickFormat: (d) => `${d}`,
                legend: [{ color: primaryColor, label: "Completed Sessions" }],
            };
        }
    }

    const x = createSafeAccessor((d) => d.x);

    function formatDate(ts) {
        const date = new Date(ts);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    }

    const tooltipTemplate = (d) => {
        if (chartType === "study") {
            return `<div style='padding:6px'>
                <div>${formatDate(d.x)}</div>
                <div>Study: ${d.studyMinutes}m</div>
                <div>Break: ${d.breakMinutes}m</div>
            </div>`;
        } else {
            return `<div style='padding:6px'>
                <div>${formatDate(d.x)}: ${d.completedSessions} sessions</div>
            </div>`;
        }
    };
</script>

<div
    class="chart-wrapper"
    style="position: relative; display: flex; justify-content: center;"
    bind:this={chartContainer}
>
    <div class="chart-inner" style="width: 85%; position: relative;">
        {#if data && data.length > 0}
            <div
                class="chart-legend"
                aria-label="Chart legend"
                style="position:absolute; top:8px; right:12px; background: rgba(0,0,0,.5); padding:6px 8px; border-radius:6px; display:flex; gap:8px; align-items:center; color:#fff; font-size:12px; z-index:1;"
            >
                {#each chartConfig.legend as item}
                    <span>
                        <span
                            class="legend-swatch"
                            style="width:10px;height:10px;background:{item.color};border-radius:2px; display:inline-block;margin-right:6px;"
                        ></span>{item.label}
                    </span>
                {/each}
            </div>
            <VisXYContainer
                data={preparedData}
                height={300}
                margin={{
                    top: 48,
                    right: 20,
                    bottom: 40,
                    left: chartType === "sessions" ? 20 : 0,
                }}
            >
                <VisGroupedBar
                    {x}
                    y={chartConfig.y}
                    color={chartConfig.colors}
                    names={chartConfig.names}
                    barWidth={0.8}
                    groupPadding={chartType === "sessions" ? 0.2 : 0.1}
                />
                <VisAxis
                    type="x"
                    label="Date"
                    tickFormat={formatDate}
                    gridLine={false}
                    tickLine={false}
                />
                <VisAxis
                    type="y"
                    label={chartConfig.yLabel}
                    tickFormat={chartConfig.yTickFormat}
                    gridLine={true}
                    gridLineStyle={{
                        stroke: "var(--theme-border, #4a4a4a)",
                        strokeDasharray: "2,2",
                    }}
                />
                <VisTooltip template={tooltipTemplate} />
            </VisXYContainer>
        {:else}
            <div class="no-data">
                <p>No data available for this time period</p>
            </div>
        {/if}
    </div>
</div>

<style>
    .chart-wrapper {
        width: 100%;
        height: auto;
        min-height: 300px;
        position: relative;
    }
    :global(.vis-axis-label) {
        fill: var(--theme-textSecondary, #a0a0a0);
        font-size: 12px;
    }
    :global(.vis-tick) {
        fill: var(--theme-textSecondary, #a0a0a0);
        font-size: 11px;
    }
    :global(.vis-grid-line) {
        stroke: var(--theme-border, #4a4a4a);
        opacity: 0.3;
    }
</style>
