import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ArchiveNotification {
  id: string;
  albumId: number;
  albumName: string;
  artistName: string;
  totalTracks: number;
  completedTracks: number;
  currentSong?: string;
  status: 'archiving' | 'completed' | 'error';
  timestamp: number;
}

export interface ArchiveProcessError {
  messageKey: string;
  params?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ArchiveStatusService {
  private notificationsSubject = new BehaviorSubject<ArchiveNotification[]>([]);
  private archiveProcessActiveSubject = new BehaviorSubject<boolean>(false);
  private archiveProcessErrorSubject = new BehaviorSubject<ArchiveProcessError | null>(null);
  
  public notifications$ = this.notificationsSubject.asObservable();
  public archiveProcessActive$ = this.archiveProcessActiveSubject.asObservable();
  public archiveProcessError$ = this.archiveProcessErrorSubject.asObservable();

  private notifications: Map<string, ArchiveNotification> = new Map();
  private isStopRequested: boolean = false;
  private isStartRequested: boolean = false;

  constructor() {
    console.debug('ArchiveStatusService initialized');
    this.setupEventListeners();
    this.checkArchiveProcessStatus();
  }

  private setupEventListeners(): void {
    if (!window.electronEventsAPI) {
      console.warn('electronEventsAPI not available');
      return;
    }

    // Listen for album archive started
    window.electronEventsAPI.onAlbumArchiveStarted?.((data: any) => {
      console.debug('Album archive started:', data);
      this.addOrUpdateNotification({
        id: `album-${data.albumId}`,
        albumId: data.albumId,
        albumName: data.albumName,
        artistName: data.artistName,
        totalTracks: data.totalTracks,
        completedTracks: data.completedTracks,
        status: 'archiving',
        timestamp: Date.now()
      });
    });

    // Listen for album archive progress
    window.electronEventsAPI.onAlbumArchiveProgress?.((data: any) => {
      console.debug('Album archive progress:', data);
      this.addOrUpdateNotification({
        id: `album-${data.albumId}`,
        albumId: data.albumId,
        albumName: data.albumName,
        artistName: data.artistName,
        totalTracks: data.totalTracks,
        completedTracks: data.completedTracks,
        currentSong: data.currentSong,
        status: 'archiving',
        timestamp: Date.now()
      });
    });

    // Listen for album archive complete
    window.electronEventsAPI.onAlbumArchiveComplete?.((data: any) => {
      console.debug('Album archive complete:', data);
      this.addOrUpdateNotification({
        id: `album-${data.albumId}`,
        albumId: data.albumId,
        albumName: data.albumName,
        artistName: data.artistName,
        totalTracks: data.totalTracks,
        completedTracks: data.completedTracks,
        status: data.status,
        timestamp: Date.now()
      });

      if( data.status === 'completed' ){
        // Auto-remove completed notification after 30 seconds
        setTimeout(() => {
          this.removeNotification(`album-${data.albumId}`);
        }, 30000);
      }
      
    });

    // Listen for archive process status
    window.electronEventsAPI.onArchiveProcessStatus?.((data: any) => {
      console.debug('Archive process status:', data);
      this.archiveProcessActiveSubject.next(data.isActive);
      
      // Handle error state with translation key
      if (data.errorKey) {
        console.error('Archive process error:', data.errorKey, data.errorParams);
        this.archiveProcessErrorSubject.next({
          messageKey: data.errorKey,
          params: data.errorParams
        });
      } else {
        this.archiveProcessErrorSubject.next(null);
      }
      
      // Clear stop requested flag when process actually stops
      if (!data.isActive) {
        this.isStopRequested = false;
        this.isStartRequested = false; // Also clear start request on failure
      }
      // Clear start requested flag when process actually starts
      if (data.isActive) {
        this.isStartRequested = false;
      }
    });
  }

  private async checkArchiveProcessStatus(): Promise<void> {
    try {
      if (window.electronArchiveAPI?.getProcessStatus) {
        const status = await window.electronArchiveAPI.getProcessStatus();
        this.archiveProcessActiveSubject.next(status.isActive);
      }
    } catch (error) {
      console.error('❌ Error checking archive process status:', error);
    }
  }

  private addOrUpdateNotification(notification: ArchiveNotification): void {
    this.notifications.set(notification.id, notification);
    this.notificationsSubject.next(Array.from(this.notifications.values()));
  }

  private removeNotification(id: string): void {
    this.notifications.delete(id);
    this.notificationsSubject.next(Array.from(this.notifications.values()));
  }

  public clearAll(): void {
    this.notifications.clear();
    this.notificationsSubject.next([]);
  }

  public async startArchiveProcess(): Promise<void> {
    if (!window.electronArchiveAPI?.startProcess) {
      throw new Error('Archive API not available');
    }

    try {
      // Clear any previous errors
      this.archiveProcessErrorSubject.next(null);
      
      // Set start requested flag immediately
      this.isStartRequested = true;
      const result = await window.electronArchiveAPI.startProcess();
      // Don't clear flag here - wait for the actual start event
    } catch (error) {
      console.error('❌ Error starting archive process:', error);
      this.isStartRequested = false;
      this.archiveProcessErrorSubject.next({
        messageKey: 'unknown_error',
        params: []
      });
      throw error;
    }
  }

  public async stopArchiveProcess(): Promise<void> {
    if (!window.electronArchiveAPI?.stopProcess) {
      throw new Error('Archive API not available');
    }

    try {
      // Set stop requested flag immediately
      this.isStopRequested = true;
      const result = await window.electronArchiveAPI.stopProcess();
      // Don't clear flag here - wait for the actual stop event
    } catch (error) {
      console.error('❌ Error stopping archive process:', error);
      this.isStopRequested = false;
      throw error;
    }
  }

  public isStoppingRequested(): boolean {
    return this.isStopRequested;
  }

  public isStartingRequested(): boolean {
    return this.isStartRequested;
  }
  
  public getLastError(): ArchiveProcessError | null {
    return this.archiveProcessErrorSubject.value;
  }
}
