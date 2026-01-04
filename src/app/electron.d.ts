export {};

import { ArchiveStatus } from './services/models/database.model';

export interface RecentSearch {
  search_text: string;
  searched_at: string;
}

export interface SongStatusUpdate {
  songId: number;
  albumId: number;
  status: string;
  fileId?: number;
  archivedDuration?: number | null;
}

export interface AlbumStatusUpdate {
  albumId: number;
  status: string;
}

export interface ArchiveProgressData {
  songId?: number;
  albumId?: number;
  progress: number;
  message?: string;
}

export interface ArchiveQueueStatus {
  isProcessing: boolean;
  currentArchive: Song | null;
  queueLength: number;
  queue: Song[];
}

export interface ArchiveProcessStatus {
  isActive: boolean;
  isProcessing: boolean;
  currentArchive: Song | null;
}

export interface Song {
  id?: number;
  name: string;
  album_id: number;
  music_brainz_id?: string | null;
  track_number?: number | null;
  duration?: number | null;
  archived_file_duration?: number | null;
  video_url?: string | null;
  archive_status: ArchiveStatus;
  archived_file?: number | null;
}

export interface Album {
  id?: number;
  name: string;
  artist_id: number;
  music_brainz_id?: string | null;
  music_brainz_release_group_id?: string;
  release_date?: string | null;
  release_year?: number | null;
  archive_status: ArchiveStatus;
  artist_name?: string;
}

export interface Artist {
  id?: number;
  name: string;
  music_brainz_id?: string | null;
}

export interface ArchivedAlbumView {
  album_id: number;
  album_name: string;
  album_mb_id: string | null;
  archive_status: ArchiveStatus;
  artist_id: number;
  artist_name: string;
  artist_mb_id: string | null;
  release_year?: number;
}

export interface DeleteAlbumResult {
  success: boolean;
  albumId: number;
  albumName: string;
  artistName: string;
  deletedFilesCount: number;
  failedFilesCount: number;
  failedFiles?: Array<{ path?: string; fileId?: number; error: string }>;
}

export interface AppNotification {
  type: 'success' | 'info' | 'warning' | 'error';
  messageKey: string;
  params?: string[]; // Optional parameters for i18n interpolation
}

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  isActive?: boolean;
}

export interface DependencyCheck {
  installed: boolean;
  missing: string[];
  message?: string;
}

declare global {
  interface Window {
    electronMenuAPI: {      
      onNavigateToPlugins: (callback: () => void) => void;
      onShowAbout: (callback: () => void) => void;
      onShowLanguage: (callback: () => void) => void;
      onExitAppRequest: (callback: () => void) => void;
      onExitAppConfirmed: () => void;
    };
    
    electronDbAPI: {
      addRecentSearch: (searchText: string) => Promise<void>;
      getRecentSearches: (limit?: number) => Promise<RecentSearch[]>;
      clearRecentSearches: () => Promise<void>;
      checkAlbumExists: (musicBrainzId: string) => Promise<Album | null>;
      checkAlbumByReleaseGroup: (releaseGroupId: string) => Promise<Album | null>;
      addAlbum: (album: Album) => Promise<number>;
      deleteAlbum: (albumId: number) => Promise<DeleteAlbumResult>;
      addArtist: (artist: Artist) => Promise<number>;
      addSong: (song: Song) => Promise<number>;
      addSongsBatch: (songs: Song[]) => Promise<number[]>;
      updateSongVideoUrl: (songId: number, videoUrl: string) => Promise<void>;
      uploadSongFile: (songId: number, file: File, artistName: string, albumName: string, trackNumber: number, songName: string) => Promise<void>;
      deleteSongFile: (songId: number) => Promise<{ success: boolean }>;
      getSongFile: (songId: number) => Promise<{ buffer: ArrayBuffer; path: string }>;
      deleteAlbum: (albumId: number) => Promise<DeleteAlbumResult>;
      getSongsByAlbum: (albumId: number) => Promise<Song[]>;
      getSongById: (songId: number) => Promise<Song | null>;
      getArtistsPaginated: (searchQuery?: string, limit?: number, offset?: number) => Promise<(Artist & { album_count: number })[]>;
      getArtistsCount: (searchQuery?: string) => Promise<number>;
      getArtistById: (artistId: number) => Promise<Artist | null>;
      getArchivedArtists: () => Promise<(Artist & { album_count: number })[]>;
      getArchivedAlbumsByArtist: (artistId: number) => Promise<ArchivedAlbumView[]>;
      getArchivedAlbumById: (albumId: number) => Promise<ArchivedAlbumView | null>;
      resetAlbumArchive: (albumId: number) => Promise<{ success: boolean; error?: string }>;
    };

    electronEventsAPI: {
      // Event listeners
      onSongStatusChanged: (callback: (data: SongStatusUpdate) => void) => void;
      onAlbumStatusChanged: (callback: (data: AlbumStatusUpdate) => void) => void;
      onArchiveProgress: (callback: (data: ArchiveProgressData) => void) => void;
      onAlbumArchiveStarted?: (callback: (data: any) => void) => void;
      onAlbumArchiveProgress?: (callback: (data: any) => void) => void;
      onAlbumArchiveComplete?: (callback: (data: any) => void) => void;
      onArchiveProcessStatus?: (callback: (data: any) => void) => void;
      onPluginDependencyStatus?: (callback: (data: { pluginId: string; status: DependencyCheck }) => void) => void;
    };

    electronFileAPI: {
      // File operations
      getFilePath: (fileId: number) => Promise<string | null>;
      openFileLocation: (fileId: number) => Promise<{ success: boolean; path: string }>;
      openPath: (path: string) => Promise<{ success: boolean }>;
    };

    electronNotificationAPI: {
      onNotification: (callback: (notification: AppNotification) => void) => void;
    };

    electronMusicBrainzAPI: {
      searchArtist: (artistName: string, limit?: number) => Promise<any>;
      getAlbumsByArtist: (artistId: string, limit?: number) => Promise<any>;
      getAlbumDetails: (albumId: string) => Promise<any>;
      getReleasesForReleaseGroup: (releaseGroupId: string) => Promise<any>;
    };

    electronArchiveAPI: {
      startProcess: () => Promise<{ success: boolean; isActive: boolean }>;
      stopProcess: () => Promise<{ success: boolean; isActive: boolean }>;
      getProcessStatus: () => Promise<ArchiveProcessStatus>;
      getQueueStatus: () => Promise<ArchiveQueueStatus>;
      deleteAlbum: (albumId: number) => Promise<DeleteAlbumResult>;
    };

    electronPluginAPI: {
      getPlugin: () => Promise<PluginMetadata | null>;
      activatePlugin: () => Promise<boolean>;
      checkDependencies: () => Promise<DependencyCheck>;
      getPluginsDirectory: () => Promise<string>;
      uploadPlugin: (fileName: string, fileContent: string) => Promise<{ success: boolean; error?: string }>;
      deletePlugin: () => Promise<{ success: boolean; error?: string }>;
      deactivatePlugin: () => Promise<{ success: boolean }>;
    };
  }
}
