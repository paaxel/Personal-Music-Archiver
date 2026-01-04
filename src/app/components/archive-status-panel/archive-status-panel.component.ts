import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ArchiveStatusService, ArchiveNotification, ArchiveProcessError } from '../../services/archive-status.service';
import { Subscription } from 'rxjs';
import { TranslateWithParamsPipe } from '../../pipes/translate-with-params.pipe';

@Component({
  selector: 'app-archive-status-panel',
  standalone: true,
  imports: [CommonModule, TranslateModule, TranslateWithParamsPipe],
  templateUrl: './archive-status-panel.component.html',
  styleUrls: ['./archive-status-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArchiveStatusPanelComponent implements OnInit, OnDestroy {
  isOpen = false;
  notifications: ArchiveNotification[] = [];
  unreadCount = 0;
  isArchiveProcessActive = false;
  archiveProcessError: ArchiveProcessError | null = null;
  isTogglingProcess = false;
  
  private subscription?: Subscription;
  private processStatusSubscription?: Subscription;
  private errorSubscription?: Subscription;

  constructor(
    private archiveStatusService: ArchiveStatusService,
    private cdr: ChangeDetectorRef
  ) {
    console.debug('ArchiveStatusPanelComponent constructed');
  }

  ngOnInit(): void {
    console.debug('ArchiveStatusPanelComponent initializing...');
    try {
      // Subscribe to notifications
      this.subscription = this.archiveStatusService.notifications$.subscribe({
        next: (notifications) => {
          console.debug('ArchiveStatusPanel received notifications:', notifications);
          this.notifications = notifications;
          this.unreadCount = notifications.filter(n => n.status === 'archiving').length;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error in notification subscription:', error);
        }
      });
      
      // Subscribe to archive process status
      this.processStatusSubscription = this.archiveStatusService.archiveProcessActive$.subscribe({
        next: (isActive) => {
          console.debug('Archive process status changed:', isActive);
          this.isArchiveProcessActive = isActive;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error in process status subscription:', error);
        }
      });
      
      // Subscribe to archive process errors
      this.errorSubscription = this.archiveStatusService.archiveProcessError$.subscribe({
        next: (error) => {
          console.debug('Archive process error:', error);
          this.archiveProcessError = error;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error in error subscription:', error);
        }
      });
      
      console.debug('ArchiveStatusPanel subscription created');
    } catch (error) {
      console.error('Error initializing archive status panel:', error);
    }
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.processStatusSubscription) {
      this.processStatusSubscription.unsubscribe();
    }
    if (this.errorSubscription) {
      this.errorSubscription.unsubscribe();
    }
  }

  togglePanel(): void {
    this.isOpen = !this.isOpen;
    this.cdr.markForCheck();
  }

  closePanel(): void {
    this.isOpen = false;
    this.cdr.markForCheck();
  }

  clearAllNotifications(): void {
    this.archiveStatusService.clearAll();
    this.closePanel();
  }

  async toggleArchiveProcess(): Promise<void> {
    if (this.isTogglingProcess || this.isArchiveProcessStopping() || this.isArchiveProcessStarting()) {
      return;
    }

    this.isTogglingProcess = true;
    this.cdr.markForCheck();

    try {
      if (this.isArchiveProcessActive) {
        await this.archiveStatusService.stopArchiveProcess();
        console.debug('Archive process stop requested...');
        this.cdr.markForCheck(); // Trigger update to show stopping state
      } else {
        await this.archiveStatusService.startArchiveProcess();
        console.debug('Archive process start requested...');
        this.cdr.markForCheck(); // Trigger update to show starting state
      }
    } catch (error) {
      console.error('Error toggling archive process:', error);
      alert('Failed to toggle archive process: ' + error);
    } finally {
      this.isTogglingProcess = false;
      this.cdr.markForCheck();
    }
  }

  isArchiveProcessStopping(): boolean {
    return this.isArchiveProcessActive && this.archiveStatusService.isStoppingRequested();
  }

  isArchiveProcessStarting(): boolean {
    return !this.isArchiveProcessActive && this.archiveStatusService.isStartingRequested();
  }

  hasError(): boolean {
    return this.archiveProcessError !== null;
  }

  getProgressPercentage(notification: ArchiveNotification): number {
    if (notification.totalTracks === 0) return 0;
    return Math.round((notification.completedTracks / notification.totalTracks) * 100);
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'archiving':
        return 'notifications.archiving';
      case 'completed':
        return 'notifications.completed';
      case 'error':
        return 'notifications.error';
      default:
        return '';
    }
  }
}
