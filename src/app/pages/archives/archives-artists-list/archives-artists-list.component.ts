import { Component, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DatabaseService } from '../../../services/database.service';
import { forkJoin } from 'rxjs';
import { ArtistCardComponent, ArtistCardData } from '../../../components/artist-card/artist-card.component';
import { ArtistWithAlbumCount } from '../../../services/models/database.model';

@Component({
  selector: 'app-archives-artists-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, ArtistCardComponent],
  templateUrl: './archives-artists-list.component.html',
  styleUrls: ['./archives-artists-list.component.scss']
})
export class ArchivesArtistsListComponent implements OnInit {
  @Output() artistSelected = new EventEmitter<ArtistWithAlbumCount>();
  
  displayedArtists: ArtistCardData[] = [];
  searchQuery: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 25;
  totalPages: number = 1;
  totalCount: number = 0;
  isLoading: boolean = false;
  private searchTimeout?: number;

  constructor(private dbService: DatabaseService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadArtists();
  }

  loadArtists(): void {
    this.isLoading = true;
    const offset = (this.currentPage - 1) * this.itemsPerPage;
    
    forkJoin({
      artists: this.dbService.getArtistsPaginated(this.searchQuery, this.itemsPerPage, offset),
      count: this.dbService.getArtistsCount(this.searchQuery)
    }).subscribe({
      next: ({ artists, count }) => {
        this.displayedArtists = artists.map(artist => ({
          artist: {
            id: artist.id,
            name: artist.name,
            music_brainz_id: artist.music_brainz_id
          },
          albumCount: artist.album_count
        }));

        this.totalCount = count;
        this.totalPages = Math.ceil(count / this.itemsPerPage);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading artists:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearchChange(): void {
    // Debounce search to avoid too many DB queries
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = window.setTimeout(() => {
      this.currentPage = 1;
      this.loadArtists();
    }, 300);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadArtists();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadArtists();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadArtists();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, this.currentPage - 2);
      const end = Math.min(this.totalPages, start + maxVisiblePages - 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  getStartIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalCount);
  }

  onArtistClick(artistData: ArtistCardData): void {
    this.artistSelected.emit({
      id: artistData.artist.id,
      name: artistData.artist.name,
      music_brainz_id: artistData.artist.music_brainz_id,
      album_count: artistData.albumCount
    });
  }
  
}
