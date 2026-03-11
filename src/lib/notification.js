import {
  sendNotification,
  requestPermission,
  isPermissionGranted,
} from "@tauri-apps/plugin-notification";

export const messages = {
  SESSION_END: {
    title: "Focus session finished",
    body: "It's time for a little break!",
  },
  BREAK_END: {
    title: "Break time over",
    body: "Let's get back to work.",
  },
};

export async function notify(message) {
  let permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    permissionGranted = (await requestPermission()) === "granted";
  }

  if (!permissionGranted) return;

  await sendNotification({
    title: message.title,
    body: message.body,
    icon: "asset://nodoka.png",
  });
}
