import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { RecentSearch } from '../electron';
import { Album, Artist, ArtistWithAlbumCount, ArchivedAlbumView, Song } from './models/database.model';


@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  constructor() { }


  addRecentSearch(searchText: string): Observable<void> {
    return from(window.electronDbAPI.addRecentSearch(searchText));
  }

  getRecentSearches(limit?: number): Observable<RecentSearch[]> {
    return from(window.electronDbAPI.getRecentSearches(limit));
  }

  clearRecentSearches(): Observable<void> {
    return from(window.electronDbAPI.clearRecentSearches());
  }

  checkAlbumExists(musicBrainzId: string): Observable<Album | null> {
    return from(window.electronDbAPI.checkAlbumExists(musicBrainzId));
  }

  checkAlbumByReleaseGroup(releaseGroupId: string): Observable<Album | null> {
    return from(window.electronDbAPI.checkAlbumByReleaseGroup(releaseGroupId));
  }

  addAlbum(album: Album): Observable<number> {
    return from(window.electronDbAPI.addAlbum(album));
  }

  deleteAlbum(albumId: number): Observable<any> {
    return from(window.electronDbAPI.deleteAlbum(albumId));
  }

  addArtist(artist: Artist): Observable<number> {
    return from(window.electronDbAPI.addArtist(artist));
  }

  addSong(song: Song): Observable<number> {
    return from(window.electronDbAPI.addSong(song));
  }

  addSongsBatch(songs: Song[]): Observable<number[]> {
    return from(window.electronDbAPI.addSongsBatch(songs));
  }

  updateSongVideoUrl(songId: number, videoUrl: string): Observable<void> {
    return from(window.electronDbAPI.updateSongVideoUrl(songId, videoUrl));
  }

  uploadSongFile(songId: number, file: File, artistName: string, albumName: string, trackNumber: number, songName: string): Observable<void> {
    return from(window.electronDbAPI.uploadSongFile(songId, file, artistName, albumName, trackNumber, songName));
  }

  deleteSongFile(songId: number): Observable<{ success: boolean }> {
    return from(window.electronDbAPI.deleteSongFile(songId));
  }

  getSongsByAlbum(albumId: number): Observable<Song[]> {
    return from(window.electronDbAPI.getSongsByAlbum(albumId)).pipe(
      map(songs => songs as Song[])
    );
  }

  getSongById(songId: number): Observable<Song | null> {
    return from(window.electronDbAPI.getSongById(songId));
  }

  getArtistsCount(searchQuery: string = ''): Observable<number> {
    return from(window.electronDbAPI.getArtistsCount(searchQuery));
  }

  getArtistsPaginated(searchQuery: string = '', limit: number = 25, offset: number = 0): Observable<ArtistWithAlbumCount[]> {
    return from(window.electronDbAPI.getArtistsPaginated(searchQuery, limit, offset));
  }

  getArtistById(artistId: number): Observable<Artist | null> {
    return from(window.electronDbAPI.getArtistById(artistId));
  }

  getArchivedArtists(): Observable<ArtistWithAlbumCount[]> {
    return from(window.electronDbAPI.getArchivedArtists());
  }

  getArchivedAlbumsByArtist(artistId: number): Observable<ArchivedAlbumView[]> {
    return from(window.electronDbAPI.getArchivedAlbumsByArtist(artistId)).pipe(
      map(albums => albums as ArchivedAlbumView[])
    );
  }

  getArchivedAlbumById(albumId: number): Observable<ArchivedAlbumView | null> {
    return from(window.electronDbAPI.getArchivedAlbumById(albumId)).pipe(
      map(album => album as ArchivedAlbumView | null)
    );
  }

  resetAlbumArchive(albumId: number): Observable<{ success: boolean; error?: string }> {
    return from(window.electronDbAPI.resetAlbumArchive(albumId));
  }

}
