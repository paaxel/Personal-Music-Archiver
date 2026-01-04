import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

/**
 * Service to handle navigation triggered by Electron menu events
 */
@Injectable({
  providedIn: 'root'
})
export class MenuNavigationService {
  
  // Observables for component-level actions (dialogs)
  private showAboutSubject = new Subject<void>();
  private showLanguageSubject = new Subject<void>();
  private showExitAppSubject = new Subject<void>();
  
  public showAbout$ = this.showAboutSubject.asObservable();
  public showLanguage$ = this.showLanguageSubject.asObservable();
  public showExitApp$ = this.showExitAppSubject.asObservable();
  
  constructor(private router: Router) {}

  /**
   * Initialize menu navigation listeners
   * Called once during app initialization
   */
  initialize(): void {
    if (typeof window === 'undefined' || !window.electronMenuAPI) {
      return;
    }

    // Register navigation event listeners
    window.electronMenuAPI.onNavigateToPlugins(() => {
      this.navigateToPlugins();
    });

    window.electronMenuAPI.onShowAbout(() => {
      this.triggerShowAbout();
    });

    window.electronMenuAPI.onShowLanguage(() => {
      this.triggerShowLanguage();
    });

    window.electronMenuAPI.onExitAppRequest(() => {
      this.triggerExitAppConfirm();
    });
  }

  /**
   * Navigate to plugins page
   */
  private navigateToPlugins(): void {
    this.router.navigate(['/plugins']);
  }

  /**
   * Trigger about dialog
   */
  private triggerShowAbout(): void {
    this.showAboutSubject.next();
  }

  /**
   * Trigger language selector dialog
   */
  private triggerShowLanguage(): void {
    this.showLanguageSubject.next();
  }


  triggerExitAppConfirm() {
    this.showExitAppSubject.next();
  }
  /**
   * Programmatic navigation methods (for use in components)
   */
  public navigateToSearch(): void {
    this.router.navigate(['/search']);
  }

  public navigateToArchives(): void {
    this.router.navigate(['/archives']);
  }

  public navigateToPluginsPage(): void {
    this.router.navigate(['/plugins']);
  }
}
