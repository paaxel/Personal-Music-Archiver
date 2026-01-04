import { Component, Input, OnChanges, SimpleChanges, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AlbumDetailsComponent } from '../album-details/album-details.component';
import { MusicBrainzAlbum, MusicBrainzAlbumDetails, MusicBrainzArtist } from '../../../services/models/musicbranz.model';
import { MusicbrainzService } from '../../../services/musicbrainz.service';
import { DatabaseService } from '../../../services/database.service';
import { Album, Song, ArchiveStatus } from '../../../services/models/database.model';
import { LoaderService } from '../../../services/loader.service';

@Component({
  selector: 'app-search-album-list',
  standalone: true,
  imports: [CommonModule, TranslateModule, AlbumDetailsComponent],
  templateUrl: './search-album-list.component.html',
  styleUrls: ['./search-album-list.component.scss']
})
export class SearchAlbumListComponent implements OnChanges {
  @Input() artist!: MusicBrainzArtist;
  @Output() backToArtists = new EventEmitter<void>();

  artistAlbums: MusicBrainzAlbum[] = [];
  isLoadingAlbums: boolean = false;
  archivingAlbums: Set<string> = new Set();
  addedAlbums: Set<string> = new Set();

  selectedAlbum: MusicBrainzAlbumDetails | null = null;
  currentReleaseGroupId: string = ''; // Track current release-group ID
  isLoadingAlbum: boolean = false;

  constructor(
    private musicBrainzService: MusicbrainzService,
    private dbService: DatabaseService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['artist'] && this.artist) {
      this.loadAlbums();
    }
  }

  loadAlbums(): void {
    this.isLoadingAlbums = true;
    this.selectedAlbum = null;
    this.addedAlbums.clear();
    this.loaderService.show();

    this.musicBrainzService.getAlbumsByArtist(this.artist.id).subscribe({
      next: (result) => {
        this.artistAlbums = result['release-groups'] || [];
        this.isLoadingAlbums = false;
        this.loaderService.hide();
        this.checkExistingAlbums();
        this.cdr.detectChanges()
      },
      error: (error) => {
        console.error('Error loading albums:', error);
        this.isLoadingAlbums = false;
        this.loaderService.hide();
        this.artistAlbums = [];
        this.cdr.detectChanges()
      }
    });
  }

  onAlbumClick(album: MusicBrainzAlbum): void {
    this.isLoadingAlbum = true;
    this.loaderService.show();
    this.currentReleaseGroupId = album.id; // Store the release-group ID

    if (!album.id) {
      console.error('Album has no ID:', album);
      this.isLoadingAlbum = false;
      this.loaderService.hide();
      return;
    }

    console.debug('Fetching releases for release-group:', album.id);
    
    // First, get releases for this release-group
    this.musicBrainzService.getReleasesForReleaseGroup(album.id).subscribe({
      next: (releases) => {
        if (releases && releases.length > 0) {
          // Get the first release (usually the primary one)
          const primaryRelease = releases[0];
          console.debug('Fetching details for release:', primaryRelease.id);
          
          // Now get the full details for this release
          this.musicBrainzService.getAlbumDetails(primaryRelease.id).subscribe({
            next: (albumDetails) => {
              console.debug('Album details received:', albumDetails);
              albumDetails.releaseGroupId = this.currentReleaseGroupId; // Set release-group ID
              this.selectedAlbum = albumDetails;
              this.isLoadingAlbum = false;
              this.loaderService.hide();
              this.cdr.detectChanges();
            },
            error: (error) => {
              console.error('Error loading album details:', error);
              this.isLoadingAlbum = false;
              this.loaderService.hide();
              this.cdr.detectChanges();
            }
          });
        } else {
          console.error('No releases found for release-group');
          this.isLoadingAlbum = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error fetching releases:', error);
        this.isLoadingAlbum = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      }
    });
  }

  backToAlbums(): void {
    this.selectedAlbum = null;
    // Clear any stale archive state
    this.archivingAlbums.clear();
    // Reload albums to refresh archive statuses
    this.checkExistingAlbums();
  }

  backToArtistFromAlbum(): void {
    this.backToAlbums();
  }

  onBackToArtists(): void {
    this.backToArtists.emit();
  }

  getReleaseYear(album: MusicBrainzAlbum): string {
    const date = album.date || album['first-release-date'];
    return date ? new Date(date).getFullYear().toString() : 'N/A';
  }

  onArchiveAlbum(album: MusicBrainzAlbum, event: Event): void {
    event.stopPropagation();
    
    if (this.archivingAlbums.has(album.id) || this.addedAlbums.has(album.id)) {
      return;
    }

    this.archivingAlbums.add(album.id);
    this.loaderService.show();
    
    this.musicBrainzService.getReleasesForReleaseGroup(album.id).subscribe({
      next: (releases) => {
        if (releases && releases.length > 0) {
          const primaryRelease = releases[0];
          
          this.musicBrainzService.getAlbumDetails(primaryRelease.id).subscribe({
            next: (albumDetails) => {
              albumDetails.releaseGroupId = album.id; // Set release-group ID
              this.archiveAlbumData(albumDetails, album);
            },
            error: (error) => {
              console.error('Error fetching album details for archive:', error);
              this.archivingAlbums.delete(album.id);
              this.loaderService.hide();
              this.cdr.detectChanges();
            }
          });
        } else {
          console.error('No releases found for album');
          this.archivingAlbums.delete(album.id);
          this.loaderService.hide();
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error fetching releases:', error);
        this.archivingAlbums.delete(album.id);
        this.loaderService.hide();
        this.cdr.detectChanges();
      }
    });
  }

  private archiveAlbumData(albumDetails: MusicBrainzAlbumDetails, originalAlbum: MusicBrainzAlbum): void {
    const artist = {
      name: this.artist.name,
      music_brainz_id: this.artist.id
    };

    this.dbService.addArtist(artist).subscribe({
      next: (artistId: number) => {
        // Extract year from release_date
        const releaseYear = albumDetails.date ? parseInt(albumDetails.date.split('-')[0], 10) : null;
        
        const album: Album = {
          name: albumDetails.title,
          artist_id: artistId,
          release_date: albumDetails.date || null,
          release_year: releaseYear,
          music_brainz_id: albumDetails.id,
          music_brainz_release_group_id: originalAlbum.id, // Save release-group ID
          archive_status: ArchiveStatus.NOT_ARCHIVED
        };

        this.dbService.addAlbum(album).subscribe({
          next: (albumId: number) => {
            const songs: Song[] = [];
            
            albumDetails.media.forEach((media) => {
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
                console.debug('Album downloaded successfully:', albumDetails.title);
                this.archivingAlbums.delete(originalAlbum.id);
                this.addedAlbums.add(originalAlbum.id);
                this.loaderService.hide();
                this.cdr.detectChanges();
              },
              error: (error) => {
                console.error('Error adding songs:', error);
                this.archivingAlbums.delete(originalAlbum.id);
                this.loaderService.hide();
                this.cdr.detectChanges();
              }
            });
          },
          error: (error) => {
            console.error('Error adding album:', error);
            this.archivingAlbums.delete(originalAlbum.id);
            this.loaderService.hide();
            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {
        console.error('Error adding artist:', error);
        this.archivingAlbums.delete(originalAlbum.id);
        this.loaderService.hide();
        this.cdr.detectChanges();
      }
    });
  }

  isAlbumArchiving(albumId: string): boolean {
    return this.archivingAlbums.has(albumId);
  }

  isAlbumAdded(albumId: string): boolean {
    return this.addedAlbums.has(albumId);
  }

  private checkExistingAlbums(): void {
    // Check each album by its release-group ID (no API calls!)
    this.artistAlbums.forEach(album => {
      this.dbService.checkAlbumByReleaseGroup(album.id).subscribe({
        next: (existingAlbum) => {
          if (existingAlbum) {
            this.addedAlbums.add(album.id);
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.error('Error checking album existence:', error);
        }
      });
    });
  }
}
