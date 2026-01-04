import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { AbstractResolver } from './base/abstract.resolver';
import { ArchivesAlbumService } from '../services/archives-album.service';
import { LoaderService } from '../services/loader.service';
import { ResetableService } from './base/resetable-service.interface';

@Injectable({
  providedIn: 'root'
})
export class ArchivesAlbumResolver extends AbstractResolver {

  constructor(
    private archivesAlbumService: ArchivesAlbumService,
    private loaderService: LoaderService
  ) {
    super();
  }

  getResetableService(): ResetableService {
    return this.archivesAlbumService;
  }

  getLoaderService(): LoaderService {
    return this.loaderService;
  }

  override resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    this.archivesAlbumService.reset();
    return super.resolve(route, state);
  }
}
