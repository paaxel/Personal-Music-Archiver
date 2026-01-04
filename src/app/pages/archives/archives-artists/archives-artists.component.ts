import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ArchivesArtistsListComponent } from '../archives-artists-list/archives-artists-list.component';
import { ArtistWithAlbumCount } from '../../../services/models/database.model';

@Component({
  selector: 'app-archives-artists',
  standalone: true,
  imports: [CommonModule, TranslateModule, ArchivesArtistsListComponent],
  templateUrl: './archives-artists.component.html',
  styleUrls: ['./archives-artists.component.scss']
})
export class ArchivesArtistsComponent implements OnInit {
  
  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
  }

  onArtistSelected(artistData: ArtistWithAlbumCount): void {
    console.debug('Artist selected:', artistData);
    // Navigate to albums page
    this.router.navigate(['/archives/albums', artistData.id]);
  }
}
