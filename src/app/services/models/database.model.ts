
export enum ArchiveStatus {
  NOT_ARCHIVED = 'NOT_ARCHIVED',
  PARTIALLY_ARCHIVED = 'PARTIALLY_ARCHIVED',
  ARCHIVED = 'ARCHIVED',
  VIDEO_NOT_FOUND = 'VIDEO_NOT_FOUND',
  ARCHIVING_FAILURE = 'ARCHIVING_FAILURE'
}

export interface Artist {
  id?: number;
  name: string;
  music_brainz_id?: string;
}

export interface ArtistWithAlbumCount extends Artist {
  album_count: number;
}

export interface Album {
  id?: number;
  name: string;
  artist_id: number;
  music_brainz_id?: string;
  music_brainz_release_group_id?: string;
  release_date?: string | null;
  release_year?: number | null;
  archive_status: ArchiveStatus;
  artist_name?: string;
}

export interface Song {
  id?: number;
  name: string;
  album_id: number;
  music_brainz_id?: string;
  track_number?: number;
  duration?: number | null;
  archived_file_duration?: number | null;
  video_url?: string | null;
  archive_status: ArchiveStatus;
  archived_file?: number;
}

export interface FileDocument {
  id?: number;
  file_manager: string;
  path: string;
}

export interface ArchivedAlbumView {
  album_id: number;
  album_name: string;
  album_mb_id?: string;
  archive_status: ArchiveStatus;
  artist_id: number;
  artist_name: string;
  artist_mb_id?: string;
  release_year?: number;
}

export interface SongWithDetails extends Song {
  artist_name?: string;
  album_name?: string;
}
