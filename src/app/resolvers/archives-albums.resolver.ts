import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { AbstractResolver } from './base/abstract.resolver';
import { ArchivesAlbumsService } from '../services/archives-albums.service';
import { LoaderService } from '../services/loader.service';
import { ResetableService } from './base/resetable-service.interface';

@Injectable({
  providedIn: 'root'
})
export class ArchivesAlbumsResolver extends AbstractResolver {

  constructor(
    private archivesAlbumsService: ArchivesAlbumsService,
    private loaderService: LoaderService
  ) {
    super();
  }

  getResetableService(): ResetableService {
    return this.archivesAlbumsService;
  }

  getLoaderService(): LoaderService {
    return this.loaderService;
  }

  override resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    this.archivesAlbumsService.reset();
    return super.resolve(route, state);
  }
}
