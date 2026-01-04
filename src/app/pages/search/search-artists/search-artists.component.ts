import { Component, EventEmitter, Output, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DatabaseService } from '../../../services/database.service';
import { RecentSearch } from '../../../electron.d';
import { MusicBrainzArtist } from '../../../services/models/musicbranz.model';
import { MusicbrainzService } from '../../../services/musicbrainz.service';
import { LoaderService } from '../../../services/loader.service';
import { ClickOutsideDirective } from '../../../directives/click-outside.directive';

@Component({
  selector: 'app-search-artists',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, ClickOutsideDirective],
  templateUrl: './search-artists.component.html',
  styleUrls: ['./search-artists.component.scss']
})
export class SearchArtistsComponent implements OnInit {
  @Output() artistSelected = new EventEmitter<MusicBrainzArtist>();

  searchQuery: string = '';
  searchResults: MusicBrainzArtist[] = [];
  recentSearches: RecentSearch[] = [];
  isLoading: boolean = false;
  hasSearched: boolean = false;
  showRecentSearches: boolean = false;

  constructor(
    private musicBrainzService: MusicbrainzService,
    private dbService: DatabaseService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadRecentSearches();
  }

  loadRecentSearches(): void {
    this.dbService.getRecentSearches(15).subscribe({
      next: (searches) => {
        this.recentSearches = searches;
        this.cdr.detectChanges()
      },
      error: (error) => {
        console.error('Error loading recent searches:', error);
        this.cdr.detectChanges()
      }
    });
  }

  onInputFocus(): void {
    if (this.recentSearches.length > 0 && !this.searchQuery.trim()) {
      this.showRecentSearches = true;
    }
  }

  onClickOutsideSearch(): void {
    this.showRecentSearches = false;
  }

  onRecentSearchClick(searchText: string): void {
    this.searchQuery = searchText;
    this.showRecentSearches = false;
    this.onSearch();
  }

  onClearRecentSearches(): void {
    this.dbService.clearRecentSearches().subscribe({
      next: () => {
        this.recentSearches = [];
        this.showRecentSearches = false;
        this.cdr.detectChanges()
      },
      error: (error) => {
        console.error('Error clearing recent searches:', error);
        this.cdr.detectChanges()
      }
    });
  }

  onSearch(): void {
    if (!this.searchQuery.trim()) {
      return;
    }

    // Save to recent searches
    this.dbService.addRecentSearch(this.searchQuery.trim()).subscribe({
      next: () => {
        this.loadRecentSearches();
        this.cdr.detectChanges()
      },
      error: (error) => {
        console.error('Error saving recent search:', error);
        this.cdr.detectChanges()
      }
    });

    this.isLoading = true;
    this.hasSearched = true;
    this.showRecentSearches = false;
    this.loaderService.show();

    this.musicBrainzService.searchArtist(this.searchQuery).subscribe({
      next: (result) => {
        this.searchResults = result.artists;
        this.isLoading = false;
        this.loaderService.hide();
        this.cdr.detectChanges()
      },
      error: (error) => {
        this.isLoading = false;
        this.searchResults = [];
        this.loaderService.hide();
        this.cdr.detectChanges()
      }
    });
  }

  onArtistClick(artist: MusicBrainzArtist): void {
    this.artistSelected.emit(artist);
  }
}
