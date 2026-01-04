import { ipcMain, shell, contextBridge, ipcRenderer } from 'electron';
import * as path from 'path';
import { app } from 'electron';
import * as Database from 'better-sqlite3';
import { NotificationManager } from './notification-manager';

/**
 * Manager for file-related operations
 * Handles file path retrieval and file location opening
 */
export class FileOperationsManager {
  /**
   * Configure callbacks for renderer process (Preload)
   */
  static configureFileCallbacks(): void {
    contextBridge.exposeInMainWorld('electronFileAPI', {
      // Get file path by ID
      getFilePath: (fileId: number) => {
        console.debug("Preload: Requesting file path for ID: " + fileId);
        return ipcRenderer.invoke('file-get-path', fileId);
      },
      
      // Open file location in system explorer
      openFileLocation: (fileId: number) => {
        console.debug("Preload: Opening file location for ID: " + fileId);
        return ipcRenderer.invoke('file-open-location', fileId);
      },

      // Open a directory path
      openPath: (path: string) => {
        console.debug("Preload: Opening path: " + path);
        return ipcRenderer.invoke('file-open-path', path);
      }
    });
  }

  /**
   * Configure IPC handlers for file operations (Main process)
   */
  static configureFileIpcHandlers(): void {
    // Get file path by file ID
    ipcMain.handle('file-get-path', async (event, fileId: number) => {
      try {
        console.debug("Getting file path for file ID: " + fileId);
        
        const filePath = await this.getFilePathById(fileId);
        
        if (!filePath) {
          NotificationManager.error('file_not_found');
          throw new Error('File path not found');
        }
        
        console.debug("File path retrieved: " + filePath);
        return filePath;
      } catch (error) {
        console.error("Error getting file path:", error);
        NotificationManager.error('file_read_failed');
        throw error;
      }
    });

    // Open file location in system file explorer
    ipcMain.handle('file-open-location', async (event, fileId: number) => {
      try {
        console.debug("Opening file location for file ID: " + fileId);
        
        const filePath = await this.getFilePathById(fileId);
        
        if (filePath) {
          // Show the file in the system file explorer
          shell.showItemInFolder(filePath);
          console.debug("File location opened: " + filePath);
          return { success: true, path: filePath };
        } else {
          NotificationManager.error('file_not_found');
          throw new Error('File path not found');
        }
      } catch (error) {
        console.error("Error opening file location:", error);
        NotificationManager.error('file_read_failed');
        throw error;
      }
    });

    // Open a directory path in system file explorer
    ipcMain.handle('file-open-path', async (event, dirPath: string) => {
      try {
        console.debug("Opening directory: " + dirPath);
        await shell.openPath(dirPath);
        return { success: true };
      } catch (error) {
        console.error("Error opening directory:", error);
        throw error;
      }
    });
  }

  /**
   * Get file path by ID from database
   */
  private static async getFilePathById(fileId: number): Promise<string | null> {
    const dbPath = path.join(app.getPath('userData'), 'music-downloader.db');
    const db = new Database.default(dbPath);
    
    try {
      const stmt = db.prepare('SELECT * FROM File_Document WHERE id = ?');
      const file = stmt.get(fileId) as { id: number; file_manager: string; path: string } | undefined;
      
      if (file) {
        return file.path;
      }
      
      return null;
    } finally {
      db.close();
    }
  }
}
