import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { AbstractResolver } from './base/abstract.resolver';
import { PluginsService } from '../services/plugins.service';
import { LoaderService } from '../services/loader.service';
import { ResetableService } from './base/resetable-service.interface';

@Injectable({
  providedIn: 'root'
})
export class PluginsResolver extends AbstractResolver {

  constructor(
    private pluginsService: PluginsService,
    private loaderService: LoaderService
  ) {
    super();
  }

  getResetableService(): ResetableService {
    return this.pluginsService;
  }

  getLoaderService(): LoaderService {
    return this.loaderService;
  }

  override resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    // Don't reset plugins data - we want to keep it cached
    // this.pluginsService.reset();
    
    // Only load if not already loaded
    if (!this.pluginsService.areDataLoaded()) {
      return super.resolve(route, state);
    }
    
    // Data already loaded, return immediately
    return super.resolve(route, state);
  }
}
