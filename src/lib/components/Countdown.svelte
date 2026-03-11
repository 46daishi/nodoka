<script>
    export let seconds = 0;

    /** @param {number} s */
    function format(s) {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, "0")}`;
    }
</script>

<span>{format(seconds)}</span>

<style>
    span {
        color: var(--theme-accent, lightseagreen);
        font-size: 5em;
        font-weight: bold;
        margin-top: 0.2em;
        margin-bottom: 0.2em;
    }
</style>
