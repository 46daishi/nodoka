<script>
	/** Total seconds remaining. */
	export let seconds = 0;

	/** Format seconds as M:SS. */
	function format(s) {
		const m   = Math.floor(s / 60);
		const sec = s % 60;
		return `${m}:${sec.toString().padStart(2, "0")}`;
	}
</script>

<span class="countdown" aria-live="polite" aria-label="{format(seconds)} remaining">
	{format(seconds)}
</span>

<style>
	.countdown {
		color:         var(--theme-accent, lightseagreen);
		font-size:     5em;
		font-weight:   bold;
		margin-top:    0.2em;
		margin-bottom: 0.2em;
		font-variant-numeric: tabular-nums; /* prevents layout shift as digits change */
	}
</style>
