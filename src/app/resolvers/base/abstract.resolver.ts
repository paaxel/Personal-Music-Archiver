import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { ResetableService } from './resetable-service.interface';
import { LoaderService } from '../../services/loader.service';

@Injectable()
export abstract class AbstractResolver {
  
  abstract getResetableService(): ResetableService;
  abstract getLoaderService(): LoaderService;

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    if (!this.getResetableService().areDataLoaded()) {
      this.getLoaderService().show();
      
      return new Observable((observer) => {
        const observable: Observable<any> = this.getResetableService().loadInitialInformation(route.params);

        if (observable == null) {
          observer.next(true);
          observer.complete();
          this.getLoaderService().hide();
          return;
        }

        observable.subscribe({
          next: (successful: any) => {
            observer.next(!!successful);
          },
          complete: () => {
            observer.complete();
            this.getLoaderService().hide();
          },
          error: (error: any) => {
            this.getResetableService().onResolveFailure(error);
            this.getLoaderService().hide();
            observer.error(error);
            throw error;
          }
        });
      });
    }
    return of(true);
  }
}
