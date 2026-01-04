import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reusable dialog overlay component
 * Provides a consistent modal dialog experience across the application
 * 
 * @example
 * <app-dialog-overlay [visible]="showDialog" (closed)="onClose()">
 *   <div class="dialog-content">Your content here</div>
 * </app-dialog-overlay>
 */
@Component({
  selector: 'app-dialog-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dialog-overlay.component.html',
  styleUrls: ['./dialog-overlay.component.scss']
})
export class DialogOverlayComponent {
  @Input() visible: boolean = false;
  @Output() closed = new EventEmitter<void>();

  onOverlayClick(): void {
    this.closed.emit();
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
