import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { BaseFileManager } from './base-file-manager';
import { FileManagerType } from './file-manager-factory';

/**
 * File manager implementation for local filesystem storage
 */
export class FileSystemManager extends BaseFileManager {
  private basePath: string;

  constructor() {
    super();
    this.basePath = path.join(app.getPath('userData'), 'music');
    this.ensureBasePath();
  }

  /**
   * Get the file manager type
   */
  getFileManagerType(): string {
    return FileManagerType.FILESYSTEM;
  }

  /**
   * Ensure the base directory exists
   */
  private ensureBasePath(): void {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  /**
   * Save a file with the given content
   * @param fileName - Name of the file (can include subdirectories)
   * @param content - Content to write to the file
   * @returns Path to the saved file
   */
  async saveFile(fileName: string, content: Buffer | string): Promise<string> {
    const filePath = path.join(this.basePath, fileName);
    const dir = path.dirname(filePath);
    
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, content, (err) => {
        if (err) {
          reject(new Error(`Failed to save file: ${err.message}`));
        } else {
          resolve(filePath);
        }
      });
    });
  }

  /**
   * Read a file and return its content
   * @param filePath - Full path to the file
   * @returns File content
   */
  async readFile(filePath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, (err, data) => {
        if (err) {
          reject(new Error(`Failed to read file: ${err.message}`));
        } else {
          resolve(data);
        }
      });
    });
  }

  /**
   * Delete a file
   * @param filePath - Full path to the file
   */
  async deleteFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.unlink(filePath, (err) => {
        if (err) {
          reject(new Error(`Failed to delete file: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Check if a file exists
   * @param filePath - Full path to the file
   * @returns True if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    return Promise.resolve(fs.existsSync(filePath));
  }

  /**
   * Get the base path for file storage
   * @returns Base path
   */
  getBasePath(): string {
    return this.basePath;
  }

  /**
   * Sanitize filename by removing invalid characters
   */
  sanitizeFilename(filename: string): string {
    // Remove invalid characters for Windows/Mac/Linux
    let sanitized = filename
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // Invalid chars
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .trim();
    
    // Remove trailing periods and spaces (Windows doesn't allow these)
    sanitized = sanitized.replace(/[.\s]+$/, '');
    
    // If the name becomes empty after sanitization, use a default
    if (sanitized.length === 0) {
      sanitized = 'Unknown';
    }
    
    // Limit to max filename length
    return sanitized.substring(0, 255);
  }

  /**
   * Get or create artist folder
   */
  getArtistFolder(artistName: string): string {
    const sanitized = this.sanitizeFilename(artistName);
    const artistPath = path.join(this.basePath, sanitized);
    this.ensureDirectoryExists(artistPath);
    return artistPath;
  }

  /**
   * Get or create album folder
   */
  getAlbumFolder(artistName: string, albumName: string): string {
    const artistPath = this.getArtistFolder(artistName);
    const sanitized = this.sanitizeFilename(albumName);
    const albumPath = path.join(artistPath, sanitized);
    this.ensureDirectoryExists(albumPath);
    return albumPath;
  }

  /**
   * Get song file path
   */
  getSongFilePath(artistName: string, albumName: string, trackNumber: number, songName: string): string {
    const albumPath = this.getAlbumFolder(artistName, albumName);
    const trackPrefix = trackNumber ? `${String(trackNumber).padStart(2, '0')} - ` : '';
    const sanitizedName = this.sanitizeFilename(songName);
    const filename = `${trackPrefix}${sanitizedName}.mp3`;
    return path.join(albumPath, filename);
  }

  /**
   * Ensure directory exists
   */
  ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
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
    const destPath = this.getSongFilePath(artistName, albumName, trackNumber, songName);
    
    return new Promise((resolve, reject) => {
      fs.copyFile(sourcePath, destPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(destPath);
        }
      });
    });
  }

  /**
   * Delete file (synchronous)
   */
  deleteFileSync(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Delete file (asynchronous)
   */
  async deleteFileAsync(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(filePath)) {
        resolve(); // File doesn't exist, consider it deleted
        return;
      }
      
      fs.unlink(filePath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
