import { BaseFileManager } from './base-file-manager';
import { FileSystemManager } from './filesystem-manager';

/**
 * Available file manager types
 */
export enum FileManagerType {
  FILESYSTEM = 'filesystem',
  // Future implementations can be added here:
  // S3 = 's3',
  // AZURE_BLOB = 'azure-blob',
  // GOOGLE_CLOUD = 'google-cloud',
  // DROPBOX = 'dropbox',
}

/**
 * Factory for creating file manager instances
 * Supports multiple file manager types and can be extended with new implementations
 */
export class FileManagerFactory {
  /**
   * Create a file manager instance
   * @param type - Type of file manager to create
   * @returns File manager instance
   * @throws Error if the type is unknown
   */
  static createFileManager(type: FileManagerType = FileManagerType.FILESYSTEM): BaseFileManager {
    switch (type) {
      case FileManagerType.FILESYSTEM:
        return new FileSystemManager();
      
      // Future implementations:
      // case FileManagerType.S3:
      //   return new S3Manager();
      
      default:
        throw new Error(
          `Unknown file manager type: ${type}. Available types: ${Object.values(FileManagerType).join(', ')}`
        );
    }
  }
}
