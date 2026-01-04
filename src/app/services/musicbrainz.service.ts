import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { 
  MusicBrainzArtistSearchResult,
  MusicBrainzAlbumSearchResult,
  MusicBrainzAlbumDetails,
  MusicBrainzRelease
} from './models/musicbranz.model';


@Injectable({
  providedIn: 'root'
})
export class MusicbrainzService {

  constructor() { }

  searchArtist(artistName: string, limit: number = 10): Observable<MusicBrainzArtistSearchResult> {
    return from(window.electronMusicBrainzAPI.searchArtist(artistName, limit));
  }

  getAlbumsByArtist(artistId: string, limit: number = 100): Observable<MusicBrainzAlbumSearchResult> {
    return from(window.electronMusicBrainzAPI.getAlbumsByArtist(artistId, limit));
  }

  getAlbumDetails(albumId: string): Observable<MusicBrainzAlbumDetails> {
    return from(window.electronMusicBrainzAPI.getAlbumDetails(albumId));
  }

  getReleasesForReleaseGroup(releaseGroupId: string): Observable<MusicBrainzRelease[]> {
    return from(window.electronMusicBrainzAPI.getReleasesForReleaseGroup(releaseGroupId));
  }
}
