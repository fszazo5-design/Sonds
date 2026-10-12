export {};

declare global {
  interface Window {
    __sondsHandleBack?: () => boolean;
    AndroidBridge?: {
      loadState(): string;
      saveState(payload: string): string;
      saveSchedule(payload: string): string;
      requestNotificationPermission(): void;
      requestCameraPermission(): void;
      requestMicrophonePermission(): void;
      requestExactAlarmAccess(): void;
      playGameCountdownSound(): void;
      playGameEndSound(): void;
      speakArabic(text: string): void;
      stopSpeech(): void;
      refreshWebApp(): void;
      checkForAppUpdate(): void;
    };
  }
}
