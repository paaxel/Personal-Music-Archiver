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

export interface MusicBrainzArtistCredit {
  name: string;
  joinphrase?: string;
  artist: {
    id: string;
    name: string;
    'sort-name': string;
    type?: string;
    disambiguation?: string;
  };
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
  'artist-credit'?: MusicBrainzArtistCredit[];
  'track-count'?: number;
}

export interface MusicBrainzRelease {
  id: string;
  title: string;
  date?: string;
  status?: string;
  disambiguation?: string;
  country?: string;
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
  'artist-credit'?: MusicBrainzArtistCredit[];
}

export interface MusicBrainzAlbumDetails {
  id: string;
  title: string;
  date?: string;
  disambiguation?: string;
  releaseGroupId?: string;
  'artist-credit'?: MusicBrainzArtistCredit[];
  media: Array<{
    tracks: Array<{
      id: string;
      title: string;
      position: number;
      length?: number;
      'artist-credit'?: MusicBrainzArtistCredit[];
      recording: MusicBrainzRecording;
    }>;
  }>;
}