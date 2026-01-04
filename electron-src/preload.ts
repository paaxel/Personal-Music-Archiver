import { contextBridge, ipcRenderer } from 'electron';
import { MenuManager } from './utils/menu-manager';
import { DatabaseManager } from './db/db-manager';
import { FileOperationsManager } from './utils/file-operations-manager';
import { EventsManager } from './utils/events-manager';
import { NotificationManager } from './utils/notification-manager';
import { MusicBrainzManager } from './utils/musicbrainz-manager';
import { PluginsIpcManager } from './utils/plugins-manager/plugins-ips-manager';
import { ArchiveIpcManager } from './utils/archive-manager/archive-ipc-manager';

/**
 * Configure all callbacks for renderer process
 */
MenuManager.configureMenuCallbacks();
DatabaseManager.configureDbCallbacks();
FileOperationsManager.configureFileCallbacks();
EventsManager.configureEventsCallbacks();
NotificationManager.configureNotificationCallbacks();
MusicBrainzManager.configureMusicBrainzCallbacks();
ArchiveIpcManager.configureArchiveCallbacks();
PluginsIpcManager.configurePluginsCallbacks();

contextBridge.exposeInMainWorld('electron', {
    send: (channel: string, data: any) => {
        ipcRenderer.send(channel, data);
    },
    on: (channel: string, callback: any) => {
        ipcRenderer.on(channel, callback);
    },
});

