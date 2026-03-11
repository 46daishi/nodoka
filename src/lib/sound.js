let audio;

export const sounds = {
  START: "/sounds/notification.wav",
  END: "/sounds/piano.mp3",
};

export function playNotificationSound(sound) {
  if (!audio || audio.src !== sound) {
    audio = new Audio(sound);
    audio.volume = 1;
  }

  audio.currentTime = 0;
  audio.play().catch(console.warn);
}
