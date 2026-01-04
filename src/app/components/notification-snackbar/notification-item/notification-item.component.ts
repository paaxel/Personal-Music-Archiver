import { Component, Input, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TranslateWithParamsPipe } from '../../../pipes/translate-with-params.pipe';
import { Notification } from '../notification-snackbar.component';

@Component({
  selector: 'app-notification-item',
  standalone: true,
  imports: [CommonModule, TranslateModule, TranslateWithParamsPipe],
  templateUrl: './notification-item.component.html',
  styleUrls: ['./notification-item.component.scss']
})
export class NotificationItemComponent {
  @ViewChild('notificationElement', { static: false })
  notificationElement?: ElementRef;

  @Input() notification!: Notification;

  closed: boolean = false;
  currentTime: Date = new Date();

  getIcon(type: 'success' | 'info' | 'warning' | 'error'): string {
    switch (type) {
      case 'success':
        return '✅';
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '•';
    }
  }

  close(callback?: () => void): void {
    this.fadeOut();
    
    setTimeout(() => {
      this.closed = true;
      if (callback) {
        callback();
      }
    }, 300);
  }

  private fadeOut(): void {
    if (this.notificationElement?.nativeElement?.style) {
      this.notificationElement.nativeElement.style.animation = 'slideOut 0.3s ease-in';
    }
  }
}
