import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ArchivesAlbumsService } from '../../../services/archives-albums.service';
import { ArchivedAlbumView, ArchiveStatus } from '../../../services/models/database.model';
import { AlbumCardComponent } from '../../../components/album-card/album-card.component';

@Component({
  selector: 'app-archives-albums',
  standalone: true,
  imports: [CommonModule, TranslateModule, AlbumCardComponent],
  templateUrl: './archives-albums.component.html',
  styleUrls: ['./archives-albums.component.scss']
})
export class ArchivesAlbumsComponent implements OnInit, OnDestroy {
  constructor(
    private router: Router,
    public archivesAlbumsService: ArchivesAlbumsService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Listen for album status changes
    if (window.electronEventsAPI && window.electronEventsAPI.onAlbumStatusChanged) {
      window.electronEventsAPI.onAlbumStatusChanged((update: { albumId: number, status: string }) => {
        console.debug('Album status changed:', update);
        
        const albumIndex = this.archivesAlbumsService.artistAlbums.findIndex(a => a.album_id === update.albumId);
        if (albumIndex !== -1) {
          this.archivesAlbumsService.artistAlbums[albumIndex].archive_status = update.status as ArchiveStatus;
          this.archivesAlbumsService.artistAlbums = [...this.archivesAlbumsService.artistAlbums];
          this.cdr.detectChanges();
        }
      });
    }
  }

  ngOnDestroy(): void {
  }

  get selectedArtist() {
    return this.archivesAlbumsService.selectedArtist;
  }

  get artistAlbums() {
    return this.archivesAlbumsService.artistAlbums;
  }

  onAlbumClick(album: ArchivedAlbumView): void {
    console.debug('Album clicked:', album);
    this.router.navigate(['/archives/album', album.album_id]);
  }

  toggleSort(): void {
    this.archivesAlbumsService.toggleSortOrder();
    this.cdr.detectChanges();
  }

  backToArtists(): void {
    this.router.navigate(['/archives']);
  }
}
