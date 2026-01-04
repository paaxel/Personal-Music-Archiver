import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ArchivedAlbumView } from '../../services/models/database.model';
import { ArchiveStatusShortPipe } from '../../pipes/archive-status-short.pipe';

@Component({
  selector: 'app-album-card',
  standalone: true,
  imports: [CommonModule, TranslateModule, ArchiveStatusShortPipe],
  templateUrl: './album-card.component.html',
  styleUrls: ['./album-card.component.scss']
})
export class AlbumCardComponent {
  @Input() album!: ArchivedAlbumView;
  @Input() showStatus: boolean = true;
  @Output() cardClick = new EventEmitter<ArchivedAlbumView>();

  onCardClick(): void {
    this.cardClick.emit(this.album);
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'DOWNLOAD_COMPLETE':
      case 'ARCHIVED':
        return '✓';
      case 'PARTIALLY_DOWNLOADED':
      case 'PARTIALLY_ARCHIVED':
        return '⋯';
      case 'NOT_DOWNLOADED':
      case 'NOT_ARCHIVED':
        return '○';
      case 'VIDEO_NOT_FOUND':
        return '⚠';
      case 'ARCHIVING_FAILURE':
        return '✗';
      default:
        return '○';
    }
  }
}
