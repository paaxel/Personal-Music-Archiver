/**
 * Result of a search operation
 */
export interface SearchResult {
  id: string;
  title: string;
  duration?: number;
  url: string;
}

/**
 * Result of a download operation
 */
export interface DownloadResult {
  path: string;
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  isActive?: boolean;
}

/**
 * Main plugin interface that all download plugins must implement
 */
export interface IDownloadPlugin {
  /**
   * Get plugin metadata
   */
  getMetadata(): PluginMetadata;

  /**
   * Initialize the plugin
   */
  initialize(): Promise<void>;

  /**
   * Check if required dependencies are installed
   */
  checkDependencies(): Promise<{
    installed: boolean;
    missing: string[];
    message?: string;
  }>;

  /**
   * Search for a song and return the best match URL
   * @returns URL of the video/audio to download, or null if not found
   */
  searchSong(
    artistName: string,
    songName: string,
    albumName?: string
  ): Promise<string | null>;

  /**
   * Download a song from the given URL
   * @returns Path to the downloaded file and its duration
   */
  downloadSong(
    url: string,
    artistName: string,
    albumName: string,
    trackNumber: number | null,
    songName: string,
    releaseYear: number | null,
    destinationPath: string
  ): Promise<DownloadResult>;

  /**
   * Validate a URL to check if it's supported by this plugin
   */
  validateUrl(url: string): boolean;

  /**
   * Get the plugin's configuration schema (for settings UI)
   */
  getConfigSchema?(): any;

  /**
   * Cleanup resources
   */
  dispose?(): Promise<void>;
}
