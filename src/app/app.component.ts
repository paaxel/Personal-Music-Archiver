import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';
import { AboutComponent } from './menu/about/about.component';
import { LanguageSelectorComponent } from './menu/language-selector/language-selector.component';
import { SetLanguageService } from './util/set-language.service';
import { MenuNavigationService } from './services/menu-navigation.service';
import { MusicPlayerComponent } from './components/music-player/music-player.component';
import { NotificationSnackbarComponent } from './components/notification-snackbar/notification-snackbar.component';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { ArchiveStatusPanelComponent } from './components/archive-status-panel/archive-status-panel.component';
import { LoaderService } from './services/loader.service';
import { ArchiveStatusService } from './services/archive-status.service';
import { ConfirmDialogComponent } from './dialogs/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet,
    TranslateModule,
    AboutComponent,
    LanguageSelectorComponent,
    MusicPlayerComponent,
    NotificationSnackbarComponent,
    LoadingSpinnerComponent,
    ArchiveStatusPanelComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  @ViewChild(AboutComponent) aboutComponent!: AboutComponent;
  @ViewChild(LanguageSelectorComponent) languageComponent!: LanguageSelectorComponent;

  showCloseAppConfirmDialog = false;

  /** Tracks the last visited URL for each main section to preserve navigation state */
  private lastSearchUrl: string = '/search';
  private lastArchivesUrl: string = '/archives';

  constructor(
    private setLanguageService: SetLanguageService,
    private loaderService: LoaderService,
    private menuNavigationService: MenuNavigationService,
    private archiveStatusService: ArchiveStatusService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit() {
    // Initialize language
    this.setLanguageService.inizializeLanguage();
    
    // Initialize menu navigation service
    this.menuNavigationService.initialize();

    // Track the last visited URL for each section to restore on tab click
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = event.urlAfterRedirects || event.url;
        if (url.startsWith('/search')) {
          this.lastSearchUrl = url;
        } else if (url.startsWith('/archives')) {
          this.lastArchivesUrl = url;
        }
      });
    
    // Subscribe to dialog events
    this.menuNavigationService.showAbout$.subscribe(() => {
      this.aboutComponent.show();
    });
    
    this.menuNavigationService.showLanguage$.subscribe(() => {
      this.languageComponent.show();
    });

    this.menuNavigationService.showExitApp$.subscribe(() => {
      if(!this.showCloseAppConfirmDialog) { 
        this.showCloseAppConfirmDialog = true;
        this.cdr.detectChanges();
      }
    });
  }


  executeCloseApp() {
    this.loaderService.show();
    this.cdr.detectChanges();

    this.archiveStatusService.stopArchiveProcess().then(() => {
      this.closeApp();
    }).catch((error) => {
      console.error('Error requesting archive process stop:', error);
      this.closeApp();
    });    
  }

  private closeApp() {
    window.electronMenuAPI.onExitAppConfirmed();
    this.showCloseAppConfirmDialog = false;
    this.loaderService.hide();
    this.cdr.detectChanges();
  }

  cancelCloseApp() {
    this.showCloseAppConfirmDialog = false;
  }

  /** Navigate to last visited search page (preserves sub-page state) */
  navigateToSearch(): void {
    this.router.navigateByUrl(this.lastSearchUrl);
  }

  /** Navigate to last visited archives page (preserves sub-page state) */
  navigateToArchives(): void {
    this.router.navigateByUrl(this.lastArchivesUrl);
  }

  /** Check if current route is within the search section */
  isSearchActive(): boolean {
    return this.router.url.startsWith('/search');
  }

  /** Check if current route is within the archives section */
  isArchivesActive(): boolean {
    return this.router.url.startsWith('/archives');
  }
}
