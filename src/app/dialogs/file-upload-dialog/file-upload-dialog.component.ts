import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DialogOverlayComponent } from '../../components/dialog-overlay/dialog-overlay.component';

@Component({
  selector: 'app-file-upload-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule, DialogOverlayComponent],
  templateUrl: './file-upload-dialog.component.html',
  styleUrls: ['./file-upload-dialog.component.scss']
})
export class FileUploadDialogComponent {
  @Input() visible: boolean = false;
  @Input() songName: string = '';
  @Output() fileSelected = new EventEmitter<File>();
  @Output() cancelled = new EventEmitter<void>();

  selectedFile: File | null = null;
  error: string = '';
  dragOver: boolean = false;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
  }

  handleFile(file: File): void {
    // Check if file is MP3
    if (!file.name.toLowerCase().endsWith('.mp3') && file.type !== 'audio/mpeg') {
      this.error = 'Please select an MP3 file';
      this.selectedFile = null;
      return;
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      this.error = 'File size must be less than 50MB';
      this.selectedFile = null;
      return;
    }

    this.selectedFile = file;
    this.error = '';
  }

  onSubmit(): void {
    if (!this.selectedFile) {
      this.error = 'Please select a file';
      return;
    }

    this.fileSelected.emit(this.selectedFile);
    this.reset();
  }

  onCancel(): void {
    this.cancelled.emit();
    this.reset();
  }

  reset(): void {
    this.selectedFile = null;
    this.error = '';
    this.dragOver = false;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
