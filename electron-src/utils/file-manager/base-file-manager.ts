/**
 * Abstract base class for file managers
 * Defines the interface that all file manager implementations must follow
 */
export abstract class BaseFileManager {
  constructor() {
    if (this.constructor === BaseFileManager) {
      throw new Error("Cannot instantiate abstract class BaseFileManager");
    }
  }

  /**
   * Get the file manager type
   * @returns File manager type identifier
   */
  abstract getFileManagerType(): string;

  /**
   * Save a file with the given content
   * @param fileName - Name of the file (can include subdirectories)
   * @param content - Content to write to the file
   * @returns Path to the saved file
   */
  abstract saveFile(fileName: string, content: Buffer | string): Promise<string>;

  /**
   * Read a file and return its content
   * @param filePath - Full path to the file
   * @returns File content
   */
  abstract readFile(filePath: string): Promise<Buffer>;

  /**
   * Delete a file
   * @param filePath - Full path to the file
   */
  abstract deleteFile(filePath: string): Promise<void>;

  /**
   * Check if a file exists
   * @param filePath - Full path to the file
   * @returns True if file exists
   */
  abstract fileExists(filePath: string): Promise<boolean>;

  /**
   * Get the base path for file storage
   * @returns Base path
   */
  abstract getBasePath(): string;

  /**
   * Sanitize filename by removing invalid characters
   * @param filename - Filename to sanitize
   * @returns Sanitized filename
   */
  abstract sanitizeFilename(filename: string): string;

  /**
   * Get or create artist folder
   * @param artistName - Name of the artist
   * @returns Path to artist folder
   */
  abstract getArtistFolder(artistName: string): string;

  /**
   * Get or create album folder
   * @param artistName - Name of the artist
   * @param albumName - Name of the album
   * @returns Path to album folder
   */
  abstract getAlbumFolder(artistName: string, albumName: string): string;

  /**
   * Get song file path
   * @param artistName - Name of the artist
   * @param albumName - Name of the album
   * @param trackNumber - Track number
   * @param songName - Name of the song
   * @returns Path to song file
   */
  abstract getSongFilePath(artistName: string, albumName: string, trackNumber: number, songName: string): string;

  /**
   * Ensure directory exists
   * @param dirPath - Path to directory
   */
  abstract ensureDirectoryExists(dirPath: string): void;

  /**
   * Copy uploaded file to proper location
   * @param sourcePath - Source file path
   * @param artistName - Name of the artist
   * @param albumName - Name of the album
   * @param trackNumber - Track number
   * @param songName - Name of the song
   * @returns Path to destination file
   */
  abstract copyUploadedFile(
    sourcePath: string,
    artistName: string,
    albumName: string,
    trackNumber: number,
    songName: string
  ): Promise<string>;

  /**
   * Delete file (synchronous)
   * @param filePath - Path to file
   */
  abstract deleteFileSync(filePath: string): void;

  /**
   * Delete file (asynchronous)
   * @param filePath - Path to file
   */
  abstract deleteFileAsync(filePath: string): Promise<void>;
}
