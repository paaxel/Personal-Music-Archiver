import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SearchArtistsComponent } from './search-artists/search-artists.component';
import { SearchAlbumListComponent } from './search-album-list/search-album-list.component';
import { MusicBrainzArtist } from '../../services/models/musicbranz.model';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, TranslateModule, SearchArtistsComponent, SearchAlbumListComponent],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {
  selectedArtist: MusicBrainzArtist | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.selectedArtist = null;
  }

  onArtistSelected(artist: MusicBrainzArtist): void {
    this.selectedArtist = artist;
  }

  backToArtists(): void {
    this.selectedArtist = null;
  }
}
