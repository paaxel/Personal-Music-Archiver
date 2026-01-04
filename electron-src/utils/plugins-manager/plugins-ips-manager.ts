import { contextBridge, ipcMain, ipcRenderer } from 'electron';
import { PluginManager } from '../../plugins/plugin-manager';
import { NotificationManager } from '../notification-manager';



export class PluginsIpcManager {

    /**
   * Configure IPC handlers for Plugins API calls
   */
    static configurePluginsIpcHandlers(pluginManager: PluginManager): void {
        // Plugin management handlers
        ipcMain.handle('plugin-get', async () => {
            console.debug('IPC: plugin-get');
            return pluginManager.getPluginMetadata();
        });

        ipcMain.handle('plugin-activate', async () => {
            console.debug('IPC: plugin-activate');
            try {
                const result = await pluginManager.activatePlugin();

                if (result.success) {
                    NotificationManager.info('plugin_activated');
                } else {
                    NotificationManager.error('plugin_activation_failed', [result.message || 'Unknown error']);
                }

                return result.success;
            } catch (error: any) {
                console.error('Plugin activation error:', error);
                NotificationManager.error('plugin_activation_failed', [error.message]);
                return false;
            }
        });

        ipcMain.handle('plugin-check-dependencies', async () => {
            console.debug('IPC: plugin-check-dependencies');
            return pluginManager.checkPluginDependencies();
        });

        ipcMain.handle('plugin-get-directory', async () => {
            console.debug('IPC: plugin-get-directory');
            return pluginManager.getPluginsDirectory();
        });

        ipcMain.handle('plugin-upload', async (event, fileName: string, fileContent: string) => {
            console.debug('IPC: plugin-upload', fileName);
            try {
                await pluginManager.installPlugin(fileName, fileContent);
                NotificationManager.success('plugin_installed');
                return { success: true };
            } catch (error: any) {
                console.error('Plugin upload error:', error);
                NotificationManager.error('plugin_install_failed', [error.message]);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('plugin-delete', async () => {
            console.debug('IPC: plugin-delete');
            try {
                await pluginManager.deletePlugin();
                NotificationManager.success('plugin_deleted');
                return { success: true };
            } catch (error: any) {
                console.error('Plugin delete error:', error);
                NotificationManager.error('plugin_delete_failed', [error.message]);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('plugin-deactivate', async () => {
            console.debug('IPC: plugin-deactivate');
            try {
                pluginManager.deactivatePlugin();
                NotificationManager.info('plugin_deactivated');
                return { success: true };
            } catch (error: any) {
                console.error('Plugin deactivation error:', error);
                NotificationManager.error('plugin_deactivation_failed', [error.message]);
                return { success: false, error: error.message };
            }
        });

        console.debug('Plugin IPC handlers configured');

    }



    static configurePluginsCallbacks(): void {
        // Plugin API
        contextBridge.exposeInMainWorld('electronPluginAPI', {
            getPlugin: () => ipcRenderer.invoke('plugin-get'),
            activatePlugin: () => ipcRenderer.invoke('plugin-activate'),
            checkDependencies: () => ipcRenderer.invoke('plugin-check-dependencies'),
            getPluginsDirectory: () => ipcRenderer.invoke('plugin-get-directory'),
            uploadPlugin: (fileName: string, fileContent: string) => ipcRenderer.invoke('plugin-upload', fileName, fileContent),
            deletePlugin: () => ipcRenderer.invoke('plugin-delete'),
            deactivatePlugin: () => ipcRenderer.invoke('plugin-deactivate')
        });
    }

}