// Database model interfaces and types

export type ArchiveStatus = 
  | 'PARTIALLY_ARCHIVED' 
  | 'NOT_ARCHIVED' 
  | 'ARCHIVED' 
  | 'VIDEO_NOT_FOUND' 
  | 'ARCHIVING_FAILURE';

export interface Artist {
  id: number;
  name: string;
  music_brainz_id: string;
}

export interface ArtistInput {
  name: string;
  music_brainz_id?: string;
  musicbrainz_id?: string; // Legacy field for compatibility
}

export interface Album {
  id: number;
  name: string;
  artist_id: number;
  music_brainz_id: string;
  music_brainz_release_group_id: string;
  release_year: number | null;
  archive_status: ArchiveStatus;
}

export interface AlbumInput {
  name: string;
  artist_id: number;
  music_brainz_id: string;
  music_brainz_release_group_id?: string;
  release_year?: number | null;
  archive_status?: ArchiveStatus;
}

export interface Song {
  id: number;
  name: string;
  album_id: number;
  music_brainz_id: string | null;
  track_number: number | null;
  duration: number | null;
  archived_file_duration: number | null;
  video_url: string | null;
  archive_status: ArchiveStatus;
  archived_file: number | null;
}

export interface SongInput {
  name: string;
  album_id: number;
  music_brainz_id?: string | null;
  track_number?: number | null;
  duration?: number | null;
  archived_file_duration?: number | null;
  video_url?: string | null;
  archive_status?: ArchiveStatus;
  archived_file?: number | null;
}

export interface FileDocument {
  id: number;
  file_manager: string;
  path: string;
}

export interface FileDocumentInput {
  file_manager: string;
  path: string;
}

export interface RecentSearch {
  search_text: string;
  searched_at: string;
}

export interface ArtistWithAlbumCount extends Artist {
  album_count: number;
}

export interface ArchivedAlbum {
  album_id: number;
  album_name: string;
  album_mb_id: string;
  archive_status: ArchiveStatus;
  artist_id: number;
  artist_name: string;
  artist_mb_id: string;
}

export interface AlbumSearchResult extends Album {
  artist_name: string;
}

export interface AlbumCountResult {
  count: number;
}

export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}
