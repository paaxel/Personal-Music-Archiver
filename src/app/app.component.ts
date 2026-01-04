import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
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
    RouterLink, 
    RouterLinkActive,
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

  constructor(
    private setLanguageService: SetLanguageService,
    private loaderService: LoaderService,
    private menuNavigationService: MenuNavigationService,
    private archiveStatusService: ArchiveStatusService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    // Initialize language
    this.setLanguageService.inizializeLanguage();
    
    // Initialize menu navigation service
    this.menuNavigationService.initialize();
    
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

}
