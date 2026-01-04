import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { AbstractResolver } from './base/abstract.resolver';
import { SearchAlbumService } from '../services/search-album.service';
import { LoaderService } from '../services/loader.service';
import { ResetableService } from './base/resetable-service.interface';

@Injectable({
  providedIn: 'root'
})
export class SearchAlbumResolver extends AbstractResolver {

  constructor(
    private searchAlbumService: SearchAlbumService,
    private loaderService: LoaderService
  ) {
    super();
  }

  getResetableService(): ResetableService {
    return this.searchAlbumService;
  }

  getLoaderService(): LoaderService {
    return this.loaderService;
  }

  override resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    this.searchAlbumService.reset();
    return super.resolve(route, state);
  }
}
