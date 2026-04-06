import { Injectable } from '@angular/core';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Params, Router } from '@angular/router';
import { MusicbrainzService } from './musicbrainz.service';
import { DatabaseService } from './database.service';
import { MusicBrainzAlbumDetails, MusicBrainzArtist, MusicBrainzRelease } from './models/musicbranz.model';
import { Album } from './models/database.model';
import { ResetableService } from '../resolvers/base/resetable-service.interface';

@Injectable({
  providedIn: 'root'
})
export class SearchAlbumService implements ResetableService {
  
  dataAreLoaded: boolean = false;
  
  album: MusicBrainzAlbumDetails | null = null;
  artist: MusicBrainzArtist | null = null;
  releaseGroupId: string = '';
  existingAlbum: Album | null = null;

  /** All available releases (editions) for the current release group */
  availableReleases: MusicBrainzRelease[] = [];
  /** Index of the currently selected release */
  selectedReleaseIndex: number = 0;
  
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
    this.album = null;
    this.artist = null;
    this.releaseGroupId = '';
    this.existingAlbum = null;
    this.availableReleases = [];
    this.selectedReleaseIndex = 0;
  }

  areDataLoaded(): boolean {
    return this.dataAreLoaded;
  }

  onResolveFailure(error: any): void {
    console.error('Error loading album details:', error);
    this.router.navigate(['/search']);
  }

  loadInitialInformation(routeParams?: Params): Observable<boolean> {
    if (!routeParams || !routeParams['releaseGroupId']) {
      this.router.navigate(['/search']);
      return of(false);
    }

    this.resetData();
    this.releaseGroupId = routeParams['releaseGroupId'];
    
    return this.loadAlbumDetailsData();
  }

  private loadAlbumDetailsData(): Observable<boolean> {
    return new Observable((observer) => {
      this.loadAlbumCall().subscribe({
        next: () => {
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

  private loadAlbumCall(): Observable<boolean> {
    return this.musicBrainzService.getReleasesForReleaseGroup(this.releaseGroupId).pipe(
      switchMap((releases) => {
        if (!releases || releases.length === 0) {
          throw new Error('No releases found for this album');
        }
        this.availableReleases = releases;
        return this.loadSelectedRelease();
      }),
      catchError((err) => {
        return throwError(() => err);
      })
    );
  }

  /**
   * Load the currently selected release's details and check its archive status.
   */
  private loadSelectedRelease(): Observable<boolean> {
    const selectedRelease = this.availableReleases[this.selectedReleaseIndex];
    return this.musicBrainzService.getAlbumDetails(selectedRelease.id).pipe(
      switchMap((albumDetails) => {
        this.album = { 
          ...albumDetails, 
          releaseGroupId: this.releaseGroupId,
          disambiguation: selectedRelease.disambiguation || albumDetails.disambiguation || ''
        };
        
        // Extract artist info from album credits
        if (this.album && this.album['artist-credit'] && this.album['artist-credit'].length > 0) {
          const artistCredit = this.album['artist-credit'][0];
          this.artist = {
            id: artistCredit.artist.id,
            name: artistCredit.name,
            'sort-name': artistCredit.artist['sort-name'] || artistCredit.name,
            type: artistCredit.artist.type || '',
            disambiguation: artistCredit.artist.disambiguation || ''
          };
        }
        
        // Check if this specific release is already archived (by release ID)
        return this.dbService.checkAlbumExists(selectedRelease.id);
      }),
      map((existingAlbum) => {
        this.existingAlbum = existingAlbum;
        return true;
      })
    );
  }

  /** Switch to a different release edition and reload its details */
  selectRelease(index: number): Observable<boolean> {
    if (index < 0 || index >= this.availableReleases.length) {
      return of(false);
    }
    this.selectedReleaseIndex = index;
    return this.loadSelectedRelease();
  }

  /** Check if there are multiple editions available */
  hasMultipleEditions(): boolean {
    return this.availableReleases.length > 1;
  }

  reloadAlbum(): Observable<boolean> {
    return this.loadAlbumCall();
  }
}
