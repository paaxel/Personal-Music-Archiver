import { Observable } from 'rxjs';
import { Params } from '@angular/router';

export interface ResetableService {
  reset(): void;
  areDataLoaded(): boolean;
  loadInitialInformation(routeParams?: Params): Observable<any>;
  onResolveFailure(error: any): void;
}
