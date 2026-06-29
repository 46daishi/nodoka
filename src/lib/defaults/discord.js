/** Default Discord Rich Presence payload shown when the timer is idle. */
export const PRESENCE_ICONS = {
  idleIcon: "https://i.imgur.com/hdj9Trd.gif",
  breakIcon: "https://i.imgur.com/rxz52dH.gif",
  focusIcon: "https://i.imgur.com/lFqHwYu.gif",
  statsIcon: "https://i.imgur.com/soxiq3U.png",
  settingsIcon: "https://i.imgur.com/Ffda1XS.gif",
};

/** Refers to the first line */
export const PRESENCE_DETAILS = {
  idleDetails: "Idling",
  breakDetails: "On Break",
  focusDetails: "Working",
  statsDetails: "Viewing Stats",
  settingsDetails: "Editing Settings",
};

export const PRESENCE_DEFAULTS = {
  details: "Idling",
  largeImage: "logo",
  largeText: "nodoka - made by 46dai",
  smallImage: PRESENCE_ICONS.idleIcon,
  smallText: "Idle",
  startTimestamp: undefined,
  endTimestamp: undefined,
};
