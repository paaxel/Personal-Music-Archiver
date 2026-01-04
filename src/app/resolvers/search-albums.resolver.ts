import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { AbstractResolver } from './base/abstract.resolver';
import { SearchAlbumsService } from '../services/search-albums.service';
import { LoaderService } from '../services/loader.service';
import { ResetableService } from './base/resetable-service.interface';

@Injectable({
  providedIn: 'root'
})
export class SearchAlbumsResolver extends AbstractResolver {

  constructor(
    private searchAlbumsService: SearchAlbumsService,
    private loaderService: LoaderService
  ) {
    super();
  }

  getResetableService(): ResetableService {
    return this.searchAlbumsService;
  }

  getLoaderService(): LoaderService {
    return this.loaderService;
  }

  override resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    this.searchAlbumsService.reset();
    return super.resolve(route, state);
  }
}
