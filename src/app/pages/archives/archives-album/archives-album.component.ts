import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ArchivesAlbumService } from '../../../services/archives-album.service';
import { DatabaseService } from '../../../services/database.service';
import { ArchivesAlbumDetailsComponent } from '../archives-album-details/archives-album-details.component';

@Component({
  selector: 'app-archives-album',
  standalone: true,
  imports: [CommonModule, TranslateModule, ArchivesAlbumDetailsComponent],
  templateUrl: './archives-album.component.html',
  styleUrls: ['./archives-album.component.scss']
})
export class ArchivesAlbumComponent implements OnInit, OnDestroy {

  constructor(
    private router: Router,
    public archivesAlbumService: ArchivesAlbumService,
    private dbService: DatabaseService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Data is already loaded by resolver
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
  }

  get selectedAlbum() {
    return this.archivesAlbumService.selectedAlbum;
  }

  get selectedArtist() {
    return this.archivesAlbumService.selectedArtist;
  }

  onAlbumDeleted(albumId: number): void {
    console.debug(`Album ${albumId} was deleted, navigating back...`);
    
    if (this.selectedArtist) {
      // Navigate back to albums list for this artist
      this.router.navigate(['/archives/albums', this.selectedArtist.id]);
    } else {
      // Navigate to artists list
      this.backToArtists();
    }
  }

  onAlbumStatusChanged(albumId: number): void {
    console.debug('Album status changed for album:', albumId, '- Reloading album data');
    // Reload album to get updated status
    if (this.selectedAlbum) {
      this.archivesAlbumService.reloadAlbumAndSongs().subscribe({
        next: () => {
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error reloading album:', error);
        }
      });
    }
  }

  backToAlbums(): void {
    if (this.selectedArtist) {
      this.router.navigate(['/archives/albums', this.selectedArtist.id]);
    } else {
      this.backToArtists();
    }
  }

  backToArtists(): void {
    this.router.navigate(['/archives']);
  }
}
