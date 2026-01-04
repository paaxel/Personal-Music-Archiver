import { FileManagerFactory, FileManagerType } from './file-manager-factory';
import { BaseFileManager } from './base-file-manager';

/**
 * Utility class for managing music file operations
 * Uses the file manager factory pattern for storage abstraction
 */
export class FileUtils {
  private fileManager: BaseFileManager;
  private musicDir: string;

  constructor(fileManagerType: FileManagerType = FileManagerType.FILESYSTEM) {
    // Initialize file manager using factory pattern
    this.fileManager = FileManagerFactory.createFileManager(fileManagerType);
  }

  getCurrentFileManager(): string {
    return this.fileManager.getFileManagerType();
  }
  /**
   * Sanitize filename by removing invalid characters
   */
  sanitizeFilename(filename: string): string {
    return this.fileManager.sanitizeFilename(filename);
  }

  /**
   * Get or create artist folder
   */
  getArtistFolder(artistName: string): string {
    return this.fileManager.getArtistFolder(artistName);
  }

  /**
   * Get or create album folder
   */
  getAlbumFolder(artistName: string, albumName: string): string {
    return this.fileManager.getAlbumFolder(artistName, albumName);
  }

  /**
   * Get song file path
   */
  getSongFilePath(artistName: string, albumName: string, trackNumber: number, songName: string): string {
    return this.fileManager.getSongFilePath(artistName, albumName, trackNumber, songName);
  }

  /**
   * Ensure directory exists
   */
  ensureDirectoryExists(dirPath: string): void {
    this.fileManager.ensureDirectoryExists(dirPath);
  }

  /**
   * Copy uploaded file to proper location
   */
  async copyUploadedFile(
    sourcePath: string,
    artistName: string,
    albumName: string,
    trackNumber: number,
    songName: string
  ): Promise<string> {
    return this.fileManager.copyUploadedFile(sourcePath, artistName, albumName, trackNumber, songName);
  }

  /**
   * Delete file (synchronous)
   */
  deleteFile(filePath: string): void {
    this.fileManager.deleteFileSync(filePath);
  }

  /**
   * Delete file (asynchronous)
   */
  async deleteFileAsync(filePath: string): Promise<void> {
    return this.fileManager.deleteFileAsync(filePath);
  }

  // File manager wrapper methods for future extensibility

  /**
   * Save file using the configured file manager
   * @param fileName - Name of the file
   * @param content - File content
   * @returns Path to saved file
   */
  async saveFile(fileName: string, content: Buffer | string): Promise<string> {
    return this.fileManager.saveFile(fileName, content);
  }

  /**
   * Read file using the configured file manager
   * @param filePath - Full path to the file
   * @returns File content
   */
  async readFile(filePath: string): Promise<Buffer> {
    return this.fileManager.readFile(filePath);
  }

  /**
   * Delete file using the configured file manager
   * @param filePath - Full path to the file
   */
  async deleteFileUsingManager(filePath: string): Promise<void> {
    return this.fileManager.deleteFile(filePath);
  }

  /**
   * Check if file exists using the configured file manager
   * @param filePath - Full path to the file
   * @returns True if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    return this.fileManager.fileExists(filePath);
  }

  /**
   * Get base path from the configured file manager
   * @returns Base path
   */
  getManagerBasePath(): string {
    return this.fileManager.getBasePath();
  }
}
