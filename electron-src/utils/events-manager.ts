import { BrowserWindow, contextBridge, ipcRenderer } from 'electron';

/**
 * Notification types for archive events
 */
export interface ArchiveNotification {
  type: 'song-status-changed' | 'album-status-changed' | 'archive-progress' | 'archive-process-status' | 'album-archive-started' | 'album-archive-progress' | 'album-archive-complete';
  data: any;
}

/**
 * Song status change event data
 */
export interface SongStatusUpdate {
  songId: number;
  albumId: number;
  status: string;
  fileId?: number;
  archivedDuration?: number | null;
}

/**
 * Manager for application events and notifications
 * Handles real-time updates for downloads and status changes
 */
export class EventsManager {
  private static mainWindow: BrowserWindow | null = null;

  /**
   * Configure callbacks for renderer process (Preload)
   */
  static configureEventsCallbacks(): void {
    contextBridge.exposeInMainWorld('electronEventsAPI', {
      // Song status change notifications
      onSongStatusChanged: (callback: (data: any) => void) => {
        console.debug('Preload: Setting up song-status-changed listener');
        ipcRenderer.on('archive-notification', (event, notification) => {
          if (notification.type === 'song-status-changed') {
            console.debug('Preload: Received song status change:', notification.data);
            callback(notification.data);
          }
        });
      },

      // Album status change notifications
      onAlbumStatusChanged: (callback: (data: any) => void) => {
        console.debug('Preload: Setting up album-status-changed listener');
        ipcRenderer.on('archive-notification', (event, notification) => {
          if (notification.type === 'album-status-changed') {
            console.debug('Preload: Received album status change:', notification.data);
            callback(notification.data);
          }
        });
      },

      // Archive progress notifications
      onArchiveProgress: (callback: (data: any) => void) => {
        console.debug('Preload: Setting up archive-progress listener');
        ipcRenderer.on('archive-notification', (event, notification) => {
          if (notification.type === 'archive-progress') {
            console.debug('Preload: Received archive progress:', notification.data);
            callback(notification.data);
          }
        });
      },

      // Album archive started notifications
      onAlbumArchiveStarted: (callback: (data: any) => void) => {
        console.debug('Preload: Setting up album-archive-started listener');
        ipcRenderer.on('archive-notification', (event, notification) => {
          if (notification.type === 'album-archive-started') {
            console.debug('Preload: Received album archive started:', notification.data);
            callback(notification.data);
          }
        });
      },

      // Album archive progress notifications
      onAlbumArchiveProgress: (callback: (data: any) => void) => {
        console.debug('Preload: Setting up album-archive-progress listener');
        ipcRenderer.on('archive-notification', (event, notification) => {
          if (notification.type === 'album-archive-progress') {
            console.debug('Preload: Received album archive progress:', notification.data);
            callback(notification.data);
          }
        });
      },

      // Album archive complete notifications
      onAlbumArchiveComplete: (callback: (data: any) => void) => {
        console.debug('Preload: Setting up album-archive-complete listener');
        ipcRenderer.on('archive-notification', (event, notification) => {
          if (notification.type === 'album-archive-complete') {
            console.debug('Preload: Received album archive complete:', notification.data);
            callback(notification.data);
          }
        });
      },

      // Archive process status notifications
      onArchiveProcessStatus: (callback: (data: any) => void) => {
        console.debug('Preload: Setting up archive-process-status listener');
        ipcRenderer.on('archive-notification', (event, notification) => {
          if (notification.type === 'archive-process-status') {
            console.debug('Preload: Received archive process status:', notification.data);
            callback(notification.data);
          }
        });
      },

      // Plugin dependency status notifications
      onPluginDependencyStatus: (callback: (data: any) => void) => {
        console.debug('Preload: Setting up plugin-dependency-status listener');
        ipcRenderer.on('plugin-dependency-status', (event, data) => {
          console.debug('Preload: Received plugin dependency status:', data);
          callback(data);
        });
      }
    });
  }

  /**
   * Initialize the events manager with the main window
   */
  static initialize(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Send a notification to the renderer process
   */
  static sendNotification(notification: ArchiveNotification): void {
    if (this.mainWindow?.webContents) {
      console.debug("Sending notification: " + notification.type, notification.data);
      this.mainWindow.webContents.send('archive-notification', notification);
    } else {
      console.warn('Cannot send notification: Main window not available');
    }
  }

  /**
   * Notify renderer about song status change
   */
  static notifySongStatusChanged(update: SongStatusUpdate): void {
    this.sendNotification({
      type: 'song-status-changed',
      data: update
    });
  }

  /**
   * Notify renderer about album status change
   */
  static notifyAlbumStatusChanged(albumId: number, status: string): void {
    this.sendNotification({
      type: 'album-status-changed',
      data: { albumId, status }
    });
  }

  /**
   * Notify renderer about archive progress
   */
  static notifyArchiveProgress(data: any): void {
    this.sendNotification({
      type: 'archive-progress',
      data
    });
  }

  /**
   * Notify renderer about plugin dependency status change
   */
  static notifyPluginDependencyStatus(pluginId: string, status: any): void {
    if (this.mainWindow?.webContents) {
      console.debug('Sending plugin dependency status:', pluginId, status);
      this.mainWindow.webContents.send('plugin-dependency-status', { pluginId, status });
    } else {
      console.warn('Cannot send plugin dependency status: Main window not available');
    }
  }
}
