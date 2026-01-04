import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SearchAlbumsService } from '../../../services/search-albums.service';
import { MusicbrainzService } from '../../../services/musicbrainz.service';
import { DatabaseService } from '../../../services/database.service';
import { LoaderService } from '../../../services/loader.service';
import { MusicBrainzAlbum } from '../../../services/models/musicbranz.model';
import { Album, Song, ArchiveStatus } from '../../../services/models/database.model';

@Component({
  selector: 'app-search-albums-page',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './search-albums-page.component.html',
  styleUrls: ['./search-albums-page.component.scss']
})
export class SearchAlbumsPageComponent implements OnInit, OnDestroy {
  archivingAlbums: Set<string> = new Set();

  constructor(
    private router: Router,
    public searchAlbumsService: SearchAlbumsService,
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

  get artist() {
    return this.searchAlbumsService.artist;
  }

  get artistAlbums() {
    return this.searchAlbumsService.artistAlbums;
  }

  onAlbumClick(album: MusicBrainzAlbum): void {
    console.debug('Album clicked:', album);
    this.router.navigate(['/search/album', album.id]);
  }

  onArchiveAlbum(album: MusicBrainzAlbum, event: Event): void {
    event.stopPropagation();
    
    if (this.archivingAlbums.has(album.id) || this.searchAlbumsService.existingAlbums.has(album.id) || !this.artist) {
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
              albumDetails.releaseGroupId = album.id;
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

  private archiveAlbumData(albumDetails: any, originalAlbum: MusicBrainzAlbum): void {
    if (!this.artist) return;

    const artist = {
      name: this.artist.name,
      music_brainz_id: this.artist.id
    };

    this.dbService.addArtist(artist).subscribe({
      next: (artistId: number) => {
        const releaseYear = albumDetails.date ? parseInt(albumDetails.date.split('-')[0], 10) : null;
        
        const album: Album = {
          name: albumDetails.title,
          artist_id: artistId,
          release_date: albumDetails.date || null,
          release_year: releaseYear,
          music_brainz_id: albumDetails.id,
          music_brainz_release_group_id: originalAlbum.id,
          archive_status: ArchiveStatus.NOT_ARCHIVED
        };

        this.dbService.addAlbum(album).subscribe({
          next: (albumId: number) => {
            const songs: Song[] = [];
            
            albumDetails.media.forEach((media: any) => {
              media.tracks.forEach((track: any) => {
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
                this.archivingAlbums.delete(originalAlbum.id);
                this.searchAlbumsService.existingAlbums.add(originalAlbum.id);
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
    return this.searchAlbumsService.existingAlbums.has(albumId);
  }

  getReleaseYear(album: MusicBrainzAlbum): string {
    const date = album.date || album['first-release-date'];
    return date ? new Date(date).getFullYear().toString() : 'N/A';
  }

  toggleSort(): void {
    this.searchAlbumsService.toggleSortOrder();
    this.cdr.detectChanges();
  }

  backToArtists(): void {
    this.router.navigate(['/search']);
  }
}
