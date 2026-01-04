import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DatabaseService } from '../../../services/database.service';
import { LoaderService } from '../../../services/loader.service';
import { ArchiveStatusMessagePipe } from '../../../pipes/archive-status-message.pipe';
import { MusicBrainzAlbumDetails, MusicBrainzArtist } from '../../../services/models/musicbranz.model';
import { Album, ArchiveStatus, Song } from '../../../services/models/database.model';

@Component({
  selector: 'app-album-details',
  standalone: true,
  imports: [CommonModule, TranslateModule, ArchiveStatusMessagePipe],
  templateUrl: './album-details.component.html',
  styleUrls: ['./album-details.component.scss']
})
export class AlbumDetailsComponent implements OnChanges {
  @Input() album!: MusicBrainzAlbumDetails;
  @Input() artist!: MusicBrainzArtist;
  @Output() back = new EventEmitter<void>();
  @Output() backToArtist = new EventEmitter<void>();

  existingAlbum: Album | null = null;
  isLoading: boolean = false;
  isArchiving: boolean = false;

  constructor(
    private dbService: DatabaseService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['album'] && this.album) {
      this.checkAlbumExists();
    }
  }

  checkAlbumExists(): void {
    this.dbService.checkAlbumExists(this.album.id).subscribe({
      next: (existingAlbum) => {
        this.existingAlbum = existingAlbum;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error checking album:', error);
        this.cdr.detectChanges();
      }
    });
  }

  onArtistNameClick(): void {
    this.backToArtist.emit();
  }

  onArchive(): void {
    if (!this.album || !this.artist || this.existingAlbum || this.isArchiving) {
      return;
    }

    console.debug('Starting archive for album:', this.album.title);
    this.isArchiving = true;
    this.loaderService.show();

    // First, add or get the artist
    const artist = {
      name: this.artist.name,
      music_brainz_id: this.artist.id
    };

    this.dbService.addArtist(artist).subscribe({
      next: (artistId: number) => {
        // Extract year from release_date
        const releaseYear = this.album?.date ? parseInt(this.album.date.split('-')[0], 10) : null;
        
        // Then add the album
        const album: Album = {
          name: this.album!.title,
          artist_id: artistId,
          release_date: this.album?.date || null,
          release_year: releaseYear,
          music_brainz_id: this.album?.id || '',
          music_brainz_release_group_id: this.album.releaseGroupId, // Save release-group ID
          archive_status: ArchiveStatus.NOT_ARCHIVED
        };

        this.dbService.addAlbum(album).subscribe({
          next: (albumId: number) => {
            // Finally, add all songs
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

            // Add all songs in a single batch operation
            this.dbService.addSongsBatch(songs).subscribe({
              next: () => {
                console.debug('Album and songs added successfully');
                this.isArchiving = false;
                this.loaderService.hide();
                // Refresh the album check
                this.checkAlbumExists();
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

  onBack(): void {
    this.back.emit();
  }

  getReleaseYear(): string {
    const date = this.album.date;
    return date ? new Date(date).getFullYear().toString() : 'N/A';
  }

  getTrackDuration(milliseconds: number | null | undefined): string {
    if (!milliseconds) return 'N/A';
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
}
