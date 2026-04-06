import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Song, ArchiveStatus } from './models/database.model';

export interface PlaybackState {
  songId: number;
  songName: string;
  artistName: string;
  albumName: string;
  albumId: number;
  artistId: number;
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

  /** Songs of the currently playing album, used for next/prev navigation */
  private albumSongs: Song[] = [];

  public playbackState$ = this.playbackStateSubject.asObservable();
  public currentTime$ = this.currentTimeSubject.asObservable();
  public duration$ = this.durationSubject.asObservable();

  constructor() {}

  async playSong(
    songId: number,
    songName: string,
    artistName: string,
    albumName: string,
    albumId: number,
    artistId: number,
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
        // Auto-play next song if available, otherwise stop
        this.playNext().catch(() => this.stop());
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
        albumId,
        artistId,
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

  /** Set the list of songs for the current album to enable next/prev navigation */
  setAlbumSongs(songs: Song[]): void {
    this.albumSongs = songs;
  }

  /**
   * Find the next playable (ARCHIVED) song in the album relative to the current song.
   * Skips songs that are not archived.
   */
  async playNext(): Promise<void> {
    const nextSong = this.findAdjacentPlayableSong(1);
    if (nextSong) {
      await this.playAdjacentSong(nextSong);
    }
  }

  /**
   * Find the previous playable (ARCHIVED) song in the album relative to the current song.
   * Skips songs that are not archived.
   */
  async playPrevious(): Promise<void> {
    const prevSong = this.findAdjacentPlayableSong(-1);
    if (prevSong) {
      await this.playAdjacentSong(prevSong);
    }
  }

  /** Check if there is a next playable song available */
  hasNext(): boolean {
    return this.findAdjacentPlayableSong(1) !== null;
  }

  /** Check if there is a previous playable song available */
  hasPrevious(): boolean {
    return this.findAdjacentPlayableSong(-1) !== null;
  }

  /**
   * Search for the nearest playable song in the given direction.
   * @param direction 1 for next, -1 for previous
   */
  private findAdjacentPlayableSong(direction: 1 | -1): Song | null {
    const currentState = this.playbackStateSubject.value;
    if (!currentState || this.albumSongs.length === 0) {
      return null;
    }

    const currentIndex = this.albumSongs.findIndex(s => s.id === currentState.songId);
    if (currentIndex === -1) {
      return null;
    }

    // Walk through songs in the given direction, skipping non-archived ones
    for (let i = currentIndex + direction; i >= 0 && i < this.albumSongs.length; i += direction) {
      if (this.albumSongs[i].archive_status === ArchiveStatus.ARCHIVED && this.albumSongs[i].archived_file) {
        return this.albumSongs[i];
      }
    }

    return null;
  }

  /** Play an adjacent song reusing the current album context */
  private async playAdjacentSong(song: Song): Promise<void> {
    const currentState = this.playbackStateSubject.value;
    if (!currentState || !song.id) {
      return;
    }

    try {
      const filePath = await window.electronFileAPI.getFilePath(song.archived_file!);
      if (filePath) {
        await this.playSong(
          song.id,
          song.name,
          currentState.artistName,
          currentState.albumName,
          currentState.albumId,
          currentState.artistId,
          filePath
        );
      }
    } catch (error) {
      console.error('Error playing adjacent song:', error);
    }
  }

  getCurrentState(): PlaybackState | null {
    return this.playbackStateSubject.value;
  }
}
