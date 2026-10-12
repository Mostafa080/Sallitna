// Simulated microphone permission (remembered until the app reloads).
// Replaced by expo-audio's permission request when real recording is added.

let granted = false;

export const micAccess = {
  isGranted: () => granted,
  grant: () => {
    granted = true;
  },
};
