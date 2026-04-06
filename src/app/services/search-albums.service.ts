import { Injectable } from '@angular/core';
import { Observable, forkJoin, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Params, Router } from '@angular/router';
import { MusicbrainzService } from './musicbrainz.service';
import { DatabaseService } from './database.service';
import { MusicBrainzArtist, MusicBrainzAlbum } from './models/musicbranz.model';
import { ResetableService } from '../resolvers/base/resetable-service.interface';
import { ReleaseGroupSearchOptions } from '../electron.d';

/** Available MusicBrainz primary types for release-group filtering */
export const AVAILABLE_PRIMARY_TYPES = ['Album', 'Single', 'EP', 'Broadcast', 'Other'] as const;

/** Available MusicBrainz secondary types that can be excluded */
export const AVAILABLE_SECONDARY_TYPES = ['Live', 'Compilation', 'Soundtrack', 'Remix', 'DJ-mix', 'Mixtape/Street'] as const;

/** Default search options matching original behavior */
export const DEFAULT_SEARCH_OPTIONS: ReleaseGroupSearchOptions = {
  primaryTypes: ['Album'],
  excludeSecondaryTypes: ['Live', 'Compilation'],
  status: 'Official'
};

@Injectable({
  providedIn: 'root'
})
export class SearchAlbumsService implements ResetableService {
  
  dataAreLoaded: boolean = false;
  
  artist: MusicBrainzArtist | null = null;
  artistAlbums: MusicBrainzAlbum[] = [];
  existingAlbums: Set<string> = new Set();
  sortDescending: boolean = true; // newest first by default
  searchOptions: ReleaseGroupSearchOptions = { ...DEFAULT_SEARCH_OPTIONS };
  
  private artistId: string | null = null;

  constructor(
    private musicBrainzService: MusicbrainzService,
    private dbService: DatabaseService,
    private router: Router
  ) {}

  reset(): void {
    this.dataAreLoaded = false;
    this.resetData();
  }

  private resetData(): void {
    this.artist = null;
    this.artistAlbums = [];
    this.existingAlbums = new Set();
    this.artistId = null;
    this.sortDescending = true;
    this.searchOptions = { ...DEFAULT_SEARCH_OPTIONS };
  }

  areDataLoaded(): boolean {
    return this.dataAreLoaded;
  }

  onResolveFailure(error: any): void {
    console.error('Error loading artist albums:', error);
    this.router.navigate(['/search']);
  }

  loadInitialInformation(routeParams?: Params): Observable<boolean> {
    if (!routeParams || !routeParams['artistId']) {
      this.router.navigate(['/search']);
      return of(false);
    }

    this.resetData();
    this.artistId = routeParams['artistId'];
    
    return this.loadArtistAlbumsData();
  }

  private loadArtistAlbumsData(): Observable<boolean> {
    return new Observable((observer) => {
      this.loadAlbumsCall().subscribe({
        next: () => {
          // After loading albums, check which ones exist
          this.checkExistingAlbums().subscribe({
            next: () => {
              this.dataAreLoaded = true;
              observer.next(true);
              observer.complete();
            },
            error: (error) => {
              this.dataAreLoaded = false;
              observer.error(error);
            }
          });
        },
        error: (error: any) => {
          this.dataAreLoaded = false;
          observer.error(error);
        }
      });
    });
  }

  private loadAlbumsCall(): Observable<boolean> {
    return this.musicBrainzService.getAlbumsByArtist(this.artistId!, 100, this.searchOptions).pipe(
      map((result) => {
        this.artistAlbums = result['release-groups'] || [];
        
        // Sort albums by release date
        this.sortAlbums();
        
        // Extract artist info from first album if available
        if (this.artistAlbums.length > 0 && this.artistAlbums[0]['artist-credit']) {
          const artistCredit = this.artistAlbums[0]['artist-credit'][0];
          this.artist = {
            id: artistCredit.artist.id,
            name: artistCredit.name,
            'sort-name': artistCredit.artist['sort-name'] || artistCredit.name,
            type: artistCredit.artist.type || '',
            disambiguation: artistCredit.artist.disambiguation || ''
          };
        }
        
        return true;
      }),
      catchError((err) => {
        return throwError(() => err);
      })
    ) as Observable<boolean>;
  }

  private checkExistingAlbums(): Observable<boolean> {
    if (this.artistAlbums.length === 0) {
      return of(true);
    }

    this.existingAlbums.clear();
    const checkObservables = this.artistAlbums.map(album =>
      this.dbService.checkAlbumByReleaseGroup(album.id)
    );
    
    return forkJoin(checkObservables).pipe(
      map((results) => {
        results.forEach((existingAlbum, index) => {
          if (existingAlbum) {
            this.existingAlbums.add(this.artistAlbums[index].id);
          }
        });
        console.debug('Checked existing albums:', this.existingAlbums.size);
        return true;
      }),
      catchError((error) => {
        console.error('Error checking existing albums:', error);
        return of(true); // Continue even if check fails
      })
    );
  }

  private sortAlbums(): void {
    this.artistAlbums.sort((a, b) => {
      const dateA = a['first-release-date'] || a.date || '';
      const dateB = b['first-release-date'] || b.date || '';
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1; // Albums without dates go to the end
      if (!dateB) return -1;
      
      const comparison = dateB.localeCompare(dateA);
      return this.sortDescending ? comparison : -comparison;
    });
  }

  toggleSortOrder(): void {
    this.sortDescending = !this.sortDescending;
    this.sortAlbums();
  }

  reloadAlbums(): Observable<boolean> {
    return this.loadAlbumsCall();
  }

  /** Update search options and reload albums with the new filter configuration */
  updateSearchOptionsAndReload(options: ReleaseGroupSearchOptions): Observable<boolean> {
    this.searchOptions = { ...options };
    return new Observable((observer) => {
      this.loadAlbumsCall().subscribe({
        next: () => {
          this.checkExistingAlbums().subscribe({
            next: () => {
              observer.next(true);
              observer.complete();
            },
            error: (error) => observer.error(error)
          });
        },
        error: (error) => observer.error(error)
      });
    });
  }
}
