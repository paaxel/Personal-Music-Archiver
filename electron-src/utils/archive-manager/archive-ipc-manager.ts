import { contextBridge, ipcMain, ipcRenderer } from 'electron';
import { ArchiveManager } from './archive-manager';

/**
 * Configure IPC handlers for archive operations
 */
export class ArchiveIpcManager {
  static configureHandlers(archiveManager: ArchiveManager): void {
    console.debug('Configuring archive IPC handlers...');

    // Start background archive process
    ipcMain.handle('archive-start-process', async () => {
      console.debug('IPC: archive-start-process');
      archiveManager.startBackgroundProcess();
      return { success: true, isActive: true };
    });

    // Stop background archive process
    ipcMain.handle('archive-stop-process', async () => {
      console.debug('IPC: archive-stop-process');
      archiveManager.stopBackgroundProcess();
      return { success: true, isActive: false };
    });

    // Get archive process status
    ipcMain.handle('archive-get-process-status', async () => {
      console.debug('IPC: archive-get-process-status');
      return archiveManager.getArchiveProcessStatus();
    });

    // Get archive queue status
    ipcMain.handle('archive-get-queue-status', async () => {
      console.debug('IPC: archive-get-queue-status');
      return archiveManager.getQueueStatus();
    });

    console.debug('Archive IPC handlers configured');
  }

  static configureArchiveCallbacks(): void {
    contextBridge.exposeInMainWorld('electronArchiveAPI', {
      // Start background archive process
      startProcess: () =>
        ipcRenderer.invoke('archive-start-process'),

      // Stop background archive process
      stopProcess: () =>
        ipcRenderer.invoke('archive-stop-process'),

      // Get archive process status
      getProcessStatus: () =>
        ipcRenderer.invoke('archive-get-process-status'),

      // Get archive queue status
      getQueueStatus: () =>
        ipcRenderer.invoke('archive-get-queue-status'),

      // Delete album
      deleteAlbum: (albumId: number) =>
        ipcRenderer.invoke('delete-album', albumId),
    });
  }
}
