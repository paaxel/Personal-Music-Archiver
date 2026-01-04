import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MusicPlayerService, PlaybackState } from '../../services/music-player.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-music-player',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './music-player.component.html',
  styleUrls: ['./music-player.component.scss']
})
export class MusicPlayerComponent implements OnInit, OnDestroy {
  playbackState: PlaybackState | null = null;
  currentTime: number = 0;
  duration: number = 0;
  isVisible: boolean = false;
  
  private subscription?: Subscription;

  constructor(private playerService: MusicPlayerService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.subscription = this.playerService.playbackState$.subscribe(state => {
      this.playbackState = state;
      this.isVisible = state !== null;
      this.cdr.detectChanges();
    });

    this.playerService.currentTime$.subscribe(time => {
      this.currentTime = time;
    this.cdr.detectChanges();
    });

    this.playerService.duration$.subscribe(duration => {
      this.duration = duration;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  togglePlayPause(): void {
    if (this.playbackState?.isPlaying) {
      this.playerService.pause();
    } else {
      this.playerService.play();
    }
  }

  stop(): void {
    this.playerService.stop();
  }

  seek(event: Event): void {
    const input = event.target as HTMLInputElement;
    const time = parseFloat(input.value);
    this.playerService.seek(time);
  }

  close(): void {
    this.playerService.stop();
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getProgressPercentage(): number {
    if (this.duration === 0) return 0;
    return (this.currentTime / this.duration) * 100;
  }
}
