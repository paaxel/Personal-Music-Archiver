import { app } from 'electron';
import path from 'path';

export class IconPathResolver {
  private static readonly ICON_EXTENSION_MAP: Record<string, string> = {
    win32: 'icon.ico',
    darwin: 'icon.icns',
    linux: 'icon.png',
  };

  static computeIconPath(): string {
    const iconFilename = this.getIconFilename();
    const resourcesDir = app.isPackaged
          ? process.resourcesPath
          : path.join(app.getAppPath(), 'resources');

    const iconPath = path.join(resourcesDir, iconFilename);

    return iconPath;
  }

  private static getIconFilename(): string {
    return this.ICON_EXTENSION_MAP[process.platform] || this.ICON_EXTENSION_MAP.linux;
  }
}