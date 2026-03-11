<script>
    import "../app.css";
    import { initializeTheme } from "$lib/themes/store.js";
    import { onMount, onDestroy } from "svelte";
    import { discordRPC } from "$lib/discord/discord";
    import { PRESENCE_DEFAULTS } from "$lib/discord/defaults";
    import { settings } from "$lib/settings/store.js";
    import { page } from "$app/stores";
    import { get } from "svelte/store";

    let discordEnabled = false;
    let currentPath = "/";
    let unsubSettings = () => {};
    let unsubPage = () => {};

    /** @param {string} path */
    function pathToRoute(path) {
        if (path === "/" || path === "") return "home";
        if (path.startsWith("/stats")) return "stats";
        if (path.startsWith("/settings")) return "settings";
        return "other";
    }

    /** @param {string} path */
    async function setPresenceForPath(path) {
        if (!discordEnabled) return;
        const route = pathToRoute(path);
        try {
            if (route === "home") {
                await discordRPC.updatePresence(PRESENCE_DEFAULTS);
            } else if (route === "stats") {
                await discordRPC.updatePresence({
                    ...PRESENCE_DEFAULTS,
                    details: "Stats",
                    status: "Viewing statistics",
                    smallText: "Statistics",
                    smallImage: "stats",
                    endTimestamp: undefined,
                });
            } else if (route === "settings") {
                await discordRPC.updatePresence({
                    ...PRESENCE_DEFAULTS,
                    details: "Settings",
                    status: "Changing the settings",
                    smallText: "Settings",
                    smallImage: "settings",
                    endTimestamp: undefined,
                });
            } else {
                await discordRPC.updatePresence(PRESENCE_DEFAULTS);
            }
        } catch (e) {
            console.error("Discord presence update failed:", e);
        }
    }

    onMount(async () => {
        initializeTheme();
        // Track toggle state and route changes
        const initialSettings = get(settings);
        discordEnabled = !!initialSettings.discordPresence;

        if (discordEnabled) {
            try {
                await discordRPC.connect();
                await setPresenceForPath(window.location.pathname || "/");
            } catch (e) {
                console.error("Discord RPC error on init:", e);
            }
        }

        unsubSettings = settings.subscribe((s) => {
            if (s.discordPresence !== discordEnabled) {
                discordEnabled = !!s.discordPresence;
                if (discordEnabled) {
                    discordRPC
                        .connect()
                        .then(() =>
                            setPresenceForPath(window.location.pathname || "/"),
                        )
                        .catch((err) =>
                            console.error("Discord RPC error on connect:", err),
                        );
                } else {
                    discordRPC.disconnect();
                }
            }
        });

        unsubPage = page.subscribe(($page) => {
            currentPath = $page.url.pathname;
            setPresenceForPath(currentPath);
        });
    });

    onDestroy(async () => {
        if (unsubSettings) unsubSettings();
        if (unsubPage) unsubPage();
        if (discordEnabled) {
            await discordRPC.disconnect();
        }
    });
</script>

<slot />
