import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Params, Router } from '@angular/router';
import { DatabaseService } from './database.service';
import { ArchivedAlbumView, Artist, Song } from './models/database.model';
import { ResetableService } from '../resolvers/base/resetable-service.interface';

@Injectable({
  providedIn: 'root'
})
export class ArchivesAlbumService implements ResetableService {
  
  dataAreLoaded: boolean = false;
  
  selectedAlbum: ArchivedAlbumView | null = null;
  selectedArtist: Artist | null = null;
  albumSongs: Song[] = [];
  
  private albumId: number | null = null;

  constructor(
    private dbService: DatabaseService,
    private router: Router
  ) {}

  reset(): void {
    this.dataAreLoaded = false;
    this.resetData();
  }

  private resetData(): void {
    this.selectedAlbum = null;
    this.selectedArtist = null;
    this.albumSongs = [];
    this.albumId = null;
  }

  areDataLoaded(): boolean {
    return this.dataAreLoaded;
  }

  onResolveFailure(error: any): void {
    console.error('Error loading album:', error);
    this.router.navigate(['/archives']);
  }

  loadInitialInformation(routeParams?: Params): Observable<boolean> {
    if (!routeParams || !routeParams['albumId']) {
      this.router.navigate(['/archives']);
      return of(false);
    }

    this.resetData();
    this.albumId = +routeParams['albumId'];
    
    return this.loadAlbumData();
  }

  private loadAlbumData(): Observable<boolean> {
    return new Observable((observer) => {
      this.dbService.getArchivedAlbumById(this.albumId!).pipe(
        switchMap((album) => {
          if (!album) {
            throw new Error('Album not found');
          }
          this.selectedAlbum = album;
          
          return forkJoin([
            this.dbService.getArtistById(album.artist_id),
            this.dbService.getSongsByAlbum(album.album_id)
          ]);
        })
      ).subscribe({
        next: ([artist, songs]) => {
          this.selectedArtist = artist;
          this.albumSongs = songs;
          this.dataAreLoaded = true;
          observer.next(true);
        },
        error: (error: any) => {
          this.dataAreLoaded = false;
          observer.error(error);
        },
        complete: () => {
          observer.complete();
        }
      });
    });
  }

  reloadAlbumAndSongs(): Observable<boolean> {
    return new Observable((observer) => {
      forkJoin([
        this.dbService.getArchivedAlbumById(this.albumId!),
        this.dbService.getSongsByAlbum(this.albumId!)
      ]).subscribe({
        next: ([album, songs]) => {
          if (album) {
            this.selectedAlbum = album;
          }
          this.albumSongs = songs;
          observer.next(true);
        },
        error: (error) => {
          observer.error(error);
        },
        complete: () => {
          observer.complete();
        }
      });
    });
  }
}
