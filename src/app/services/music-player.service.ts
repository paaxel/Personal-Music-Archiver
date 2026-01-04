import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface PlaybackState {
  songId: number;
  songName: string;
  artistName: string;
  albumName: string;
  filePath: string;
  isPlaying: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MusicPlayerService {
  private audio: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;
  private playbackStateSubject = new BehaviorSubject<PlaybackState | null>(null);
  private currentTimeSubject = new BehaviorSubject<number>(0);
  private durationSubject = new BehaviorSubject<number>(0);

  public playbackState$ = this.playbackStateSubject.asObservable();
  public currentTime$ = this.currentTimeSubject.asObservable();
  public duration$ = this.durationSubject.asObservable();

  constructor() {}

  async playSong(
    songId: number,
    songName: string,
    artistName: string,
    albumName: string,
    filePath: string
  ): Promise<void> {
    // Stop current playback if any (includes cleanup)
    this.stop();

    try {
      // Fetch file from Electron via IPC
      const { buffer } = await window.electronDbAPI.getSongFile(songId);
      
      // Convert buffer to Blob
      const blob = new Blob([buffer], { type: 'audio/mpeg' });
      
      // Create Object URL
      this.currentObjectUrl = URL.createObjectURL(blob);
      
      // Create new audio element
      this.audio = new Audio(this.currentObjectUrl);
      
      // Set up event listeners
      this.audio.addEventListener('loadedmetadata', () => {
        if (this.audio) {
          this.durationSubject.next(this.audio.duration);
        }
      });

      this.audio.addEventListener('timeupdate', () => {
        if (this.audio) {
          this.currentTimeSubject.next(this.audio.currentTime);
        }
      });

      this.audio.addEventListener('ended', () => {
        this.stop();
      });

      this.audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        this.stop();
      });

      // Update state BEFORE playing to ensure UI updates immediately
      this.playbackStateSubject.next({
        songId,
        songName,
        artistName,
        albumName,
        filePath,
        isPlaying: true
      });

      // Start playing
      await this.audio.play();
      
    } catch (error) {
      console.error('Error playing song:', error);
      // Ensure cleanup happens even if error occurs
      this.stop();
      throw error;
    }
  }

  play(): void {
    if (this.audio && !this.audio.paused) {
      return;
    }

    if (this.audio) {
      this.audio.play().then(() => {
        const currentState = this.playbackStateSubject.value;
        if (currentState) {
          this.playbackStateSubject.next({
            ...currentState,
            isPlaying: true
          });
        }
      }).catch(error => {
        console.error('Error resuming playback:', error);
        this.stop();
      });
    }
  }

  pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
      const currentState = this.playbackStateSubject.value;
      if (currentState) {
        this.playbackStateSubject.next({
          ...currentState,
          isPlaying: false
        });
      }
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      
      // Remove event listeners to prevent memory leaks
      this.audio.removeEventListener('loadedmetadata', () => {});
      this.audio.removeEventListener('timeupdate', () => {});
      this.audio.removeEventListener('ended', () => {});
      this.audio.removeEventListener('error', () => {});
      
      this.audio = null;
    }
    
    // Clean up Object URL to free memory
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
    
    this.playbackStateSubject.next(null);
    this.currentTimeSubject.next(0);
    this.durationSubject.next(0);
  }

  seek(time: number): void {
    if (this.audio) {
      this.audio.currentTime = time;
    }
  }

  getCurrentState(): PlaybackState | null {
    return this.playbackStateSubject.value;
  }
}
