import { Song } from '../../db/db-models';

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

export interface AlbumArchiveStarted {
  albumId: number;
  albumName: string;
  artistName: string;
  totalTracks: number;
  completedTracks: number;
}

export interface AlbumArchiveProgress {
  albumId: number;
  albumName: string;
  artistName: string;
  totalTracks: number;
  completedTracks: number;
  currentSong?: string;
}

export interface AlbumArchiveComplete {
  albumId: number;
  albumName: string;
  artistName: string;
  totalTracks: number;
  completedTracks: number;
  status: 'completed' | 'error';
}

export interface DeleteAlbumResult {
  success: boolean;
  albumId: number;
  albumName: string;
  artistName: string;
  deletedFilesCount: number;
  failedFilesCount: number;
  failedFiles?: Array<{ fileId?: number; path?: string; error: string }>;
}

export interface AlbumStatusUpdate {
  albumId: number;
  status: string;
}