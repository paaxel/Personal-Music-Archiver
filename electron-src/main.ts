// main.js
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { IconPathResolver } from './utils/icon-path-resolver';
import { MenuManager } from './utils/menu-manager';
import { DatabaseManager } from './db/db-manager';
import { FileUtils } from './utils/file-manager/file-utils';
import { FileOperationsManager } from './utils/file-operations-manager';
import { EventsManager } from './utils/events-manager';
import { NotificationManager } from './utils/notification-manager';
import { MusicBrainzManager } from './utils/musicbrainz-manager';
import { ArchiveManager } from './utils/archive-manager/archive-manager';
import { ArchiveIpcManager } from './utils/archive-manager/archive-ipc-manager';
import { PluginManager } from './plugins/plugin-manager';
import { PluginsIpcManager } from './utils/plugins-manager/plugins-ips-manager';



const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    // Another instance is already running
    app.quit();
} else {

    // Error Handling
    process.on('uncaughtException', (error) => {
        console.error("Unexpected error: ", error);
    });

    let mainWindow;


    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance — focus the existing window
        if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        }
    });

    
    function createWindow() {
        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            icon: IconPathResolver.computeIconPath(),
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js'),
                sandbox: false,
                webSecurity: true,
                allowRunningInsecureContent: false
            }
        });

        if (!app.isPackaged) {
            mainWindow.loadURL('http://localhost:4200');
            mainWindow.webContents.openDevTools();
        } else {
            const indexPath = path.join(__dirname, '..', 'browser', 'index.html');
            mainWindow.loadFile(indexPath);
        }

        MenuManager.setMainMenu(mainWindow);

        // Initialize events manager with main window
        EventsManager.initialize(mainWindow);

        // Initialize notification manager with main window
        NotificationManager.initialize(mainWindow);
    }

    // App Lifecycle
    app.whenReady().then(async () => {
        createWindow();

        // Create FileUtils first
        const fileUtils = new FileUtils();

        // Initialize database with FileUtils
        let dbManager = new DatabaseManager(fileUtils);
        dbManager.initializeDatabase();
        dbManager.configureDbIpcHandlers();

        // Configure menu IPC handlers
        MenuManager.configureMenuIpcHandlers();

        // Initialize plugin manager
        const pluginManager = new PluginManager();

        // Load plugin from plugins directory
        await pluginManager.loadPluginFromDirectory();

        // Initialize archive manager with plugin manager
        const archiveManager = new ArchiveManager(dbManager, fileUtils, pluginManager);
        ArchiveIpcManager.configureHandlers(archiveManager);

        PluginsIpcManager.configurePluginsIpcHandlers(pluginManager);

        // Configure file operations handlers
        FileOperationsManager.configureFileIpcHandlers();

        // Configure MusicBrainz handlers
        MusicBrainzManager.configureMusicBrainzIpcHandlers();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    })


    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });


}
