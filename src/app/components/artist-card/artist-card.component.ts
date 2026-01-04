import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Artist } from '../../services/models/database.model';

export interface ArtistCardData {
  artist: Artist;
  albumCount?: number;
}

@Component({
  selector: 'app-artist-card',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './artist-card.component.html',
  styleUrls: ['./artist-card.component.scss']
})
export class ArtistCardComponent {
  @Input() artistData!: ArtistCardData;
  @Input() showAlbumCount: boolean = true;
  @Output() cardClick = new EventEmitter<ArtistCardData>();

  onCardClick(): void {
    this.cardClick.emit(this.artistData);
  }
}
