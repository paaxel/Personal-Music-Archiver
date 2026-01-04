import { Component, EventEmitter, Output, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogOverlayComponent } from '../../components/dialog-overlay/dialog-overlay.component';

@Component({
  selector: 'app-video-url-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, DialogOverlayComponent],
  templateUrl: './video-url-dialog.component.html',
  styleUrls: ['./video-url-dialog.component.scss']
})
export class VideoUrlDialogComponent implements OnChanges {
  @Input() visible: boolean = false;
  @Input() songName: string = '';
  @Input() isAlreadyArchived: boolean = false;
  @Input() currentVideoUrl: string = '';
  @Output() urlSubmitted = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  videoUrl: string = '';
  error: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    // When dialog becomes visible, initialize videoUrl with current URL
    if (changes['visible'] && changes['visible'].currentValue === true) {
      this.videoUrl = this.currentVideoUrl || '';
      this.error = '';
    }
  }

  isHttpsUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  onSubmit(): void {
    if (!this.videoUrl.trim()) {
      this.error = 'Please enter a valid URL';
      return;
    }

    // Basic URL validation
    if (!this.isHttpsUrl(this.videoUrl)) {
      this.error = 'Please enter a valid URL';
      return;
    }

    this.urlSubmitted.emit(this.videoUrl);
    this.reset();
  }

  onCancel(): void {
    this.cancelled.emit();
    this.reset();
  }

  reset(): void {
    this.videoUrl = '';
    this.error = '';
  }
}
