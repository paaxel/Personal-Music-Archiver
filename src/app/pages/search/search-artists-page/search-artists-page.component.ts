import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SearchArtistsComponent } from '../search-artists/search-artists.component';
import { MusicBrainzArtist } from '../../../services/models/musicbranz.model';

@Component({
  selector: 'app-search-artists-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, SearchArtistsComponent],
  templateUrl: './search-artists-page.component.html',
  styleUrls: ['./search-artists-page.component.scss']
})
export class SearchArtistsPageComponent implements OnInit {
  
  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  onArtistSelected(artist: MusicBrainzArtist): void {
    console.debug('Artist selected:', artist);
    // Navigate to albums page with artist data in state
    this.router.navigate(['/search/albums', artist.id], {
      state: { artist: artist }
    });
  }
}
