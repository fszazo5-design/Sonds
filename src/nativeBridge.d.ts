export {};

declare global {
  interface Window {
    AndroidBridge?: {
      loadState(): string;
      saveState(payload: string): string;
      saveSchedule(payload: string): string;
      requestNotificationPermission(): void;
      requestCameraPermission(): void;
      requestMicrophonePermission(): void;
      requestExactAlarmAccess(): void;
      checkForAppUpdate(): void;
    };
  }
}
