import { ipcMain, contextBridge, ipcRenderer } from 'electron';
import axios from 'axios';
import { NotificationManager } from './notification-manager';

/**
 * Manager for MusicBrainz API calls
 * Handles API requests from the main process to avoid CORS issues
 */
export class MusicBrainzManager {
  private static readonly API_URL = 'https://musicbrainz.org/ws/2';
  private static readonly USER_AGENT = 'PersonalMusicArchive/1.0.0 (Chrome/131.0.0.0)';

  /**
   * Make a GET request to MusicBrainz API with retry logic
   */
  private static async makeRequest(endpoint: string, params: any, retries: number = 1): Promise<any> {
    try {
      console.debug(`MusicBrainz API request: ${endpoint}`, params);
      const response = await axios.get(`${this.API_URL}${endpoint}`, {
        params,
        headers: {
          'User-Agent': this.USER_AGENT
        },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error(`Error in MusicBrainz API request to ${endpoint}:`, error);
      
      // Retry logic
      if (retries > 0) {
        console.debug(`Retrying request to ${endpoint} after 1.5 second (${retries} retries left)...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return this.makeRequest(endpoint, params, retries - 1);
      }
      
      NotificationManager.error('network_error');
      throw error;
    }
  }

  /**
   * Configure IPC handlers for MusicBrainz API calls
   */
  static configureMusicBrainzIpcHandlers(): void {
    ipcMain.handle('mb-search-artist', async (_event, artistName: string, limit: number = 10) => {
      return this.makeRequest('/artist', {
        query: `artist:"${artistName}"`,
        fmt: 'json',
        limit: limit.toString()
      });
    });

    ipcMain.handle('mb-get-albums-by-artist', async (_event, artistId: string, limit: number = 100) => {
      return this.makeRequest('/release-group', {
        query: `arid:${artistId} AND primarytype:Album AND status:Official AND NOT secondarytype:Live AND NOT secondarytype:Compilation`,
        fmt: 'json',
        limit: limit.toString()
      });
    });

    ipcMain.handle('mb-get-album-details', async (_event, albumId: string) => {
      return this.makeRequest(`/release/${albumId}`, {
        fmt: 'json',
        inc: 'recordings+artist-credits'
      });
    });

    ipcMain.handle('mb-get-releases-for-release-group', async (_event, releaseGroupId: string) => {
      const data = await this.makeRequest('/release', {
        'release-group': releaseGroupId,
        fmt: 'json',
        limit: '1',
        status: 'official'
      });
      return data.releases || [];
    });
  }

  /**
   * Configure callbacks for renderer process (Preload)
   */
  static configureMusicBrainzCallbacks(): void {
    contextBridge.exposeInMainWorld('electronMusicBrainzAPI', {
      searchArtist: (artistName: string, limit?: number) => 
        ipcRenderer.invoke('mb-search-artist', artistName, limit),
      
      getAlbumsByArtist: (artistId: string, limit?: number) => 
        ipcRenderer.invoke('mb-get-albums-by-artist', artistId, limit),
      
      getAlbumDetails: (albumId: string) => 
        ipcRenderer.invoke('mb-get-album-details', albumId),
      
      getReleasesForReleaseGroup: (releaseGroupId: string) => 
        ipcRenderer.invoke('mb-get-releases-for-release-group', releaseGroupId)
    });
  }
}

