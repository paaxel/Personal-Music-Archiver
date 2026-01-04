export interface MusicBrainzArtist {
  id: string;
  name: string;
  'sort-name': string;
  disambiguation?: string;
  type?: string;
}

export interface MusicBrainzArtistSearchResult {
  artists: MusicBrainzArtist[];
  count: number;
}

export interface MusicBrainzAlbum {
  id: string;
  title: string;
  date?: string;
  'first-release-date'?: string;
  status?: string;
  'release-group'?: {
    id: string;
    'primary-type'?: string;
  };
  'track-count'?: number;
}

export interface MusicBrainzRelease {
  id: string;
  title: string;
  date?: string;
  status?: string;
}

export interface MusicBrainzAlbumSearchResult {
  'release-groups'?: MusicBrainzAlbum[];
  releases?: MusicBrainzAlbum[];
  count: number;
}

export interface MusicBrainzRecording {
  id: string;
  title: string;
  length?: number;
}

export interface MusicBrainzAlbumDetails {
  id: string;
  title: string;
  date?: string;
  releaseGroupId?: string; // Release-group ID
  media: Array<{
    tracks: Array<{
      id: string;
      title: string;
      position: number;
      length?: number;
      recording: MusicBrainzRecording;
    }>;
  }>;
}