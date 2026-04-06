import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SearchAlbumService } from '../../../services/search-album.service';
import { SearchAlbumsService } from '../../../services/search-albums.service';
import { MusicbrainzService } from '../../../services/musicbrainz.service';
import { DatabaseService } from '../../../services/database.service';
import { LoaderService } from '../../../services/loader.service';
import { Album, Song, ArchiveStatus } from '../../../services/models/database.model';
import { ArchiveStatusMessagePipe } from '../../../pipes/archive-status-message.pipe';

@Component({
  selector: 'app-search-album-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, ArchiveStatusMessagePipe],
  templateUrl: './search-album-page.component.html',
  styleUrls: ['./search-album-page.component.scss']
})
export class SearchAlbumPageComponent implements OnInit, OnDestroy {
  isArchiving: boolean = false;

  constructor(
    private router: Router,
    public searchAlbumService: SearchAlbumService,
    private searchAlbumsService: SearchAlbumsService,
    private musicBrainzService: MusicbrainzService,
    private dbService: DatabaseService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Data is already loaded by resolver
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
  }

  get album() {
    return this.searchAlbumService.album;
  }

  get artist() {
    return this.searchAlbumService.artist;
  }

  get existingAlbum() {
    return this.searchAlbumService.existingAlbum;
  }

  onArchive(): void {
    if (!this.album || !this.artist || this.existingAlbum || this.isArchiving) {
      return;
    }

    console.debug('Starting archive for album:', this.album.title);
    this.isArchiving = true;
    this.loaderService.show();

    const artist = {
      name: this.artist.name,
      music_brainz_id: this.artist.id
    };

    this.dbService.addArtist(artist).subscribe({
      next: (artistId: number) => {
        const releaseYear = this.album?.date ? parseInt(this.album.date.split('-')[0], 10) : null;
        
        const album: Album = {
          name: this.album!.title,
          artist_id: artistId,
          release_date: this.album?.date || null,
          release_year: releaseYear,
          music_brainz_id: this.album?.id || '',
          music_brainz_release_group_id: this.searchAlbumService.releaseGroupId,
          archive_status: ArchiveStatus.NOT_ARCHIVED
        };

        this.dbService.addAlbum(album).subscribe({
          next: (albumId: number) => {
            const songs: Song[] = [];
            
            this.album?.media.forEach((media) => {
              media.tracks.forEach((track) => {
                songs.push({
                  name: track.title,
                  album_id: albumId,
                  track_number: track.position,
                  duration: track.length ? Math.floor(track.length / 1000) : null,
                  music_brainz_id: track.recording.id,
                  archive_status: ArchiveStatus.NOT_ARCHIVED
                });
              });
            });

            this.dbService.addSongsBatch(songs).subscribe({
              next: () => {
                console.debug('Album and songs added successfully');
                this.isArchiving = false;
                this.loaderService.hide();
                // Reload existing album status by release ID
                this.dbService.checkAlbumExists(this.album!.id).subscribe({
                  next: (existingAlbum) => {
                    this.searchAlbumService.existingAlbum = existingAlbum;
                    this.cdr.detectChanges();
                  }
                });
              },
              error: (error) => {
                console.error('Error adding songs:', error);
                this.isArchiving = false;
                this.loaderService.hide();
                this.cdr.detectChanges();
              }
            });
          },
          error: (error) => {
            console.error('Error adding album:', error);
            this.isArchiving = false;
            this.loaderService.hide();
            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {
        console.error('Error adding artist:', error);
        this.isArchiving = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      }
    });
  }

  getReleaseYear(): string {
    const date = this.album?.date;
    return date ? new Date(date).getFullYear().toString() : 'N/A';
  }

  getTrackDuration(milliseconds: number | null | undefined): string {
    if (!milliseconds) return 'N/A';
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getTrackArtistCredit(track: {
    'artist-credit'?: Array<{ name: string; joinphrase?: string }>;
    recording?: { 'artist-credit'?: Array<{ name: string; joinphrase?: string }> };
  }): string | null {
    const credits = track['artist-credit'] || track.recording?.['artist-credit'];
    if (!credits || credits.length <= 1) {
      return null;
    }

    return credits.map((credit) => credit.name + (credit.joinphrase || '')).join('');
  }

  canArchive(): boolean {
    return !this.existingAlbum && !this.isArchiving && !!this.album;
  }

  getMediaTitle(media: any, index: number): string {
    if (this.album && this.album.media.length > 1) {
      return `${media.format || 'Disc'} ${media.position || index + 1}`;
    }
    return '';
  }

  backToAlbums(): void {
    // Use the original searched artist from SearchAlbumsService for correct back-navigation,
    // avoiding redirection to a different artist when the album's primary artist differs.
    const searchedArtist = this.searchAlbumsService.artist;
    if (searchedArtist) {
      this.router.navigate(['/search/albums', searchedArtist.id]);
    } else if (this.artist) {
      this.router.navigate(['/search/albums', this.artist.id]);
    } else {
      this.backToArtists();
    }
  }

  backToArtists(): void {
    this.router.navigate(['/search']);
  }

  onArtistNameClick(): void {
    this.backToAlbums();
  }

  // ============================================================================
  // Release edition selector
  // ============================================================================

  get availableReleases() {
    return this.searchAlbumService.availableReleases;
  }

  get selectedReleaseIndex() {
    return this.searchAlbumService.selectedReleaseIndex;
  }

  get hasMultipleEditions(): boolean {
    return this.searchAlbumService.hasMultipleEditions();
  }

  onSelectRelease(index: number): void {
    if (index === this.selectedReleaseIndex) return;

    this.loaderService.show();
    this.searchAlbumService.selectRelease(index).subscribe({
      next: () => {
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error switching release edition:', error);
        this.loaderService.hide();
        this.cdr.detectChanges();
      }
    });
  }

  getReleaseLabel(release: any, index: number): string {
    const parts: string[] = [];
    if (release.date) parts.push(release.date);
    if (release.country) parts.push(release.country);
    if (release.disambiguation) parts.push(release.disambiguation);
    return parts.length > 0 ? parts.join(' · ') : `Edition ${index + 1}`;
  }
}