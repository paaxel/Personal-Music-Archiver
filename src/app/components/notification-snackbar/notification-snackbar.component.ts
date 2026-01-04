import { Component, OnInit, OnDestroy, ViewContainerRef, ViewChild, ComponentRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationItemComponent } from './notification-item/notification-item.component';

export interface Notification {
  id: number;
  type: 'success' | 'info' | 'warning' | 'error';
  messageKey: string;
  translationKey: string;
  params?: string[];
}

@Component({
  selector: 'app-notification-snackbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-snackbar.component.html',
  styleUrls: ['./notification-snackbar.component.scss']
})
export class NotificationSnackbarComponent implements OnInit, OnDestroy {
  @ViewChild('notificationContainer', { read: ViewContainerRef, static: true })
  container!: ViewContainerRef;

  private notificationIdCounter = 0;
  private readonly DISPLAY_DURATION = 4000; // 4 seconds
  private componentRefs: Map<number, ComponentRef<NotificationItemComponent>> = new Map();

  ngOnInit(): void {
    this.container.clear();
    
    // Listen for notifications from Electron
    if (window.electronNotificationAPI?.onNotification) {
      window.electronNotificationAPI.onNotification((notification) => {
        this.showNotification(notification.type, notification.messageKey, notification.params);
      });
    }
  }

  ngOnDestroy(): void {
    // Destroy all active components
    this.componentRefs.forEach(ref => ref.destroy());
    this.componentRefs.clear();
  }

  showNotification(type: 'success' | 'info' | 'warning' | 'error', messageKey: string, params?: string[]): void {
    const notification: Notification = {
      id: this.notificationIdCounter++,
      type,
      messageKey,
      translationKey: `${type}.${messageKey}`,
      params
    };

    this.createNotificationComponent(notification);
  }

  private createNotificationComponent(notification: Notification): void {
    // Create component dynamically
    const componentRef = this.container.createComponent(NotificationItemComponent);
    
    // Set component inputs
    componentRef.instance.notification = notification;
    
    // Store reference
    this.componentRefs.set(notification.id, componentRef);

    // Schedule auto-removal
    const duration = this.DISPLAY_DURATION;
    this.scheduleRemoval(notification.id, componentRef, duration);
  }

  private scheduleRemoval(id: number, componentRef: ComponentRef<NotificationItemComponent>, delay: number): void {
    setTimeout(() => {
      componentRef.instance.close(() => {
        this.removeNotificationComponent(id);
      });
    }, delay);
  }

  private removeNotificationComponent(id: number): void {
    const componentRef = this.componentRefs.get(id);
    if (componentRef) {
      componentRef.destroy();
      this.componentRefs.delete(id);
    }
  }
}
