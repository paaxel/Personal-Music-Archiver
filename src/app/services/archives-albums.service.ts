import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { Params, Router } from '@angular/router';
import { DatabaseService } from './database.service';
import { ArtistWithAlbumCount, ArchivedAlbumView } from './models/database.model';
import { ResetableService } from '../resolvers/base/resetable-service.interface';

@Injectable({
  providedIn: 'root'
})
export class ArchivesAlbumsService implements ResetableService {
  
  dataAreLoaded: boolean = false;
  
  selectedArtist: ArtistWithAlbumCount | null = null;
  artistAlbums: ArchivedAlbumView[] = [];
  sortDescending: boolean = true; // newest first by default
  
  private artistId: number | null = null;

  constructor(
    private dbService: DatabaseService,
    private router: Router
  ) {}

  reset(): void {
    this.dataAreLoaded = false;
    this.resetData();
  }

  private resetData(): void {
    this.selectedArtist = null;
    this.artistAlbums = [];
    this.artistId = null;
    this.sortDescending = true;
  }

  areDataLoaded(): boolean {
    return this.dataAreLoaded;
  }

  onResolveFailure(error: any): void {
    console.error('Error loading artist albums:', error);
    this.router.navigate(['/archives']);
  }

  loadInitialInformation(routeParams?: Params): Observable<boolean> {
    if (!routeParams || !routeParams['artistId']) {
      this.router.navigate(['/archives']);
      return of(false);
    }

    this.resetData();
    this.artistId = +routeParams['artistId'];
    
    return this.loadArtistAlbumsData();
  }

  private loadArtistAlbumsData(): Observable<boolean> {
    return new Observable((observer) => {
      forkJoin([
        this.dbService.getArtistById(this.artistId!),
        this.dbService.getArchivedAlbumsByArtist(this.artistId!)
      ]).subscribe({
        next: ([artist, albums]) => {
          this.selectedArtist = artist as ArtistWithAlbumCount;
          this.artistAlbums = albums;
          this.sortAlbums();
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

  private sortAlbums(): void {
    this.artistAlbums.sort((a, b) => {
      const yearA = a.release_year || 0;
      const yearB = b.release_year || 0;
      
      if (yearA === 0 && yearB === 0) return 0;
      if (yearA === 0) return 1; // Albums without years go to the end
      if (yearB === 0) return -1;
      
      const comparison = yearB - yearA;
      return this.sortDescending ? comparison : -comparison;
    });
  }

  toggleSortOrder(): void {
    this.sortDescending = !this.sortDescending;
    this.sortAlbums();
  }

  reloadAlbums(): Observable<boolean> {
    return new Observable((observer) => {
      this.dbService.getArchivedAlbumsByArtist(this.artistId!).subscribe({
        next: (albums) => {
          this.artistAlbums = albums;
          this.sortAlbums();
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
