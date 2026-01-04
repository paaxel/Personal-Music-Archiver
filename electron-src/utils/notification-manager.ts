import { BrowserWindow, contextBridge, ipcRenderer } from 'electron';

/**
 * Notification types
 */
export type NotificationType = 'success' | 'info' | 'warning' | 'error';

/**
 * Notification data structure
 */
export interface AppNotification {
  type: NotificationType;
  messageKey: string; // i18n key without type prefix
  params?: string[]; // Optional parameters for i18n interpolation
}

/**
 * Manager for application notifications
 * Handles user-facing notifications for errors, warnings, and info messages
 */
export class NotificationManager {
  private static mainWindow: BrowserWindow | null = null;

  /**
   * Initialize the notification manager with the main window
   */
  static initialize(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Configure callbacks for renderer process (Preload)
   */
  static configureNotificationCallbacks(): void {
    contextBridge.exposeInMainWorld('electronNotificationAPI', {
      onNotification: (callback: (notification: AppNotification) => void) => {
        ipcRenderer.on('app-notification', (_event, notification) => {
          callback(notification);
        });
      }
    });
  }

  /**
   * Send a notification to the renderer process
   */
  static sendNotification(notification: AppNotification): void {
    if (this.mainWindow?.webContents) {
      this.mainWindow.webContents.send('app-notification', notification);
    }
  }

  /**
   * Send an error notification
   */
  static error(messageKey: string, params?: string[]): void {
    this.sendNotification({ type: 'error', messageKey, params });
  }

  /**
   * Send a warning notification
   */
  static warning(messageKey: string, params?: string[]): void {
    this.sendNotification({ type: 'warning', messageKey, params });
  }

  /**
   * Send an info notification
   */
  static info(messageKey: string, params?: string[]): void {
    this.sendNotification({ type: 'info', messageKey, params });
  }

  /**
   * Send a success notification
   */
  static success(messageKey: string, params?: string[]): void {
    this.sendNotification({ type: 'success', messageKey, params });
  }
}
