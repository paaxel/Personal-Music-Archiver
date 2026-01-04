import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DatabaseService } from '../../../services/database.service';
import { ArchiveStatusPipe } from '../../../pipes/archive-status.pipe';
import { MusicPlayerService } from '../../../services/music-player.service';
import { LoaderService } from '../../../services/loader.service';
import { ArchivedAlbumView, Song, ArchiveStatus } from '../../../services/models/database.model';
import { VideoUrlDialogComponent } from '../../../dialogs/video-url-dialog/video-url-dialog.component';
import { FileUploadDialogComponent } from '../../../dialogs/file-upload-dialog/file-upload-dialog.component';
import { ConfirmDialogComponent } from '../../../dialogs/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-archives-album-details',
  standalone: true,
  imports: [
    CommonModule, 
    TranslateModule, 
    ArchiveStatusPipe,
    VideoUrlDialogComponent,
    FileUploadDialogComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './archives-album-details.component.html',
  styleUrls: ['./archives-album-details.component.scss']
})
export class ArchivesAlbumDetailsComponent implements OnInit, OnDestroy {
  @Input() album!: ArchivedAlbumView;
  @Output() albumDeleted = new EventEmitter<number>();

  albumSongs: Song[] = [];
  isLoadingSongs: boolean = false;
  isDeleting: boolean = false;
  isResetting: boolean = false;
  
  // Duration mismatch threshold percentage
  readonly DURATION_MISMATCH_THRESHOLD = 5;
  
  // Dialog states
  showVideoUrlDialog: boolean = false;
  showFileUploadDialog: boolean = false;
  showDeleteConfirmDialog: boolean = false;
  showResetConfirmDialog: boolean = false;
  showDeleteSongDialog: boolean = false;
  selectedSong: Song | null = null;

  constructor(
    private dbService: DatabaseService,
    private playerService: MusicPlayerService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Set up listener for song status changes
    if (window.electronEventsAPI && window.electronEventsAPI.onSongStatusChanged) {
      console.debug('Setting up song status change listener');
      window.electronEventsAPI.onSongStatusChanged((update) => {
        console.debug('Song status changed:', update);
        
        // Only update if this is the current album
        if (this.album && update.albumId === this.album.album_id) {
          this.updateSongStatus(update.songId, update.status, update.fileId, update.archivedDuration);
          this.cdr.detectChanges();
        }
      });
    }

    this.loadSongsAndAlbumStatus();
  }

  ngOnDestroy(): void {
  }

  onArtistNameClick(): void {
    if (this.album?.artist_id) {
      this.router.navigate(['/archives/albums', this.album.artist_id]);
    }
  }

  updateSongStatus(songId: number, status: string, fileId?: number, archivedDuration?: number | null): void {
    console.debug("Updating song " + songId + " status to " + status);
    
    // Find the song in the current list
    const songIndex = this.albumSongs.findIndex(s => s.id === songId);
    
    if (songIndex !== -1) {
      // Update the song status in place with archived duration from event
      this.albumSongs[songIndex] = {
        ...this.albumSongs[songIndex],
        archive_status: status as any,
        archived_file: fileId || this.albumSongs[songIndex].archived_file,
        archived_file_duration: archivedDuration !== undefined ? archivedDuration : this.albumSongs[songIndex].archived_file_duration
      };
      
      // Trigger change detection by creating a new array reference
      this.albumSongs = [...this.albumSongs];
      
      console.debug("Song " + songId + " status updated in UI");
      
      // Refresh album status from database
      this.updateAlbum();
    } else {
      console.warn("Song " + songId + " not found in current album songs");
    }
  }

  /**
   * Refresh the album data from database to get updated archive status
   */
  private updateAlbum(): void {
    console.debug('Refreshing album status from database');
    
    this.dbService.getArchivedAlbumById(this.album.album_id).subscribe({
      next: (updatedAlbum) => {
        if (updatedAlbum) {
          this.album = updatedAlbum;
          console.debug('Album status updated:', this.album.archive_status);
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error refreshing album status:', error);
      }
    });
  }

  getArchiveStatusIcon(status: string): string {
    switch (status) {
      case 'ARCHIVED':
        return '✓';
      case 'PARTIALLY_ARCHIVED':
        return '⋯';
      case 'NOT_ARCHIVED':
        return '○';
      case 'VIDEO_NOT_FOUND':
        return '⚠';
      case 'ARCHIVING_FAILURE':
        return '✗';
      default:
        return '?';
    }
  }

  getTrackDuration(seconds: number | null | undefined): string {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Check if there's a significant duration mismatch (more than threshold% difference)
   */
  hasDurationMismatch(song: Song): boolean {
    if (!song.duration || !song.archived_file_duration) {
      return false;
    }
    
    const expectedDuration = song.duration;
    const actualDuration = song.archived_file_duration;
    const difference = Math.abs(expectedDuration - actualDuration);
    const percentageDiff = (difference / expectedDuration) * 100;
    
    return percentageDiff > this.DURATION_MISMATCH_THRESHOLD;
  }

  /**
   * Get duration comparison text
   */
  getDurationComparison(song: Song): string {
    if (!song.duration || !song.archived_file_duration) {
      return '';
    }
    
    const expected = this.getTrackDuration(song.duration);
    const actual = this.getTrackDuration(song.archived_file_duration);
    
    return `Expected: ${expected} | Actual: ${actual}`;
  }

  /**
   * Get the expected duration for display
   */
  getExpectedDuration(song: Song): string {
    if (!song.duration) return '';
    return this.getTrackDuration(song.duration);
  }

  /**
   * Get the actual duration for display
   */
  getActualDuration(song: Song): string {
    if (!song.archived_file_duration) return '';
    return this.getTrackDuration(song.archived_file_duration);
  }

  /**
   * Check if we should show both durations
   */
  shouldShowBothDurations(song: Song): boolean {
    if (!song.duration || !song.archived_file_duration) {
      return false;
    }
    return Math.abs(song.duration - song.archived_file_duration) > 2;
  }

  /**
   * Check if we should show the duration in crimson (mismatch)
   */
  shouldHighlightDuration(song: Song): boolean {
    return this.hasDurationMismatch(song);
  }

  /**
   * Get tooltip text for duration
   */
  getDurationTooltip(song: Song): string {
    if (!this.hasDurationMismatch(song)) {
      return '';
    }
    
    const expected = song.duration!;
    const actual = song.archived_file_duration!;
    const differenceInSeconds = Math.abs(expected - actual);
    
    return `Duration mismatch: ${differenceInSeconds} seconds difference`;
  }

  getCompletedSongsCount(): number {
    return this.albumSongs.filter(song => song.archive_status === 'ARCHIVED').length;
  }

  getTotalSongsCount(): number {
    return this.albumSongs.length;
  }

  getTotalAlbumDuration(): string {
    const totalSeconds = this.albumSongs.reduce((sum, song) => sum + (song.duration || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  async onPlaySong(song: Song): Promise<void> {
    if (song.archived_file) {
      try {
        // Get file path from database
        const filePath = await window.electronFileAPI.getFilePath(song.archived_file);
        
        if (filePath) {
          await this.playerService.playSong(
            song.id!,
            song.name,
            this.album.artist_name,
            this.album.album_name,
            filePath
          );
        } else {
          console.error('File path not found');
        }
      } catch (error) {
        console.error('Error playing song:', error);
      }
    }
  }

  async onOpenFolder(song: Song): Promise<void> {
    if (song.archived_file) {
      try {
        await window.electronFileAPI.openFileLocation(song.archived_file);
      } catch (error) {
        console.error('Error opening folder:', error);
      }
    }
  }

  onAddVideoUrl(song: Song): void {
    this.selectedSong = song;
    this.showVideoUrlDialog = true;
  }

  onUploadFile(song: Song): void {
    this.selectedSong = song;
    this.showFileUploadDialog = true;
  }

  onDeleteSongFile(song: Song): void {
    console.debug('Delete song file button clicked for song:', song.id);
    this.selectedSong = song;
    this.showDeleteSongDialog = true;
  }

  confirmDeleteSongFile(): void {
    if (!this.selectedSong || !this.selectedSong.id) {
      return;
    }

    console.debug('User confirmed deletion for song:', this.selectedSong.id);
    const songId = this.selectedSong.id;

    this.dbService.deleteSongFile(songId).subscribe({
      next: () => {
        console.debug('Song file deleted successfully');
        
        // Immediately update the song status in the local array
        const songIndex = this.albumSongs.findIndex(s => s.id === songId);
        if (songIndex !== -1) {
          this.albumSongs[songIndex] = {
            ...this.albumSongs[songIndex],
            archive_status: ArchiveStatus.NOT_ARCHIVED,
            archived_file: undefined,
            archived_file_duration: null
          };
          // Create new array reference to trigger change detection
          this.albumSongs = [...this.albumSongs];
        }
        
        // Reload songs and album status to reflect changes from database
        this.loadSongsAndAlbumStatus();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error deleting song file:', error);
        alert('Failed to delete song file: ' + error.message);
        this.cdr.detectChanges();
      }
    });

    this.showDeleteSongDialog = false;
    this.selectedSong = null;
  }

  cancelDeleteSongFile(): void {
    console.debug('User cancelled song file deletion');
    this.showDeleteSongDialog = false;
    this.selectedSong = null;
  }

  onVideoUrlSubmitted(url: string): void {
    if (this.selectedSong && this.selectedSong.id) {
      const wasArchived = this.selectedSong.archive_status === 'ARCHIVED';
      
      this.dbService.updateSongVideoUrl(this.selectedSong.id, url).subscribe({
        next: () => {
          if (wasArchived) {
            console.debug('Video URL updated - Song marked for re-archive');
          } else {
            console.debug('Video URL added successfully');
          }
          this.loadSongsAndAlbumStatus();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error updating video URL:', error);
          this.cdr.detectChanges();
        }
      });
    }
    this.showVideoUrlDialog = false;
    this.selectedSong = null;
  }

  onFileUploaded(file: File): void {
    if (this.selectedSong && this.selectedSong.id) {
      console.debug('Uploading file for song:', this.selectedSong.id);
      
      this.dbService.uploadSongFile(
        this.selectedSong.id,
        file,
        this.album.artist_name,
        this.album.album_name,
        this.selectedSong.track_number || 0,
        this.selectedSong.name
      ).subscribe({
        next: () => {
          console.debug('File uploaded successfully - Reloading album data');
        },
        complete: () => {
          this.loadSongsAndAlbumStatus();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error uploading file:', error);
          this.cdr.detectChanges();
        }
      });
    }
    this.showFileUploadDialog = false;
    this.selectedSong = null;
  }

  /**
   * Load songs and refresh the album status from parent
   * This ensures the album status badge is updated after song changes
   */
  private loadSongsAndAlbumStatus(): void {
    console.debug('Reloading songs and album status');
    
    this.isLoadingSongs = true;

    this.dbService.getSongsByAlbum(this.album.album_id).subscribe({
      next: (songs) => {
        this.albumSongs = songs;
        this.isLoadingSongs = false;
        this.cdr.detectChanges();
        this.updateAlbum();
      },
      error: (error) => {
        console.error('Error loading songs:', error);
        this.isLoadingSongs = false;
        this.albumSongs = [];
        this.cdr.detectChanges();
      }
    });
  }

  onDialogCancelled(): void {
    this.showVideoUrlDialog = false;
    this.showFileUploadDialog = false;
    this.showDeleteSongDialog = false;
    this.selectedSong = null;
  }

  onDeleteAlbum(): void {
    console.debug('Delete album button clicked for album:', this.album.album_id);
    console.debug('Album details:', {
      id: this.album.album_id,
      name: this.album.album_name,
      artist: this.album.artist_name,
      status: this.album.archive_status
    });
    this.showDeleteConfirmDialog = true;
  }

  confirmDeleteAlbum(): void {
    console.debug('User confirmed deletion for album:', this.album.album_id);
    
    if (this.isDeleting) {
      console.warn('Already deleting, ignoring duplicate request');
      return;
    }
    
    this.isDeleting = true;
    this.showDeleteConfirmDialog = false;
    console.debug('Starting album deletion process...');

    this.dbService.deleteAlbum(this.album.album_id).subscribe({
      next: (result) => {
        console.debug('Album deleted successfully:', result);
        console.debug('Deletion stats:', {
          albumId: result.albumId,
          albumName: result.albumName,
          artistName: result.artistName,
          deletedFiles: result.deletedFilesCount,
          failedFiles: result.failedFilesCount
        });
        
        if (result.failedFilesCount > 0) {
          console.warn("Failed to delete " + result.failedFilesCount + " files:", result.failedFiles);
          alert("Album deleted, but " + result.failedFilesCount + " file(s) could not be removed. They may be in use or already deleted.");
        }
        
        console.debug('Emitting albumDeleted event to parent');
        this.albumDeleted.emit(this.album.album_id);
        this.isDeleting = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error deleting album:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          albumId: this.album.album_id
        });
        alert('Failed to delete album: ' + error.message);
        this.isDeleting = false;
        this.cdr.detectChanges();
      }
    });
  }

  cancelDeleteAlbum(): void {
    console.debug('❌ User cancelled album deletion');
    this.showDeleteConfirmDialog = false;
  }

  onResetAlbumArchive(): void {
    console.debug('Reset album archive button clicked for album:', this.album.album_id);
    this.showResetConfirmDialog = true;
  }

  confirmResetAlbumArchive(): void {
    console.debug('User confirmed reset for album:', this.album.album_id);
    
    if (this.isResetting) {
      console.warn('Already resetting, ignoring duplicate request');
      return;
    }
    
    this.isResetting = true;
    this.showResetConfirmDialog = false;

    this.loaderService.show();
    console.debug('Starting album reset process...');

    this.dbService.resetAlbumArchive(this.album.album_id).subscribe({
      next: (result) => {
        if (result.success) {
          console.debug('Album reset successfully');
          // Reload songs and album status
          this.loadSongsAndAlbumStatus();
        } else {
          console.error('Failed to reset album:', result.error);
          alert('Failed to reset album: ' + (result.error || 'Unknown error'));
        }
        this.isResetting = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error resetting album:', error);
        alert('Failed to reset album: ' + error.message);
        this.isResetting = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      }
    });
  }

  cancelResetAlbumArchive(): void {
    console.debug('User cancelled album reset');
    this.showResetConfirmDialog = false;
  }
}
