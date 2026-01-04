import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { IDownloadPlugin, PluginMetadata } from './plugin-interface';
import { EventsManager } from '../utils/events-manager';

/**
 * Manages loading and lifecycle of a single download plugin
 */
export class PluginManager {
  private plugin: IDownloadPlugin | null = null;
  private isActive: boolean = false;
  private pluginsDirectory: string;
  private pluginFilePath: string | null = null;
  private configFilePath: string;

  constructor() {
    // Plugins directory in user data
    this.pluginsDirectory = path.join(app.getPath('userData'), 'plugins');
    this.configFilePath = path.join(this.pluginsDirectory, 'plugin-config.json');
    this.ensurePluginsDirectory();
  }

  /**
   * Ensure plugins directory exists
   */
  private ensurePluginsDirectory(): void {
    if (!fs.existsSync(this.pluginsDirectory)) {
      fs.mkdirSync(this.pluginsDirectory, { recursive: true });
      console.debug('Created plugins directory:', this.pluginsDirectory);
    }
  }

  /**
   * Load activation state from config file
   */
  private loadActivationState(): boolean {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const config = JSON.parse(fs.readFileSync(this.configFilePath, 'utf-8'));
        return config.isActive === true;
      }
    } catch (error) {
      console.error('Error loading plugin activation state:', error);
    }
    return false;
  }

  /**
   * Save activation state to config file
   */
  private saveActivationState(isActive: boolean): void {
    try {
      const config = { isActive };
      fs.writeFileSync(this.configFilePath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving plugin activation state:', error);
    }
  }

  /**
   * Load a plugin from a file
   */
  async loadPlugin(pluginPath: string): Promise<void> {
    try {
      console.debug('Loading plugin from:', pluginPath);
      
      // Clear any existing plugin first
      if (this.plugin?.dispose) {
        await this.plugin.dispose();
      }
      
      // Clear require cache to allow reloading
      delete require.cache[require.resolve(pluginPath)];
      
      // Load the plugin module
      const pluginModule = require(pluginPath);
      
      // Get the plugin class (should export a class that implements IDownloadPlugin)
      const PluginClass = pluginModule.default || pluginModule;
      
      if (!PluginClass) {
        throw new Error('Plugin does not export a default class');
      }

      // Instantiate the plugin
      const plugin: IDownloadPlugin = new PluginClass();
      
      // Get metadata
      const metadata = plugin.getMetadata();
      
      // Initialize the plugin
      await plugin.initialize();
      
      // Store the plugin
      this.plugin = plugin;
      this.pluginFilePath = pluginPath;
      
      console.debug('Plugin loaded successfully:', metadata.name, 'v' + metadata.version);
      
    } catch (error) {
      console.error('Error loading plugin:', error);
      throw error;
    }
  }

  /**
   * Load the plugin from the plugins directory (expects only one .js file)
   */
  async loadPluginFromDirectory(): Promise<void> {
    try {
      const files = fs.readdirSync(this.pluginsDirectory);
      const jsFiles = files.filter(file => file.endsWith('.js'));
      
      if (jsFiles.length === 0) {
        console.debug('No plugin found in directory');
        this.plugin = null;
        this.isActive = false;
        return;
      }
      
      if (jsFiles.length > 1) {
        console.warn('Multiple plugin files found, loading first one:', jsFiles[0]);
      }
      
      const pluginPath = path.join(this.pluginsDirectory, jsFiles[0]);
      await this.loadPlugin(pluginPath);
      
      // Restore activation state after loading plugin
      this.isActive = this.loadActivationState();
      console.debug(`Plugin loaded with activation state: ${this.isActive}`);
      
    } catch (error) {
      console.error('Error loading plugin from directory:', error);
    }
  }

  /**
   * Get plugins directory path
   */
  getPluginsDirectory(): string {
    return this.pluginsDirectory;
  }

  /**
   * Get the current plugin metadata
   */
  getPluginMetadata(): PluginMetadata | null {
    if (!this.plugin) {
      return null;
    }
    return {
      ...this.plugin.getMetadata(),
      isActive: this.isActive
    };
  }

  /**
   * Get the active plugin (only if activated)
   */
  getActivePlugin(): IDownloadPlugin | null {
    if (!this.isActive || !this.plugin) {
      return null;
    }
    return this.plugin;
  }

  /** Get the current plugin instance */
  getCurrentPlugin(): IDownloadPlugin | null {
    return this.plugin;
  }

  /**
   * Activate the current plugin
   */
  async activatePlugin(): Promise<{ success: boolean; message?: string }> {
    if (!this.plugin) {
      return {
        success: false,
        message: 'No plugin loaded'
      };
    }

    try {
      // Check dependencies first
      const depCheck = await this.checkPluginDependencies();
      
      if (!depCheck.installed) {
        return {
          success: false,
          message: depCheck.message || 'Dependencies not met'
        };
      }

      this.isActive = true;
      this.saveActivationState(true);
      console.debug('Plugin activated successfully');
      
      return { success: true };
    } catch (error) {
      console.error('Error activating plugin:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Deactivate the current plugin
   */
  deactivatePlugin(): void {
    this.isActive = false;
    this.saveActivationState(false);
    console.debug('Plugin deactivated');
  }

  /**
   * Check plugin dependencies and emit events
   */
  async checkPluginDependencies(): Promise<{ installed: boolean; missing: string[]; message?: string }> {
    if (!this.plugin) {
      return {
        installed: false,
        missing: [],
        message: 'No plugin loaded'
      };
    }
    
    try {
      const result = await this.plugin.checkDependencies();
      
      // Emit dependency status change event
      if (this.plugin) {
        const metadata = this.plugin.getMetadata();
        EventsManager.notifyPluginDependencyStatus(metadata.id, result);
      }
      
      return result;
    } catch (error) {
      console.error('Error checking dependencies:', error);
      return {
        installed: false,
        missing: [],
        message: 'Error checking dependencies'
      };
    }
  }

  /**
   * Reload the plugin from directory
   */
  async reloadPlugin(): Promise<void> {
    try {
      // Deactivate
      this.deactivatePlugin();
      
      // Reload from directory
      await this.loadPluginFromDirectory();
      
      console.debug('Plugin reloaded');
    } catch (error) {
      console.error('Error reloading plugin:', error);
      throw error;
    }
  }

  /**
   * Install a new plugin (replaces existing one)
   */
  async installPlugin(fileName: string, fileContent: string): Promise<void> {
    try {
      // Validate file extension
      if (!fileName.endsWith('.js')) {
        throw new Error('Plugin file must be .js (compiled JavaScript)');
      }

      // Sanitize filename
      const sanitizedName = path.basename(fileName);
      const pluginPath = path.join(this.pluginsDirectory, sanitizedName);

      // Deactivate and dispose current plugin if exists
      if (this.plugin) {
        this.deactivatePlugin();
        if (this.plugin.dispose) {
          await this.plugin.dispose();
        }
        
        // Delete old plugin file if it exists
        if (this.pluginFilePath && fs.existsSync(this.pluginFilePath)) {
          fs.unlinkSync(this.pluginFilePath);
          console.debug('Deleted old plugin file:', this.pluginFilePath);
        }
      }

      // Write new plugin file
      fs.writeFileSync(pluginPath, fileContent, 'utf-8');
      console.debug('Plugin file written:', pluginPath);

      // Load the new plugin
      await this.loadPlugin(pluginPath);
      console.debug('Plugin installed successfully:', sanitizedName);
      
    } catch (error) {
      console.error('Error installing plugin:', error);
      throw error;
    }
  }

  /**
   * Delete the current plugin
   */
  async deletePlugin(): Promise<void> {
    if (!this.plugin || !this.pluginFilePath) {
      throw new Error('No plugin to delete');
    }

    // Deactivate and dispose
    this.deactivatePlugin();
    if (this.plugin.dispose) {
      await this.plugin.dispose();
    }

    // Delete file
    if (fs.existsSync(this.pluginFilePath)) {
      fs.unlinkSync(this.pluginFilePath);
      console.debug('Plugin file deleted:', this.pluginFilePath);
    }

    // Delete config file
    if (fs.existsSync(this.configFilePath)) {
      fs.unlinkSync(this.configFilePath);
      console.debug('Plugin config deleted');
    }

    this.plugin = null;
    this.pluginFilePath = null;
    console.debug('Plugin deleted successfully');
  }

  /**
   * Check if a plugin is loaded
   */
  hasPlugin(): boolean {
    return this.plugin !== null;
  }

  /**
   * Dispose the plugin
   */
  async dispose(): Promise<void> {
    if (this.plugin?.dispose) {
      await this.plugin.dispose();
    }
    this.plugin = null;
    this.isActive = false;
  }
}
