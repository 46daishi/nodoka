<script>
    import "../app.css";
    import { onMount, onDestroy } from "svelte";
    import { page } from "$app/stores";
    import { get } from "svelte/store";
    import { initializeTheme } from "$lib/stores/themes.js";
    import { settings, currentProfile } from "$lib/stores/settings.js";
    import { discordRPC } from "$lib/rpc.js";
    import {
        PRESENCE_DEFAULTS,
        PRESENCE_DETAILS,
        PRESENCE_ICONS,
    } from "$lib/defaults/discord.js";
    import { noiseEngine } from "$lib/engines/noise.js";

    let discordEnabled = false;
    let isConnecting = false;
    let unsubSettings = () => {};
    let unsubPage = () => {};
    let unsubProfile = () => {};

    // ── Discord presence per route ────────────────────────────────────────────

    /** @param {string} path */
    function routePresence(path) {
        if (path.startsWith("/stats"))
            return {
                details: PRESENCE_DETAILS.statsDetails,
                smallText: "Statistics",
                smallImage: PRESENCE_ICONS.statsIcon,
            };
        if (path.startsWith("/settings"))
            return {
                details: PRESENCE_DETAILS.settingsDetails,
                status: "Profile: " + get(currentProfile).name,
                smallText: "Settings",
                smallImage: PRESENCE_ICONS.settingsIcon,
            };
        return {}; // home: use defaults
    }

    /** @param {string} path */
    async function setPresence(path) {
        if (!discordEnabled) return;
        try {
            await discordRPC.updatePresence({
                ...PRESENCE_DEFAULTS,
                endTimestamp: undefined,
                ...routePresence(path),
            });
        } catch (e) {
            console.warn("Discord presence update failed:", e);
        }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    /** Connect to Discord RPC and set presence for the current route. */
    async function enableDiscord(path) {
        if (isConnecting) return;
        isConnecting = true;
        try {
            await discordRPC.connect();
            await setPresence(path);
        } catch (e) {
            console.warn("Discord RPC connect failed:", e);
        } finally {
            isConnecting = false;
        }
    }

    onMount(async () => {
        initializeTheme();
        noiseEngine.init();

        // Capture the current path once so all subscribers below are consistent.
        let currentPath = get(page).url.pathname;

        discordEnabled = get(settings).discordPresence;
        if (discordEnabled) await enableDiscord(currentPath);

        unsubSettings = settings.subscribe(async (s) => {
            if (s.discordPresence === discordEnabled) return;
            discordEnabled = s.discordPresence;
            if (discordEnabled) {
                await enableDiscord(get(page).url.pathname);
            } else {
                discordRPC.disconnect().catch(console.warn);
            }
        });

        unsubPage = page.subscribe(($page) => {
            currentPath = $page.url.pathname;
            setPresence(currentPath);
        });

        unsubProfile = currentProfile.subscribe(() => setPresence(currentPath));
    });

    onDestroy(async () => {
        unsubSettings();
        unsubPage();
        unsubProfile();
        if (discordEnabled) discordRPC.disconnect().catch(console.warn);
    });
</script>

<slot />
