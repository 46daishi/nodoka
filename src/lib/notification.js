import {
	sendNotification,
	requestPermission,
	isPermissionGranted,
} from "@tauri-apps/plugin-notification";

export const MESSAGES = {
	SESSION_END: { title: "Focus session finished", body: "It's time for a little break!" },
	BREAK_END:   { title: "Break time over",        body: "Let's get back to work." },
};

/** Send a desktop notification, requesting permission first if needed. */
export async function notify(message) {
	let granted = await isPermissionGranted();
	if (!granted) {
		granted = (await requestPermission()) === "granted";
	}
	if (!granted) return;

	await sendNotification({
		title: message.title,
		body:  message.body,
		icon:  "asset://nodoka.png",
	});
}
