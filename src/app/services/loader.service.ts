import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LoaderMessage {
  show: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private messagesSubject = new BehaviorSubject<LoaderMessage | null>(null);

  constructor() { }

  /**
   * Get messages observable
   */
  get messages(): Observable<LoaderMessage | null> {
    return this.messagesSubject.asObservable();
  }

  /**
   * Show the global loader
   */
  show(): void {
    this.messagesSubject.next({ show: true });
  }

  /**
   * Hide the global loader
   */
  hide(): void {
    this.messagesSubject.next({ show: false });
  }

  /**
   * Get current loading state
   */
  isLoading(): boolean {
    const current = this.messagesSubject.value;
    return current != null && current.show;
  }
}
