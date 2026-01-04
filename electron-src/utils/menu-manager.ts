import { app, Menu, BrowserWindow, MenuItemConstructorOptions, ipcMain } from 'electron';
import { contextBridge, ipcRenderer } from 'electron';

export class MenuManager {
  static setMainMenu(mainWindow: BrowserWindow): void {
    const template: MenuItemConstructorOptions[] = [
      this.createFileMenu(mainWindow),
      this.createHelpMenu(mainWindow),
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private static createFileMenu(mainWindow: BrowserWindow): MenuItemConstructorOptions {
    return {
      label: 'File',
      submenu: [
        {
          label: 'Toggle DevTools',
          accelerator: 'Alt+F12',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => {
            this.sendMessageToWindow(mainWindow, 'exit-app-request');
          },
        },
      ],
    };
  }

  private static createHelpMenu(mainWindow: BrowserWindow): MenuItemConstructorOptions {
    return {
      label: 'Help',
      submenu: [
        {
          label: 'Archive Plugins',
          click: () => {
            this.sendMessageToWindow(mainWindow, 'navigate-to-plugins');
          },
        },
        {
          label: 'Language',
          click: () => {
            this.sendMessageToWindow(mainWindow, 'show-language');
          },
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            this.sendMessageToWindow(mainWindow, 'show-about');
          },
        },
      ],
    };
  }

  private static sendMessageToWindow(mainWindow: BrowserWindow, channel: string): void {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(channel);
    }
  }

  static configureMenuIpcHandlers(): void {
    // Handle exit app confirmed from renderer
    ipcMain.handle('exit-app-confirmed', () => {
      app.quit();
    });
  }


  static configureMenuCallbacks(): void {
    // Store callbacks to avoid multiple registrations
    let navigateToPluginsCallback: any = null;
    let aboutCallback: any = null;
    let languageCallback: any = null;
    let exitAppCallback: any = null;

    // Register listeners only once
    ipcRenderer.on('navigate-to-plugins', () => {
      if (navigateToPluginsCallback) {
        navigateToPluginsCallback();
      }
    });

    ipcRenderer.on('show-about', () => {
      if (aboutCallback) {
        aboutCallback();
      }
    });

    ipcRenderer.on('show-language', () => {
      if (languageCallback) {
        languageCallback();
      }
    });

    ipcRenderer.on('exit-app-request', () => {
      if (exitAppCallback) {
        exitAppCallback();
      }
    });


    contextBridge.exposeInMainWorld('electronMenuAPI', {
      // Navigation event listeners
      onNavigateToPlugins: (callback: any) => {
        navigateToPluginsCallback = callback;
      },

      onExitAppRequest: (callback: any) => {
        exitAppCallback = callback;
      },

      onExitAppConfirmed: () => {
        ipcRenderer.invoke('exit-app-confirmed');
      },
      
      // Dialog event listeners
      onShowAbout: (callback: any) => {
        aboutCallback = callback;
      },
      
      onShowLanguage: (callback: any) => {
        languageCallback = callback;
      }
    })
  }
}