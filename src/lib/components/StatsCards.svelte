<script>
    import { ICONS } from "$lib/icons.js";

    /** @type {Array<{date: string, studyMinutes: number, breakMinutes: number, completedSessions: number}>} */
    export let data = [];

    /** @type {{ allTimeStudyMinutes?: number, allTimeBreakMinutes?: number, allTimeSessions?: number }} */
    export let totalStats = {};

    /** @type {"week" | "2weeks" | "month" | "year" | "all-time"} */
    export let timeRange = "week";

    const RANGE_LABELS = {
        week: "Last Week",
        "2weeks": "Last 2 Weeks",
        month: "Last Month",
        year: "Last Year",
        "all-time": "All Time",
    };

    $: rangeLabel = RANGE_LABELS[timeRange] ?? timeRange;

    $: totalStudy = data.reduce((s, d) => s + d.studyMinutes, 0);
    $: totalBreak = data.reduce((s, d) => s + d.breakMinutes, 0);
    $: totalSessions = data.reduce((s, d) => s + d.completedSessions, 0);
    $: avgStudy = data.length > 0 ? Math.round(totalStudy / data.length) : 0;

    /** @param {number} min */
    function fmt(min) {
        const h = Math.floor(min / 60);
        const m = min % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    $: cards = [
        {
            icon: ICONS.focus,
            value: fmt(totalStudy),
            label: "Focus Time",
            detail: rangeLabel,
        },
        {
            icon: ICONS.coffee,
            value: fmt(totalBreak),
            label: "Break Time",
            detail: rangeLabel,
        },
        {
            icon: ICONS.check,
            value: String(totalSessions),
            label: "Sessions",
            detail: rangeLabel,
        },
        {
            icon: ICONS.stats,
            value: fmt(avgStudy),
            label: "Average",
            detail: "Focus per day",
        },
        {
            icon: ICONS.trophy,
            value: fmt(totalStats.allTimeStudyMinutes ?? 0),
            label: "All Time",
            detail: `${totalStats.allTimeSessions ?? 0} total sessions`,
        },
    ];
</script>

<div class="cards">
    {#each cards as card}
        <div class="card">
            <div class="card-icon nf" aria-hidden="true">{card.icon}</div>

            <div class="card-body">
                <p class="card-value">{card.value}</p>
                <p class="card-label">{card.label}</p>
                <span class="card-detail">{card.detail}</span>
            </div>
        </div>
    {/each}
</div>

<style>
    .cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    .card {
        background-color: var(--theme-surface, #2d2d2d);
        border: 2px solid var(--theme-border, #404040);
        border-radius: 12px;
        padding: 1.2rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        position: relative;
        overflow: hidden;
        transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
    }

    .card::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--theme-primary, #36b7bd);
    }

    .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    }

    .card-icon {
        font-size: 2rem;
        flex-shrink: 0;
        width: 3rem;
        height: 3rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--theme-background, #1a1a1a);
        border-radius: 8px;
    }

    .card-body {
        flex: 1;
        min-width: 0;
    }

    .card-value {
        margin: 0 0 0.25rem;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--theme-text, #f6f6f6);
        line-height: 1.2;
    }

    .card-label {
        margin: 0 0 0.4rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--theme-textSecondary, #b3b3b3);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .card-detail {
        font-size: 0.75rem;
        color: var(--theme-textSecondary, #b3b3b3);
        display: block;
    }

    @media (max-width: 400px) {
        .cards {
            grid-template-columns: 1fr;
        }

        .card-icon {
            font-size: 1.5rem;
            width: 2.5rem;
            height: 2.5rem;
        }

        .card-value {
            font-size: 1.25rem;
        }
    }
</style>
