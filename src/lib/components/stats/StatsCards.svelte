<script>
    /** @type {Array<{date: string, studyMinutes: number, breakMinutes: number, completedSessions: number}>} */
    export let data = [];
    /** @type {{allTimeStudyMinutes?: number, allTimeBreakMinutes?: number, allTimeSessions?: number}} */
    export let totalStats = {};
    /** @type {'week' | '2weeks' | 'month' | 'year' | 'all-time'} */
    export let timeRange = "week";

    $: readableTimeRange = (() => {
        switch (timeRange) {
            case "week":
                return "Last Week";
            case "2weeks":
                return "Last 2 Weeks";
            case "month":
                return "Last Month";
            case "year":
                return "Last Year";
            case "all-time":
                return "All Time";
            default:
                return timeRange;
        }
    })();

    $: totalStudyTime = data.reduce((sum, day) => sum + day.studyMinutes, 0);
    $: totalBreakTime = data.reduce((sum, day) => sum + day.breakMinutes, 0);
    $: totalSessions = data.reduce(
        (sum, day) => sum + day.completedSessions,
        0,
    );
    $: averageStudyPerDay =
        data.length > 0 ? Math.round(totalStudyTime / data.length) : 0;
    $: averageSessionsPerDay =
        data.length > 0
            ? Math.round((totalSessions * 10) / data.length) / 10
            : 0;

    /** @param {number} minutes */
    function formatMinutes(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    }

    let focusIcon = "\u26a1";
    let breakIcon = "\uf0f4";
    let sessionsIcon = "\uf05d";
    let averageIcon = "\udb80\udd28";
    let allTimeIcon = "\uf091";
</script>

<div class="stats-cards">
    <div class="stat-card">
        <div class="stat-icon">{focusIcon}</div>
        <div class="stat-content">
            <h3>{formatMinutes(totalStudyTime)}</h3>
            <p>Focus Time</p>
            <span class="stat-detail">{readableTimeRange}</span>
        </div>
    </div>

    <div class="stat-card break-time">
        <div class="stat-icon">{breakIcon}</div>
        <div class="stat-content">
            <h3>{formatMinutes(totalBreakTime)}</h3>
            <p>Break Time</p>
            <span class="stat-detail">{readableTimeRange}</span>
        </div>
    </div>

    <div class="stat-card sessions">
        <div class="stat-icon">{sessionsIcon}</div>
        <div class="stat-content">
            <h3>{totalSessions}</h3>
            <p>Sessions</p>
            <span class="stat-detail">{readableTimeRange}</span>
        </div>
    </div>

    <div class="stat-card average">
        <div class="stat-icon">{averageIcon}</div>
        <div class="stat-content">
            <h3>{formatMinutes(averageStudyPerDay)}</h3>
            <p>Average</p>
            <span class="stat-detail">Focus per day</span>
        </div>
    </div>

    <div class="stat-card all-time">
        <div class="stat-icon">{allTimeIcon}</div>
        <div class="stat-content">
            <h3>{formatMinutes(totalStats.allTimeStudyMinutes || 0)}</h3>
            <p>All Time</p>
            <span class="stat-detail"
                >{totalStats.allTimeSessions || 0} total sessions</span
            >
        </div>
    </div>
</div>

<style>
    .stats-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    .stat-card {
        background-color: var(--theme-surface, #3a3a3a);
        border-radius: 12px;
        padding: 1.2rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        transition: all 0.2s ease;
        border: 2px solid var(--theme-border, #4a4a4a);
        position: relative;
        overflow: hidden;
    }

    .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    }

    .stat-card::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--theme-primary, #396cd8);
    }

    .stat-icon {
        font-family: "Symbols Nerd Font";
        font-size: 2rem;
        flex-shrink: 0;
        width: 3rem;
        height: 3rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--theme-background, #2f2f2f);
        border-radius: 8px;
    }

    .stat-content {
        flex: 1;
        min-width: 0;
    }

    .stat-content h3 {
        margin: 0 0 0.25rem 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--theme-text, #f6f6f6);
        line-height: 1.2;
    }

    .stat-content p {
        margin: 0 0 0.5rem 0;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--theme-textSecondary, #a0a0a0);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .stat-detail {
        font-size: 0.75rem;
        color: var(--theme-textTertiary, #707070);
        display: block;
    }

    @font-face {
        font-family: "Symbols Nerd Font";
        src: url("/fonts/SymbolsNerdFont-Regular.ttf") format("truetype");
    }

    @media (max-width: 200px) {
        .stats-cards {
            grid-template-columns: 1fr;
        }

        .stat-card {
            padding: 1.25rem;
        }

        .stat-icon {
            font-size: 1.5rem;
            width: 2.5rem;
            height: 2.5rem;
        }

        .stat-content h3 {
            font-size: 1.25rem;
        }
    }
</style>
