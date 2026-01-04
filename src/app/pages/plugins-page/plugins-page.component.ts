import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { LoaderService } from '../../services/loader.service';
import { PluginsService, PluginMetadata, DependencyCheck } from '../../services/plugins.service';
import { ConfirmDialogComponent } from '../../dialogs/confirm-dialog/confirm-dialog.component';
import { PluginCardComponent } from './plugin-card/plugin-card.component';

@Component({
  selector: 'app-plugins-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, ConfirmDialogComponent, PluginCardComponent],
  templateUrl: './plugins-page.component.html',
  styleUrls: ['./plugins-page.component.scss']
})
export class PluginsPageComponent implements OnInit, OnDestroy {

  private dependencyStatusSubscription?: Subscription;
  
  // Confirmation dialog state
  showDeleteConfirmDialog: boolean = false;
  showDeactivateConfirmDialog: boolean = false;
  showActivateConfirmDialog: boolean = false;
  showUploadBlockedDialog: boolean = false;

  
  constructor(
    private cdr: ChangeDetectorRef,
    private loaderService: LoaderService,
    public pluginsService: PluginsService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.dependencyStatusSubscription = this.pluginsService.dependencyStatus$.subscribe({
      next: (update) => {
        console.debug('Dependency status updated');
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error in dependency status subscription:', error);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.dependencyStatusSubscription) {
      this.dependencyStatusSubscription.unsubscribe();
    }
  }

  get plugin(): PluginMetadata | null {
    return this.pluginsService.plugin;
  }

  get pluginsDirectory(): string {
    return this.pluginsService.pluginsDirectory;
  }

  get hasPlugin(): boolean {
    return this.pluginsService.hasPlugin();
  }

  get canUpload(): boolean {
    return !this.hasPlugin;
  }

  onActivatePluginClick(): void {
    this.showActivateConfirmDialog = true;
  }

  async confirmActivatePlugin(): Promise<void> {
    this.loaderService.show();
    
    try {
      const result = await this.pluginsService.activatePlugin();
      this.showActivateConfirmDialog = false;
      
      if (result.success) {
        console.debug('Plugin activated successfully');
      } else {
        console.error('Plugin activation failed:', result.message);
      }

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error activating plugin:', error);
    } finally {
      this.showActivateConfirmDialog = false;
      this.loaderService.hide();
    }
  }

  closeActivatePluginDialog(): void {
    this.showActivateConfirmDialog = false;
  }

  getDependencyStatus(): DependencyCheck | null {
    return this.pluginsService.getDependencyStatus();
  }

  isActive(): boolean {
    return this.pluginsService.isActive();
  }

  async uploadPlugin(): Promise<void> {
    if (!this.canUpload) {
      this.showUploadBlockedDialog = true;
      return;
    }

    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.js';
      
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        this.loaderService.show();
        
        try {
          const reader = new FileReader();
          reader.onload = async (event: any) => {
            const fileContent = event.target.result;
            
            const result = await this.pluginsService.uploadPlugin(file.name, fileContent);
            
            this.loaderService.hide();
            
            if (result.success) {
              this.cdr.detectChanges();
            }
          };
          
          reader.onerror = () => {
            this.loaderService.hide();
          };
          
          reader.readAsText(file);
        } catch (error) {
          console.error('Error uploading plugin:', error);
          this.loaderService.hide();
        }
      };
      
      input.click();
    } catch (error) {
      console.error('Error opening file dialog:', error);
    }
  }

  onDeletePluginClick(): void {
    this.showDeleteConfirmDialog = true;
  }

  async confirmDeletePlugin(): Promise<void> {
    this.loaderService.show();
    
    try {
      await this.pluginsService.deactivatePlugin();
      const result = await this.pluginsService.deletePlugin();
      
      this.showDeleteConfirmDialog = false;
      
      if (result.success) {
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Error deleting plugin:', error);
      this.showDeleteConfirmDialog = false;
    } finally {
      this.loaderService.hide();
    }
  }

  cancelDeletePlugin(): void {
    this.showDeleteConfirmDialog = false;
  }

  onDeactivatePluginClick(): void {
    this.showDeactivateConfirmDialog = true;
  }

  async confirmDeactivatePlugin(): Promise<void> {
    this.loaderService.show();
    
    try {
      await this.pluginsService.deactivatePlugin();
      this.showDeactivateConfirmDialog = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error deactivating plugin:', error);
      this.showDeactivateConfirmDialog = false;
    } finally {
      this.loaderService.hide();
    }
  }

  cancelDeactivatePlugin(): void {
    this.showDeactivateConfirmDialog = false;
  }

  closeUploadBlockedDialog(): void {
    this.showUploadBlockedDialog = false;
  }
}
