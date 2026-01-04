import { Injectable } from '@angular/core';
import { Observable, from, of, Subject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ResetableService } from '../resolvers/base/resetable-service.interface';

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  isActive?: boolean;
}

export interface DependencyCheck {
  installed: boolean;
  missing: string[];
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PluginsService implements ResetableService {
  
  dataAreLoaded: boolean = false;
  
  plugin: PluginMetadata | null = null;
  pluginsDirectory: string = '';
  dependencyStatus: DependencyCheck | null = null;

  // Subject for dependency status changes
  private dependencyStatusSubject = new Subject<DependencyCheck>();
  public dependencyStatus$ = this.dependencyStatusSubject.asObservable();

  constructor(private router: Router) {
    this.setupDependencyStatusListener();
  }

  /**
   * Setup listener for dependency status changes from Electron
   */
  private setupDependencyStatusListener(): void {
    if (window.electronEventsAPI?.onPluginDependencyStatus) {
      window.electronEventsAPI.onPluginDependencyStatus((data: { pluginId: string; status: DependencyCheck }) => {
        console.debug('Received plugin dependency status update:', data);
        
        // Update local status
        this.dependencyStatus = data.status;
        
        // If dependencies are not installed, mark plugin as inactive
        if (!data.status.installed && this.plugin) {
          console.debug('Dependencies not installed, marking plugin as inactive');
          this.plugin.isActive = false;
        }
        
        // Emit to subscribers
        this.dependencyStatusSubject.next(data.status);
      });
    }
  }

  reset(): void {
    this.dataAreLoaded = false;
    this.resetData();
  }

  private resetData(): void {
    this.plugin = null;
    this.pluginsDirectory = '';
    this.dependencyStatus = null;
  }

  areDataLoaded(): boolean {
    return this.dataAreLoaded;
  }

  onResolveFailure(error: any): void {
    console.error('Error loading plugins:', error);
    // Don't navigate away on error - stay on plugins page
  }

  loadInitialInformation(): Observable<boolean> {
    this.resetData();
    return this.loadPluginsData();
  }

  private loadPluginsData(): Observable<boolean> {
    return from(this.loadBasicPluginInfo()).pipe(
      map(() => {
        this.dataAreLoaded = true;
        return true;
      }),
      catchError((error) => {
        console.error('Error loading plugin data:', error);
        this.dataAreLoaded = false;
        return of(false);
      })
    );
  }

  private async loadBasicPluginInfo(): Promise<void> {
    const [plugin, directory] = await Promise.all([
      window.electronPluginAPI.getPlugin(),
      window.electronPluginAPI.getPluginsDirectory()
    ]);
    
    this.plugin = plugin;
    this.pluginsDirectory = directory;
    
    // Load dependencies in background if plugin exists
    if (plugin) {
      this.loadDependenciesInBackground();
    }
  }

  private async loadDependenciesInBackground(): Promise<void> {
    try {
      if (!this.plugin) return;
      
      const depCheck = await window.electronPluginAPI.checkDependencies();
      this.dependencyStatus = {
        ...depCheck,
        missing: depCheck.missing || []
      };
    } catch (error) {
      console.error('Error loading dependencies:', error);
    }
  }

  /**
   * Activate the plugin with dependency validation
   */
  async activatePlugin(): Promise<{ success: boolean; message?: string }> {
    try {
      const success = await window.electronPluginAPI.activatePlugin();
      
      if (success && this.plugin) {
        this.plugin.isActive = true;
        return { success: true };
      } else {
        return { success: false, message: 'Plugin activation failed - check dependencies' };
      }
    } catch (error) {
      console.error('Error activating plugin:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  getDependencyStatus(): DependencyCheck | null {
    return this.dependencyStatus;
  }

  isActive(): boolean {
    return this.plugin?.isActive === true;
  }

  hasPlugin(): boolean {
    return this.plugin !== null;
  }

  async uploadPlugin(fileName: string, fileContent: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await window.electronPluginAPI.uploadPlugin(fileName, fileContent);
      
      if (result.success) {
        this.dataAreLoaded = false;
        await this.loadBasicPluginInfo();
        this.dataAreLoaded = true;
      }
      
      return result;
    } catch (error) {
      console.error('Error uploading plugin:', error);
      return { success: false, error: 'Failed to upload plugin' };
    }
  }

  async deletePlugin(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await window.electronPluginAPI.deletePlugin();
      
      if (result.success) {
        this.dataAreLoaded = false;
        await this.loadBasicPluginInfo();
        this.dataAreLoaded = true;
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting plugin:', error);
      return { success: false, error: 'Failed to delete plugin' };
    }
  }

  async deactivatePlugin(): Promise<void> {
    try {
      await window.electronPluginAPI.deactivatePlugin();
      if (this.plugin) {
        this.plugin.isActive = false;
      }
      this.dependencyStatus = null;
      this.dependencyStatusSubject.next({ installed: false, missing: [] });
    } catch (error) {
      console.error('Error deactivating plugin:', error);
      throw error;
    }
  }
}
