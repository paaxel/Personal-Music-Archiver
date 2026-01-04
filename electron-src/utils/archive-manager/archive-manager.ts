import { DatabaseManager } from '../../db/db-manager';
import { FileUtils } from '../file-manager/file-utils';
import { EventsManager } from '../events-manager';
import { NotificationManager } from '../notification-manager';
import { PluginManager } from '../../plugins/plugin-manager';
import { Song } from '../../db/db-models';
import * as mm from 'music-metadata';
import * as NodeID3 from 'node-id3';
import {
  ArchiveQueueStatus,
  ArchiveProcessStatus,
  AlbumArchiveStarted,
  AlbumArchiveProgress,
  AlbumArchiveComplete,
  DeleteAlbumResult,
  AlbumStatusUpdate
} from './archive-types';

/**
 * Main archive manager class
 * Handles background archive processing and queue management using plugins
 */
export class ArchiveManager {
  private db: DatabaseManager;
  private fileUtils: FileUtils;
  private pluginManager: PluginManager;
  private isProcessing: boolean = false;
  private currentArchive: Song | null = null;
  private isArchiveProcessActive: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private shouldStop: boolean = false;

  constructor(db: DatabaseManager, fileUtils: FileUtils, pluginManager: PluginManager) {
    this.db = db;
    this.fileUtils = fileUtils;
    this.pluginManager = pluginManager;
    console.debug('ArchiveManager initialized with plugin support');
  }

  /**
   * Check if the active plugin has required dependencies installed
   */
  private async assertPluginPresenceAndDependencies(): Promise<boolean> {
    const plugin = this.pluginManager.getCurrentPlugin()

    if (plugin === null) {
      console.error('No active archive plugin');
      NotificationManager.error('no_active_plugin');

      // Stop the archive process if no plugin is available
      await this.stopBackgroundProcessDueToError(
        'No archive plugin is uploaded',
        'no_active_plugin'
      );

      return false;
    }

    const activePlugin = this.pluginManager.getActivePlugin();
    console.log(activePlugin)
    if (activePlugin === null) {
      console.error('No active archive plugin');
      NotificationManager.error('no_active_plugin');

      // Stop the archive process if no plugin is available
      await this.stopBackgroundProcessDueToError(
        'No archive plugin is active',
        'no_active_plugin'
      );

      return false;
    }

    const depCheck = await activePlugin.checkDependencies();

    // Ensure missing array exists (defensive programming)
    const missing = depCheck.missing || [];

    if (!depCheck.installed) {
      console.error('Plugin dependencies not met:', depCheck.message);

      // Deactivate the plugin since dependencies are not met
      this.pluginManager.deactivatePlugin();
      console.debug('Plugin deactivated due to missing dependencies');

      // Send notification with missing dependencies
      if (missing.length > 0) {
        if (missing.length === 1) {
          NotificationManager.error('missing_dependency', [missing[0]]);
          await this.stopBackgroundProcessDueToError(
            `Missing dependency: ${missing[0]}`,
            'missing_dependency',
            [missing[0]],
            depCheck
          );
        } else {
          NotificationManager.error('missing_dependencies_multiple', [missing.join(', ')]);
          await this.stopBackgroundProcessDueToError(
            `Missing dependencies: ${missing.join(', ')}`,
            'missing_dependencies_multiple',
            [missing.join(', ')],
            depCheck
          );
        }
      } else {
        NotificationManager.error('plugin_dependencies_missing');
        await this.stopBackgroundProcessDueToError(
          'Plugin dependencies missing',
          'plugin_dependencies_missing',
          undefined,
          depCheck
        );
      }

      return false;
    }

    console.debug('Plugin dependencies check passed');
    return true;
  }

  /**
   * Stop the background process due to an error
   * This is different from user-requested stop
   */
  private async stopBackgroundProcessDueToError(reason: string, messageKey: string, params?: string[], depCheck?: { installed: boolean; missing: string[]; message?: string }): Promise<void> {
    console.error('Stopping archive process due to error:', reason);

    this.shouldStop = true;
    this.isArchiveProcessActive = false;
    this.isProcessing = false;
    this.currentArchive = null;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Notify frontend that process stopped with error
    EventsManager.sendNotification({
      type: 'archive-process-status',
      data: {
        isActive: false,
        errorKey: messageKey,
        errorParams: params
      }
    });

    if (depCheck!=null) {
      // Also update plugin dependency status so the plugins page can reflect the error
      await this.updatePluginDependencyStatus(depCheck);
    }

  }

  /**
   * Update and broadcast plugin dependency status
   */
  private async updatePluginDependencyStatus(depCheck?: { installed: boolean; missing: string[]; message?: string }): Promise<void> {
    try {
      const plugin = this.pluginManager.getCurrentPlugin();

      if (plugin) {
        const metadata = plugin.getMetadata();

        // Use provided depCheck or fetch it if not provided
        const dependencyStatus = depCheck || await plugin.checkDependencies();

        // Broadcast the dependency status to frontend
        EventsManager.notifyPluginDependencyStatus(metadata.id, dependencyStatus);
      }
    } catch (error) {
      console.error('Error updating plugin dependency status:', error);
    }
  }

  /**
   * Start the background archive process (runs every minute)
   */
  async startBackgroundProcess(): Promise<void> {
    console.debug('Starting background archive process');

    if (this.intervalId) {
      console.warn('Background process already running');
      return;
    }

    // Re-check dependencies before starting (user may have installed/uninstalled tools)
    const depsValid = await this.assertPluginPresenceAndDependencies();
    if (!depsValid) {
      console.error('Cannot start archive process: missing dependencies');
      return;
    }

    this.isArchiveProcessActive = true;
    this.shouldStop = false;

    // Run immediately on start
    this.processArchiveQueue();

    // Then run every minute
    this.intervalId = setInterval(() => {
      this.processArchiveQueue();
    }, 60000); // 60000ms = 1 minute

    // Notify UI that process started
    EventsManager.sendNotification({
      type: 'archive-process-status',
      data: { isActive: true }
    });

    console.debug('Background archive process started');
  }

  /**
   * Stop the background archive process
   */
  stopBackgroundProcess(): void {
    console.debug('Stopping background archive process');

    this.shouldStop = true;
    this.isArchiveProcessActive = false;
    console.debug('Stop flag set - will finish current archive and stop');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.debug('Interval timer cleared');
    }

    // If not currently processing, send stop notification immediately
    if (!this.isProcessing) {
      console.debug('No active processing - sending stop notification immediately');
      EventsManager.sendNotification({
        type: 'archive-process-status',
        data: { isActive: false }
      });
    }else{
      console.debug('Currently processing - will stop after current archive completes');
    }
  }

  /**
   * Get archive process status
   */
  getArchiveProcessStatus(): ArchiveProcessStatus {
    return {
      isActive: this.isArchiveProcessActive,
      isProcessing: this.isProcessing,
      currentArchive: this.currentArchive
    };
  }

  /**
   * Main process that checks and archives pending songs
   */
  private async processArchiveQueue(): Promise<void> {
    if (this.isProcessing) {
      console.debug('Archive process already running, skipping...');
      return;
    }

    if (this.shouldStop) {
      console.debug('Stop requested, skipping queue processing');
      return;
    }
    // Always check dependencies before processing (they may have been moved/uninstalled)
    const depsValid = await this.assertPluginPresenceAndDependencies();

    // Check if stop was requested during dependency check
    if (this.shouldStop) {
      console.debug('Stop requested during dependency check, aborting queue processing');
      EventsManager.sendNotification({
        type: 'archive-process-status',
        data: { isActive: false }
      });
      return;
    }

    if (!depsValid) {
      console.error('Cannot process archive queue: missing dependencies');
      this.shouldStop = true;
      // Stop the archive process and notify frontend
      this.isArchiveProcessActive = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      EventsManager.sendNotification({
        type: 'archive-process-status',
        data: { isActive: false }
      });

      return;
    }

    try {
      this.isProcessing = true;
      console.debug('Processing archive queue...');

      // Check stop flag again before getting songs
      if (this.shouldStop) {
        EventsManager.sendNotification({
          type: 'archive-process-status',
          data: { isActive: false }
        });
        console.debug('Stop requested before getting songs');
        return;
      }

      // Get songs that need to be archived
      const pendingSongs = this.db.getPendingSongs();

      if (pendingSongs.length === 0) {
        console.debug('No pending archives');
        return;
      }

      console.debug("Found " + pendingSongs.length + " pending songs");

      // Group songs by album
      const albumSongs = new Map<number, Song[]>();
      pendingSongs.forEach(song => {
        if (!albumSongs.has(song.album_id)) {
          albumSongs.set(song.album_id, []);
        }
        albumSongs.get(song.album_id)!.push(song);
      });

      // Process each album
      for (const [albumId, songs] of albumSongs) {
        console.debug("should stop =", this.shouldStop);
        if (this.shouldStop) {
          console.debug('Stop requested, aborting archive queue processing');
          break;
        }

        try {
          await this.processAlbumArchive(albumId, songs);
        } catch (error) {
          console.error("Error archiving album " + albumId + ":", error);
        }
      }
      console.debug("should stop after for =", this.shouldStop);

      if (this.shouldStop) {
        console.debug('Archive queue processing stopped by user request');
      }

    } catch (error) {
      console.error('Error in archive process:', error);
      NotificationManager.error('archive_failed');
    } finally {
      this.isProcessing = false;
      this.currentArchive = null;

      if (this.shouldStop) {
        console.debug('Stop flag is set, completing stop procedure');

        // Send stop notification now that archives are actually stopped
        EventsManager.sendNotification({
          type: 'archive-process-status',
          data: { isActive: false }
        });
      }
    }
  }

  /**
   * Process archive for a single album
   */
  private async processAlbumArchive(albumId: number, songs: Song[]): Promise<void> {
    // Get album and artist info
    const album = this.db.getAlbumById(albumId);
    if (!album) return;

    const artist = this.db.getArtistById(album.artist_id);
    if (!artist) return;

    // Get total songs in album
    const allSongs = this.db.getSongsByAlbum(albumId);
    const completedSongs = allSongs.filter(s => s.archive_status === 'ARCHIVED');

    // Send notification that album archive started
    EventsManager.sendNotification({
      type: 'album-archive-started',
      data: {
        albumId: album.id!,
        albumName: album.name,
        artistName: artist.name,
        totalTracks: allSongs.length,
        completedTracks: completedSongs.length
      } as AlbumArchiveStarted
    });

    // Archive each song in the album
    for (const song of songs) {
      console.debug("should stop in song =", this.shouldStop);

      if (this.shouldStop) {
        console.debug('Stop requested, aborting album archive');
        return;
      }

      try {
        this.currentArchive = song;
        console.debug("Starting archive: " + song.name);

        // Archive the song
        await this.archiveSong(song);

        console.debug("Song archive completed: " + song.name);

        // Send progress notification with updated count after archive completes
        const updatedCompletedSongs = allSongs.filter(s => {
          const currentSong = this.db.getSongById(s.id!);
          return currentSong && currentSong.archive_status === 'ARCHIVED';
        });

        EventsManager.sendNotification({
          type: 'album-archive-progress',
          data: {
            albumId: album.id!,
            albumName: album.name,
            artistName: artist.name,
            totalTracks: allSongs.length,
            completedTracks: updatedCompletedSongs.length,
            currentSong: song.name
          } as AlbumArchiveProgress
        });

        if (this.shouldStop) {
          console.debug('Stop requested - current archive finished, stopping now');
          return;
        }
      } catch (error) {
        console.error("Error archiving song " + song.id + ":", error);
        NotificationManager.error('archive_failed');
      }
    }

    const finalSongs = this.db.getSongsByAlbum(albumId);
    const finalCompletedSongs = finalSongs.filter(s => s.archive_status === 'ARCHIVED');

    EventsManager.sendNotification({
        type: 'album-archive-complete',
        data: {
          albumId: album.id!,
          albumName: album.name,
          artistName: artist.name,
          totalTracks: finalSongs.length,
          completedTracks: finalCompletedSongs.length,
          status: finalCompletedSongs.length === finalSongs.length ? 'completed':'error'
        } as AlbumArchiveComplete
      });

        EventsManager.sendNotification({
        type: 'album-status-changed',
        data: {
          albumId: album.id!,
          status: finalCompletedSongs.length === finalSongs.length ? 'ARCHIVED':'ARCHIVING_FAILURE'
        } as AlbumStatusUpdate
      });
    
  }

  /**
   * Archive a single song using the active plugin
   */
  private async archiveSong(song: Song): Promise<void> {
    console.debug("Archiving song: " + song.name + " (ID: " + song.id + ")");

    const plugin = this.pluginManager.getActivePlugin();
    if (!plugin) {
      throw new Error('No active plugin');
    }

    try {
      // Get album and artist info
      const album = this.db.getAlbumById(song.album_id);
      if (!album) {
        throw new Error('Album not found');
      }

      const artist = this.db.getArtistById(album.artist_id);
      if (!artist) {
        throw new Error('Artist not found');
      }

      // Use manual URL if provided, otherwise search using plugin
      let videoUrl = song.video_url;
      if (!videoUrl) {
        console.debug("Searching for: " + artist.name + " - " + song.name);
        videoUrl = await plugin.searchSong(artist.name, song.name, album.name);

        if (!videoUrl) {
          console.debug('Video not found');
          this.db.updateSongArchiveStatus(song.id!, 'VIDEO_NOT_FOUND');
          this.db.updateAlbumArchiveProgress(song.album_id);

          EventsManager.notifySongStatusChanged({
            songId: song.id!,
            albumId: song.album_id,
            status: 'VIDEO_NOT_FOUND'
          });

          return;
        }

        // Save the found video URL
        this.db.updateSongVideoUrl(song.id!, videoUrl);
      } else {
        console.debug("Using manual video URL: " + videoUrl);

        // Validate URL with plugin
        if (!plugin.validateUrl(videoUrl)) {
          console.error(`URL not supported by plugin ${plugin.getMetadata().name}:`, videoUrl);
          this.db.updateSongArchiveStatus(song.id!, 'ARCHIVING_FAILURE');
          this.db.updateAlbumArchiveProgress(song.album_id);

          EventsManager.notifySongStatusChanged({
            songId: song.id!,
            albumId: song.album_id,
            status: 'ARCHIVING_FAILURE'
          });

          return;
        }
      }

      // Get destination path
      const destPath = this.fileUtils.getSongFilePath(
        artist.name,
        album.name,
        song.track_number || 0,
        song.name
      );

      // Download the song using plugin
      console.debug('Downloading using plugin:', plugin.getMetadata().name);
      const downloadResult = await plugin.downloadSong(
        videoUrl,
        artist.name,
        album.name,
        song.track_number || null,
        song.name,
        album.release_year || null,
        destPath
      );

      // Write ID3 metadata tags to the downloaded file
      try {
        console.debug('Writing metadata to downloaded file');
        const tags: NodeID3.Tags = {
          title: song.name,
          artist: artist.name,
          album: album.name,
          trackNumber: song.track_number ? song.track_number.toString() : undefined,
          year: album.release_year ? album.release_year.toString() : undefined
        };

        const success = NodeID3.write(tags, downloadResult.path);
        
        if (success) {
          console.debug('Metadata written successfully');
        } else {
          console.warn('Failed to write metadata (non-critical)');
        }
      } catch (error) {
        console.warn('Error writing metadata (non-critical):', error);
        // Don't fail the archive if metadata writing fails
      }

      // Save file reference to database
      const fileId = this.db.addFile({
        file_manager: this.fileUtils.getCurrentFileManager(),
        path: downloadResult.path
      });

      // Read actual duration from the downloaded file
      let actualDuration: number | null = null;
      try {
        const metadata = await mm.parseFile(downloadResult.path);
        actualDuration = metadata.format.duration ? Math.floor(metadata.format.duration) : null;
        console.debug('Downloaded file actual duration:', actualDuration, 'seconds');
      } catch (error) {
        console.warn('Could not read duration from downloaded file:', error);
        // Fall back to plugin-provided duration if available
      }

      // Update song status and archived duration
      this.db.updateSongFile(song.id!, fileId);
      this.db.updateSongArchiveStatus(song.id!, 'ARCHIVED', fileId);
      if( actualDuration !== null ){
        this.db.updateSongArchivedDuration(song.id!, actualDuration);
      }

      // Update album status
      this.db.updateAlbumArchiveProgress(song.album_id);

      // Notify song status changed
      EventsManager.notifySongStatusChanged({
        songId: song.id!,
        albumId: song.album_id,
        status: 'ARCHIVED',
        fileId: fileId,
        archivedDuration: actualDuration
      });

      console.debug("Successfully archived: " + song.name);

    } catch (error) {
      console.error("Failed to archive song " + song.id + ":", error);
      NotificationManager.error('archive_failed');
      this.db.updateSongArchiveStatus(song.id!, 'ARCHIVING_FAILURE');
      this.db.updateAlbumArchiveProgress(song.album_id);

      EventsManager.notifySongStatusChanged({
        songId: song.id!,
        albumId: song.album_id,
        status: 'ARCHIVING_FAILURE'
      });

      throw error;
    }
  }

  /**
   * Get current archive queue status
   */
  getQueueStatus(): ArchiveQueueStatus {
    const pendingSongs = this.db.getPendingSongs();
    return {
      isProcessing: this.isProcessing,
      currentArchive: this.currentArchive,
      queueLength: pendingSongs.length,
      queue: pendingSongs
    };
  }
}
