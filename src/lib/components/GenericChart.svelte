<script>
	import {
		VisXYContainer,
		VisGroupedBar,
		VisAxis,
		VisTooltip,
	} from "@unovis/svelte";
	import { createSafeAccessor } from "$lib/sanitizer.js";
	import { onMount } from "svelte";

	/** @type {Array<{date: string, studyMinutes: number, breakMinutes: number, completedSessions: number}>} */
	export let data = [];
	/** @type {"week" | "2weeks" | "month" | "year" | "all-time"} */
	export let timeRange = "week";
	/** @type {"study" | "sessions"} */
	export let chartType = "study";

	// CSS variable values — read after mount so the DOM is ready.
	let primaryColor = "#36B7BD";
	let accentColor  = "#59CBD0";

	onMount(() => {
		const style = getComputedStyle(document.documentElement);
		primaryColor = style.getPropertyValue("--theme-primary").trim() || primaryColor;
		accentColor  = style.getPropertyValue("--theme-accent").trim()  || accentColor;
	});

	$: rows = data.map(d => ({
		...d,
		x:         new Date(d.date).getTime(),
		timestamp: new Date(d.date).getTime(),
	}));

	$: config = chartType === "study"
		? {
			y:          [createSafeAccessor(d => d.studyMinutes), createSafeAccessor(d => d.breakMinutes)],
			colors:     [primaryColor, accentColor],
			names:      ["Study Minutes", "Break Minutes"],
			yLabel:     "Minutes",
			yTickFmt:   d => `${d}m`,
			legend:     [{ color: primaryColor, label: "Study" }, { color: accentColor, label: "Break" }],
			groupPad:   0.1,
		}
		: {
			y:          [createSafeAccessor(d => d.completedSessions)],
			colors:     [primaryColor],
			names:      ["Completed Sessions"],
			yLabel:     "Sessions",
			yTickFmt:   d => `${d}`,
			legend:     [{ color: primaryColor, label: "Completed Sessions" }],
			groupPad:   0.2,
		};

	const x = createSafeAccessor(d => d.x);

	function fmtDate(ts) {
		return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
	}

	$: tooltipTpl = chartType === "study"
		? d => `<div style="padding:6px">
			<div>${fmtDate(d.x)}</div>
			<div>Study: ${d.studyMinutes}m</div>
			<div>Break: ${d.breakMinutes}m</div>
		</div>`
		: d => `<div style="padding:6px">
			<div>${fmtDate(d.x)}: ${d.completedSessions} sessions</div>
		</div>`;
</script>

<div class="chart-wrap">
	{#if data.length > 0}
		<div class="chart-inner">
			<div class="legend" aria-label="Chart legend">
				{#each config.legend as item}
					<span class="legend-item">
						<span class="swatch" style="background:{item.color}" aria-hidden="true" />
						{item.label}
					</span>
				{/each}
			</div>

			<VisXYContainer
				data={rows}
				height={300}
				margin={{ top: 48, right: 20, bottom: 40, left: chartType === "sessions" ? 20 : 0 }}
			>
				<VisGroupedBar
					{x}
					y={config.y}
					color={config.colors}
					names={config.names}
					barWidth={0.8}
					groupPadding={config.groupPad}
				/>
				<VisAxis
					type="x"
					label="Date"
					tickFormat={fmtDate}
					gridLine={false}
					tickLine={false}
				/>
				<VisAxis
					type="y"
					label={config.yLabel}
					tickFormat={config.yTickFmt}
					gridLine={true}
					gridLineStyle={{ stroke: "var(--theme-border, #404040)", strokeDasharray: "2,2" }}
				/>
				<VisTooltip template={tooltipTpl} />
			</VisXYContainer>
		</div>
	{:else}
		<div class="empty">No data available for this time period</div>
	{/if}
</div>

<style>
	.chart-wrap {
		width:      100%;
		min-height: 300px;
		display:    flex;
		justify-content: center;
	}

	.chart-inner {
		width:    85%;
		position: relative;
	}

	.legend {
		position:         absolute;
		top:              8px;
		right:            12px;
		background:       rgba(0,0,0,0.5);
		padding:          6px 8px;
		border-radius:    6px;
		display:          flex;
		gap:              8px;
		align-items:      center;
		color:            #fff;
		font-size:        12px;
		z-index:          1;
	}

	.legend-item {
		display:     flex;
		align-items: center;
		gap:         4px;
	}

	.swatch {
		display:       inline-block;
		width:         10px;
		height:        10px;
		border-radius: 2px;
	}

	.empty {
		display:     flex;
		align-items: center;
		justify-content: center;
		min-height:  300px;
		color:       var(--theme-textSecondary, #b3b3b3);
	}

	/* Unovis global overrides — scoped to the component */
	:global(.vis-axis-label) { fill: var(--theme-textSecondary, #b3b3b3); font-size: 12px; }
	:global(.vis-tick)       { fill: var(--theme-textSecondary, #b3b3b3); font-size: 11px; }
	:global(.vis-grid-line)  { stroke: var(--theme-border, #404040); opacity: 0.3; }
</style>
