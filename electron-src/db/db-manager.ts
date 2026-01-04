import Database from 'better-sqlite3';
import { DatabaseInitializer } from './db-initializer';
import { app, contextBridge, ipcMain, ipcRenderer } from 'electron';
import * as NodeID3 from 'node-id3';
import * as mm from 'music-metadata';
import {
    Artist,
    ArtistInput,
    Album,
    AlbumInput,
    Song,
    SongInput,
    FileDocument,
    FileDocumentInput,
    RecentSearch,
    ArtistWithAlbumCount,
    ArchivedAlbum,
    AlbumSearchResult,
    AlbumCountResult,
    RunResult,
    ArchiveStatus
} from './db-models';
import path from 'path';
import fs from 'fs';
import { FileUtils } from '../utils/file-manager/file-utils';
import { EventsManager } from '../utils/events-manager';
import { NotificationManager } from '../utils/notification-manager';
import { FileManagerType } from '../utils/file-manager/file-manager-factory';



/**
 * Database Manager class for handling all database operations
 */
export class DatabaseManager {
    private db: Database.Database = null;
    private fileUtils: FileUtils = null;

    constructor(fileUtils: FileUtils) {
        this.fileUtils = fileUtils;
    }

    initializeDatabase() {
        const initializer = new DatabaseInitializer();
        this.db = initializer.initialize();
    }


    // ============================================================================
    // Artist Operations
    // ============================================================================

    /**
     * Get all artists ordered by name
     */
    private getArtists(): Artist[] {
        const stmt = this.db.prepare('SELECT * FROM Artist ORDER BY name');
        return stmt.all() as Artist[];
    }

    /**
     * Add a new artist or return existing one if music_brainz_id matches
     */
    private addArtist(artist: ArtistInput): number {
        // First check if artist with this music_brainz_id already exists
        if (artist.music_brainz_id) {
            const findStmt = this.db.prepare('SELECT id FROM Artist WHERE music_brainz_id = ?');
            const existing = findStmt.get(artist.music_brainz_id) as { id: number } | undefined;

            if (existing) {
                console.debug('Artist already exists with music_brainz_id:', artist.music_brainz_id, '- Returning existing ID:', existing.id);
                return existing.id;
            }
        }

        // Artist doesn't exist, insert new one
        console.debug('Adding new artist:', artist.name, 'with music_brainz_id:', artist.music_brainz_id);
        const stmt = this.db.prepare('INSERT INTO Artist (name, music_brainz_id) VALUES (?, ?)');
        const result = stmt.run(artist.name, artist.music_brainz_id) as RunResult;
        console.debug('Artist added with ID:', result.lastInsertRowid);
        return Number(result.lastInsertRowid);
    }

    /**
     * Add a new artist or get existing one by MusicBrainz ID (legacy method)
     */
    private addOrGetArtistByMusicBrainzId(artist: ArtistInput): number {
        // Try to find existing artist by MusicBrainz ID
        const musicBrainzId = artist.music_brainz_id
        const findStmt = this.db.prepare('SELECT * FROM Artist WHERE music_brainz_id = ?');
        const existing = findStmt.get(musicBrainzId) as Artist | undefined;

        if (existing) {
            console.debug('Artist found:', existing.name, 'ID:', existing.id);
            return existing.id;
        }

        // Artist doesn't exist, insert new one
        console.debug('Adding new artist via legacy method:', artist.name);
        const insertStmt = this.db.prepare('INSERT INTO Artist (name, music_brainz_id) VALUES (?, ?)');
        const result = insertStmt.run(artist.name, musicBrainzId) as RunResult;
        console.debug('Artist added with ID:', result.lastInsertRowid);
        return Number(result.lastInsertRowid);
    }

    /**
     * Get all artists that have at least one album
     */
    private getArtistsWithArchivedAlbums(): ArtistWithAlbumCount[] {
        const stmt = this.db.prepare(`
      SELECT DISTINCT
        Artist.id,
        Artist.name,
        Artist.music_brainz_id,
        COUNT(Album.id) as album_count
      FROM Artist
      INNER JOIN Album ON Album.artist_id = Artist.id
      GROUP BY Artist.id, Artist.name, Artist.music_brainz_id
      ORDER BY Artist.name ASC
    `);
        return stmt.all() as ArtistWithAlbumCount[];
    }

    /**
     * Get artists with albums using pagination and search
     */
    private getArtistsPaginated(searchQuery: string = '', limit: number = 25, offset: number = 0): ArtistWithAlbumCount[] {
        const searchPattern = `%${searchQuery}%`;

        const stmt = this.db.prepare(`
      SELECT DISTINCT
        Artist.id,
        Artist.name,
        Artist.music_brainz_id,
        COUNT(Album.id) as album_count
      FROM Artist
      INNER JOIN Album ON Album.artist_id = Artist.id
      WHERE Artist.name LIKE ? COLLATE NOCASE
      GROUP BY Artist.id, Artist.name, Artist.music_brainz_id
      ORDER BY Artist.name COLLATE NOCASE ASC
      LIMIT ? OFFSET ?
    `);
        return stmt.all(searchPattern, limit, offset) as ArtistWithAlbumCount[];
    }

    /**
     * Get total count of artists with albums (for pagination)
     */
    private getArtistsCount(searchQuery: string = ''): number {
        const searchPattern = `%${searchQuery}%`;

        const stmt = this.db.prepare(`
      SELECT COUNT(DISTINCT Artist.id) as count
      FROM Artist
      INNER JOIN Album ON Album.artist_id = Artist.id
      WHERE Artist.name LIKE ? COLLATE NOCASE
    `);
        return (stmt.get(searchPattern) as AlbumCountResult).count;
    }

    // ============================================================================
    // Album Operations
    // ============================================================================

    /**
     * Get all albums by artist ID
     */
    private getAlbumsByArtist(artistId: number): Album[] {
        const stmt = this.db.prepare('SELECT * FROM Album WHERE artist_id = ? ORDER BY name');
        return stmt.all(artistId) as Album[];
    }

    /**
     * Get albums by specific artist with artist information
     */
    private getArchivedAlbumsByArtist(artistId: number): ArchivedAlbum[] {
        const stmt = this.db.prepare(`
      SELECT 
        Album.id as album_id,
        Album.name as album_name,
        Album.music_brainz_id as album_mb_id,
        Album.archive_status,
        Album.release_year,
        Artist.id as artist_id,
        Artist.name as artist_name,
        Artist.music_brainz_id as artist_mb_id
      FROM Album
      JOIN Artist ON Album.artist_id = Artist.id
      WHERE Artist.id = ?
      ORDER BY Album.name ASC
    `);
        return stmt.all(artistId) as ArchivedAlbum[];
    }

    /**
     * Get a single album with artist information by album ID
     */
    private getArchivedAlbumById(albumId: number): ArchivedAlbum | undefined {
        const stmt = this.db.prepare(`
      SELECT 
        Album.id as album_id,
        Album.name as album_name,
        Album.music_brainz_id as album_mb_id,
        Album.archive_status,
        Album.release_year,
        Artist.id as artist_id,
        Artist.name as artist_name,
        Artist.music_brainz_id as artist_mb_id
      FROM Album
      JOIN Artist ON Album.artist_id = Artist.id
      WHERE Album.id = ?
    `);
        return stmt.get(albumId) as ArchivedAlbum | undefined;
    }

    /**
     * Get all albums with artist information
     */
    private getArchivedAlbums(): ArchivedAlbum[] {
        const stmt = this.db.prepare(`
      SELECT 
        Album.id as album_id,
        Album.name as album_name,
        Album.music_brainz_id as album_mb_id,
        Album.archive_status,
        Album.release_year,
        Artist.id as artist_id,
        Artist.name as artist_name,
        Artist.music_brainz_id as artist_mb_id
      FROM Album
      JOIN Artist ON Album.artist_id = Artist.id
      ORDER BY Artist.name ASC, Album.name ASC
    `);
        return stmt.all() as ArchivedAlbum[];
    }

    /**
     * Search albums by name or artist name
     */
    private searchAlbums(query: string): AlbumSearchResult[] {
        const stmt = this.db.prepare(`
      SELECT 
        Album.*,
        Artist.name as artist_name
      FROM Album
      JOIN Artist ON Album.artist_id = Artist.id
      WHERE Album.name LIKE ? COLLATE NOCASE OR Artist.name LIKE ? COLLATE NOCASE
      ORDER BY Album.name COLLATE NOCASE
    `);
        return stmt.all(`%${query}%`, `%${query}%`) as AlbumSearchResult[];
    }

    /**
     * Get album by MusicBrainz release group ID
     */
    private getAlbumByReleaseGroupId(releaseGroupId: string): Album | undefined {
        const stmt = this.db.prepare('SELECT * FROM Album WHERE music_brainz_release_group_id = ?');
        return stmt.get(releaseGroupId) as Album | undefined;
    }

    /**
     * Add a new album or return existing one if music_brainz_id matches
     */
    private addAlbum(album: AlbumInput): number {
        // Check if album with this music_brainz_id already exists
        if (album.music_brainz_id) {
            const findStmt = this.db.prepare('SELECT id FROM Album WHERE music_brainz_id = ?');
            const existing = findStmt.get(album.music_brainz_id) as { id: number } | undefined;

            if (existing) {
                console.debug('Album already exists with music_brainz_id:', album.music_brainz_id, '- Returning existing ID:', existing.id);
                return existing.id;
            }
        }

        console.debug('Adding new album:', album.name, 'for artist_id:', album.artist_id);
        const stmt = this.db.prepare(`
      INSERT INTO Album (name, artist_id, music_brainz_id, music_brainz_release_group_id, release_year, archive_status) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(
            album.name,
            album.artist_id,
            album.music_brainz_id,
            album.music_brainz_release_group_id,
            album.release_year || null,
            album.archive_status || 'NOT_ARCHIVED'
        ) as RunResult;
        console.debug('Album added with ID:', result.lastInsertRowid);
        return Number(result.lastInsertRowid);
    }

    /**
     * Update album archive status
     */
    private updateAlbumStatus(albumId: number, status: ArchiveStatus): RunResult {
        const stmt = this.db.prepare('UPDATE Album SET archive_status = ? WHERE id = ?');
        return stmt.run(status, albumId) as RunResult;
    }

    /**
     * Get album by MusicBrainz ID
     */
    private getAlbumByMusicBrainzId(musicBrainzId: string): Album | undefined {
        const stmt = this.db.prepare('SELECT * FROM Album WHERE music_brainz_id = ?');
        return stmt.get(musicBrainzId) as Album | undefined;
    }

    // ============================================================================
    // Song Operations
    // ============================================================================

    /**
     * Add a new song or return existing one if music_brainz_id matches
     */
    private addSong(song: SongInput): number {
        // Check if song with this music_brainz_id already exists
        if (song.music_brainz_id) {
            const findStmt = this.db.prepare('SELECT id FROM Song WHERE music_brainz_id = ?');
            const existing = findStmt.get(song.music_brainz_id) as { id: number } | undefined;

            if (existing) {
                console.debug('Song already exists with music_brainz_id:', song.music_brainz_id, '- Skipping');
                return existing.id;
            }
        }

        const stmt = this.db.prepare(`
      INSERT INTO Song (name, album_id, music_brainz_id, track_number, duration, archived_file_duration, video_url, archive_status, archived_file) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(
            song.name,
            song.album_id,
            song.music_brainz_id || null,
            song.track_number || null,
            song.duration || null,
            song.archived_file_duration || null,
            song.video_url || null,
            song.archive_status || 'NOT_ARCHIVED',
            song.archived_file || null
        ) as RunResult;
        return Number(result.lastInsertRowid);
    }

    // ============================================================================
    // File Operations
    // ============================================================================

    /**
     * Delete song file and update status
     */
    private deleteSongFile(songId: number): void {
        try {
            const song = this.getSongById(songId);
            
            if (!song) {
                throw new Error(`Song ${songId} not found`);
            }

            // Get file info before deleting
            if (song.archived_file) {
                const fileStmt = this.db.prepare('SELECT * FROM File_Document WHERE id = ?');
                const file = fileStmt.get(song.archived_file) as FileDocument | undefined;
                
                if (file) {
                    // Delete physical file
                    try {
                        this.fileUtils.deleteFile(file.path);
                        console.debug("Deleted physical file: " + file.path);
                    } catch (error) {
                        console.warn("Could not delete physical file: " + file.path, error);
                    }
                    
                    // Delete file reference from database
                    this.deleteFileDocument(song.archived_file);
                }
            }

            // Update song status based on whether it has a video URL
            const newStatus = 'NOT_ARCHIVED';
            
            // Update song to remove file reference and set status
            const updateStmt = this.db.prepare(
                'UPDATE Song SET archived_file = NULL, archive_status = ? WHERE id = ?'
            );
            updateStmt.run(newStatus, songId);
            
            // Notify renderer
            EventsManager.notifySongStatusChanged({
                songId: songId,
                albumId: song.album_id,
                status: newStatus
            });

            console.debug("Song " + songId + " file deleted, status set to " + newStatus);
            
            // Update album status
            this.updateAlbumArchiveProgress(song.album_id);
            
        } catch (error) {
            console.error('Error deleting song file:', error);
            NotificationManager.error('file_delete_failed');
            throw error;
        }
    }

    // ============================================================================
    // Recent Searches Operations
    // ============================================================================

    /**
     * Add a recent search entry
     */
    private addRecentSearch(searchText: string): void {
        if (!searchText || searchText.length > 255) {
            console.error('Invalid search text');
            return;
        }

        // Check if this exact search already exists
        const findStmt = this.db.prepare('SELECT id FROM recent_artist_searches WHERE search_text = ?');
        const existing = findStmt.get(searchText) as { id: number } | undefined;

        if (existing) {
            // Update the timestamp by deleting and re-inserting
            const deleteStmt = this.db.prepare('DELETE FROM recent_artist_searches WHERE id = ?');
            deleteStmt.run(existing.id);
        }

        // Insert the search
        const insertStmt = this.db.prepare('INSERT INTO recent_artist_searches (search_text) VALUES (?)');
        insertStmt.run(searchText);

        // Keep only the last 15 searches
        const cleanupStmt = this.db.prepare(`
      DELETE FROM recent_artist_searches 
      WHERE id NOT IN (
        SELECT id FROM recent_artist_searches 
        ORDER BY searched_at DESC 
        LIMIT 15
      )
    `);
        cleanupStmt.run();
    }

    /**
     * Get recent searches
     */
    private getRecentSearches(limit: number = 15): RecentSearch[] {
        const stmt = this.db.prepare(`
      SELECT search_text, searched_at 
      FROM recent_artist_searches 
      ORDER BY searched_at DESC 
      LIMIT ?
    `);
        return stmt.all(limit) as RecentSearch[];
    }

    /**
     * Clear all recent searches
     */
    private clearRecentSearches(): RunResult {
        const stmt = this.db.prepare('DELETE FROM recent_artist_searches');
        return stmt.run() as RunResult;
    }

    // ============================================================================
    // Utility Methods
    // ============================================================================

    /**
     * Close the database connection
     */
    close(): void {
        this.db.close();
    }

    // ============================================================================
    // Public methods for DownloadManager
    // ============================================================================

    /**
     * Get all songs pending archive (public method for DownloadManager)
     */
    getPendingSongs(): Song[] {
        const stmt = this.db.prepare('SELECT * FROM Song WHERE archive_status = ?');
        return stmt.all('NOT_ARCHIVED') as Song[];
    }

    /**
     * Get album by ID (public method for DownloadManager)
     */
    getAlbumById(albumId: number): Album | undefined {
        const stmt = this.db.prepare('SELECT * FROM Album WHERE id = ?');
        return stmt.get(albumId) as Album | undefined;
    }

    /**
     * Get artist by ID (public method for DownloadManager)
     */
    getArtistById(artistId: number): Artist | undefined {
        const stmt = this.db.prepare('SELECT * FROM Artist WHERE id = ?');
        return stmt.get(artistId) as Artist | undefined;
    }

    /**
     * Get songs by album (public method for DownloadManager)
     */
    getSongsByAlbum(albumId: number): Song[] {
        const stmt = this.db.prepare('SELECT * FROM Song WHERE album_id = ? ORDER BY track_number ASC, name ASC');
        return stmt.all(albumId) as Song[];
    }

    /**
     * Get song by ID (public method for DownloadManager)
     */
    getSongById(songId: number): Song | undefined {
        const stmt = this.db.prepare('SELECT * FROM Song WHERE id = ?');
        return stmt.get(songId) as Song | undefined;
    }

    /**
     * Add file document (public method for DownloadManager)
     */
    addFile(file: FileDocumentInput): number {
        const stmt = this.db.prepare('INSERT INTO File_Document (file_manager, path) VALUES (?, ?)');
        const result = stmt.run(file.file_manager, file.path) as RunResult;
        return Number(result.lastInsertRowid);
    }

    /**
     * Get file by ID (public method for DownloadManager)
     */
    getFileById(fileId: number): FileDocument | undefined {
        const stmt = this.db.prepare('SELECT * FROM File_Document WHERE id = ?');
        return stmt.get(fileId) as FileDocument | undefined;
    }

    /**
     * Delete file reference (public method for DownloadManager)
     */
    deleteFileDocument(fileId: number): void {
        try {
            const stmt = this.db.prepare('DELETE FROM File_Document WHERE id = ?');
            stmt.run(fileId);
            console.debug("Deleted file reference " + fileId);
        } catch (error) {
            console.error('Error deleting file reference:', error);
            throw error;
        }
    }

    /**
     * Update song archive status (public method for DownloadManager)
     */
    updateSongArchiveStatus(songId: number, status: ArchiveStatus, fileId: number | null = null): void {
        const params = fileId
            ? [status, fileId, songId]
            : [status, songId];

        const sql = fileId
            ? 'UPDATE Song SET archive_status = ?, archived_file = ? WHERE id = ?'
            : 'UPDATE Song SET archive_status = ? WHERE id = ?';

        const stmt = this.db.prepare(sql);
        stmt.run(...params);
    }

    /**
     * Update song file reference (public method for DownloadManager)
     */
    updateSongFile(songId: number, fileId: number): void {
        const stmt = this.db.prepare('UPDATE Song SET archived_file = ? WHERE id = ?');
        stmt.run(fileId, songId);
    }

    /**
     * Update song archived file duration (public method for DownloadManager)
     */
    updateSongArchivedDuration(songId: number, duration: number | null): void {
        const stmt = this.db.prepare('UPDATE Song SET archived_file_duration = ? WHERE id = ?');
        stmt.run(duration, songId);
    }

    /**
     * Update song video URL (public method for DownloadManager)
     */
    updateSongVideoUrl(songId: number, videoUrl: string): void {
        // Get the current song state
        const song = this.getSongById(songId);

        if (!song) {
            console.error('Song not found:', songId);
            return;
        }

        // Check if the URL has changed and song was previously archived
        const urlChanged = song.video_url && song.video_url !== videoUrl;
        const wasArchived = song.archive_status === 'ARCHIVED';

        if (urlChanged && wasArchived) {
            // URL changed for an archived song - mark for re-download
            console.debug("Video URL changed for archived song " + songId + ", marking for re-download");
            const stmt = this.db.prepare('UPDATE Song SET video_url = ?, archive_status = ?, archived_file = NULL WHERE id = ?');
            stmt.run(videoUrl, 'NOT_ARCHIVED', songId);

            // Update album status since we now have a pending archive
            this.updateAlbumArchiveProgress(song.album_id);
        } else if (!song.video_url || song.archive_status === 'VIDEO_NOT_FOUND' || song.archive_status === 'ARCHIVING_FAILURE') {
            // First time setting URL or retrying a failed archive
            console.debug("Setting video URL for song " + songId);
            const stmt = this.db.prepare('UPDATE Song SET video_url = ?, archive_status = ? WHERE id = ?');
            stmt.run(videoUrl, 'NOT_ARCHIVED', songId);

            // Update album status
            this.updateAlbumArchiveProgress(song.album_id);
        } else {
            // Just update the URL without changing status (URL is the same or song not archived yet)
            const stmt = this.db.prepare('UPDATE Song SET video_url = ? WHERE id = ?');
            stmt.run(videoUrl, songId);
        }
    }

    /**
     * Update album archive progress (public method for DownloadManager)
     */
    updateAlbumArchiveProgress(albumId: number): void {
        // Get all songs for this album
        const songs = this.getSongsByAlbum(albumId);

        if (songs.length === 0) return;

        const completedCount = songs.filter(s => s.archive_status === 'ARCHIVED').length;
        const failedCount = songs.filter(s =>
            s.archive_status === 'VIDEO_NOT_FOUND' ||
            s.archive_status === 'ARCHIVING_FAILURE'
        ).length;
        const totalProcessed = completedCount + failedCount;

        let status: ArchiveStatus;
        if (completedCount === 0) {
            status = 'NOT_ARCHIVED';
        } else if (completedCount === songs.length) {
            status = 'ARCHIVED';
        } else if (totalProcessed === songs.length) {
            if (failedCount > 0) {
                status = 'ARCHIVING_FAILURE';
            } else {
                status = 'ARCHIVED';
            }
        } else {
            status = 'PARTIALLY_ARCHIVED';
        }

        const stmt = this.db.prepare('UPDATE Album SET archive_status = ? WHERE id = ?');
        stmt.run(status, albumId);
    }

    /**
     * Delete album and return file IDs (public method for DownloadManager)
     */
    deleteAlbum(albumId: number): number[] {
        try {
            console.debug("DB: Starting deletion for album " + albumId + "...");

            // Get album info for logging
            const stmt = this.db.prepare('SELECT * FROM Album WHERE id = ?');
            const album = stmt.get(albumId) as Album | undefined;
            if (!album) {
                console.error("DB: Album " + albumId + " not found");
                throw new Error("Album " + albumId + " not found");
            }
            console.debug("DB: Album found:", album.name);

            // Get all songs for this album to find files
            const songs = this.getSongsByAlbum(albumId);
            console.debug("DB: Found " + songs.length + " songs for album " + albumId);

            const fileIds = songs
                .filter(song => song.archived_file)
                .map(song => song.archived_file as number);
            console.debug("DB: Found " + fileIds.length + " files to delete:", fileIds);

            // Delete the album (CASCADE will delete songs automatically)
            const deleteAlbumStmt = this.db.prepare('DELETE FROM Album WHERE id = ?');
            const result = deleteAlbumStmt.run(albumId) as RunResult;
            console.debug("DB: Deleted album " + albumId + ", changes: " + result.changes);

            // Verify deletion
            const verifyAlbum = this.db.prepare('SELECT id FROM Album WHERE id = ?').get(albumId);
            const verifySongs = this.db.prepare('SELECT COUNT(*) as count FROM Song WHERE album_id = ?').get(albumId) as { count: number };
            console.debug("DB: Verification - Album exists: " + !!verifyAlbum + ", Remaining songs: " + verifySongs.count);

            // Return the file IDs to be deleted by the caller
            console.debug("DB: Returning " + fileIds.length + " file IDs for deletion");
            return fileIds;
        } catch (error) {
            console.error('DB: Error deleting album from database:', error);
            console.error('DB: Error stack:', (error as Error).stack);
            throw error;
        }
    }

    /**
     * Reset album archive status - removes all archived files and resets songs to NOT_ARCHIVED
     * This allows re-archiving the entire album from scratch
     */
    resetAlbumArchive(albumId: number): void {
        try {
            console.debug(`Resetting album ${albumId} for re-archive...`);

            // Get all songs for this album
            const songs = this.getSongsByAlbum(albumId);
            console.debug(`Found ${songs.length} songs to reset`);

            // For each song, delete the file and reset status
            for (const song of songs) {
                try {
                    // Delete the physical file if it exists
                    if (song.archived_file) {
                        const file = this.getFileById(song.archived_file);
                        
                        if (file) {
                            const fileUtils = new FileUtils(FileManagerType[file.file_manager]);
                            
                            try {
                                fileUtils.deleteFile(file.path);
                                console.debug(`Deleted file: ${file.path}`);
                            } catch (error) {
                                console.warn(`Could not delete physical file: ${file.path}`, error);
                            }
                            
                            // Delete file reference from database
                            this.deleteFileDocument(song.archived_file);
                        }
                    }

                    // Reset song to NOT_ARCHIVED and clear video URL and file reference
                    const updateStmt = this.db.prepare(
                        'UPDATE Song SET archive_status = ?, video_url = NULL, archived_file = NULL, archived_file_duration = NULL WHERE id = ?'
                    );
                    updateStmt.run('NOT_ARCHIVED', song.id);
                    
                    console.debug(`Reset song ${song.id} (${song.name}) to NOT_ARCHIVED`);
                    
                    // Notify renderer about song status change
                    EventsManager.notifySongStatusChanged({
                        songId: song.id!,
                        albumId: song.album_id,
                        status: 'NOT_ARCHIVED'
                    });
                } catch (error) {
                    console.warn(`Error resetting song ${song.id}:`, error);
                    // Continue with other songs even if one fails
                }
            }

            // Update album status to NOT_ARCHIVED
            const updateAlbumStmt = this.db.prepare('UPDATE Album SET archive_status = ? WHERE id = ?');
            updateAlbumStmt.run('NOT_ARCHIVED', albumId);
            
            console.debug(`Album ${albumId} reset to NOT_ARCHIVED`);
            
            // Notify renderer about album status change
            EventsManager.notifyAlbumStatusChanged(albumId, 'NOT_ARCHIVED');
            
            NotificationManager.success('album_reset_success');
        } catch (error) {
            console.error('Error resetting album archive:', error);
            NotificationManager.error('album_reset_failed');
            throw error;
        }
    }



    configureDbIpcHandlers(): void {
        // Recent searches operations
        ipcMain.handle('db-add-recent-search', async (event, searchText) => {
            return this.addRecentSearch(searchText);
        });

        ipcMain.handle('db-get-recent-searches', async (event, limit) => {
            return this.getRecentSearches(limit);
        });

        ipcMain.handle('db-clear-recent-searches', async () => {
            return this.clearRecentSearches();
        });

        ipcMain.handle('db-check-album-exists', async (event, musicBrainzId) => {
            return this.getAlbumByMusicBrainzId(musicBrainzId);
        });

        ipcMain.handle('db-check-album-by-release-group', async (event, releaseGroupId) => {
            return this.getAlbumByReleaseGroupId(releaseGroupId);
        });

        ipcMain.handle('db-add-album', async (event, album) => {
            return this.addAlbum(album);
        });

        ipcMain.handle('db-add-artist', async (event, artist) => {
            return this.addArtist(artist);
        });

        ipcMain.handle('db-add-song', async (event, song) => {
            return this.addSong(song);
        });

        ipcMain.handle('db-get-song-by-id', async (event, songId) => {
            return this.getSongById(songId);
        });

        ipcMain.handle('db-update-song-video-url', async (event, songId, videoUrl) => {
            try {
                return this.updateSongVideoUrl(songId, videoUrl);
            } catch (error) {
                console.error('Error updating song video URL:', error);
                NotificationManager.error('db_error');
                throw error;
            }
        });

        ipcMain.handle('db-upload-song-file', async (event, data) => {
            const { songId, fileBuffer, fileName, artistName, albumName, trackNumber, songName } = data;

            try {
                // Get song and album info for metadata
                const song = this.getSongById(songId);
                const album = this.getAlbumById(song.album_id);

                // Create temporary file
                const tempPath = path.join(app.getPath('temp'), fileName);
                fs.writeFileSync(tempPath, fileBuffer);

                // Get duration of uploaded file before copying
                let uploadedDuration: number | null = null;
                try {
                    const metadata = await mm.parseFile(tempPath);
                    uploadedDuration = metadata.format.duration ? Math.floor(metadata.format.duration) : null;
                    console.debug('Uploaded file duration:', uploadedDuration, 'seconds');
                } catch (error) {
                    console.warn('Could not read duration from uploaded file:', error);
                }

                // Copy to proper location
                const destPath = await this.fileUtils.copyUploadedFile(
                    tempPath,
                    artistName,
                    albumName,
                    trackNumber,
                    songName
                );

                // Write metadata to the uploaded file
                try {
                    console.debug('Writing metadata to uploaded file');
                    const tags: NodeID3.Tags = {
                        title: songName,
                        artist: artistName,
                        album: albumName,
                        trackNumber: trackNumber ? trackNumber.toString() : undefined,
                        year: album.release_year ? album.release_year.toString() : undefined
                    };

                    const success = NodeID3.write(tags, destPath);
                    
                    if (success) {
                        console.debug('Metadata written to uploaded file successfully');
                    } else {
                        console.warn('Failed to write metadata to uploaded file');
                    }
                } catch (error) {
                    console.warn('Error writing metadata to uploaded file:', error);
                    // Don't fail the upload if metadata writing fails
                }

                // Save file reference to database
                const fileId = this.addFile({
                    file_manager: this.fileUtils.getCurrentFileManager(),
                    path: destPath
                });

                // Update song with file reference, status, and uploaded file duration
                this.updateSongFile(songId, fileId);
                this.updateSongArchiveStatus(songId, 'ARCHIVED', fileId);
                if(uploadedDuration !== null){
                    console.debug('Updating song archived file duration to:', uploadedDuration);
                    this.updateSongArchivedDuration(songId, uploadedDuration);
                }

                // Update album status
                this.updateAlbumArchiveProgress(song.album_id);

                // Clean up temp file
                fs.unlinkSync(tempPath);

                NotificationManager.success('upload_success');
                return { success: true };
            } catch (error) {
                console.error('Error uploading file:', error);
                NotificationManager.error('upload_failed');
                throw error;
            }
        });

        ipcMain.handle('db-delete-song-file', async (event, songId) => {
            try {
                this.deleteSongFile(songId);
                NotificationManager.success('delete_success');
                return { success: true };
            } catch (error) {
                console.error('Error in db-delete-song-file handler:', error);
                NotificationManager.error('song_delete_failed');
                throw error;
            }
        });

        ipcMain.handle('db-get-song-file', async (event, songId) => {
            try {
                const song = this.getSongById(songId);
                
                if (!song || !song.archived_file) {
                    NotificationManager.error('file_not_found');
                    throw new Error(`Song ${songId} has no archived file`);
                }

                const file: FileDocument = this.getFileById(song.archived_file);

                if (!file) {
                    NotificationManager.error('file_not_found');
                    throw new Error(`File ${song.archived_file} not found`);
                }

                const fileReader = new FileUtils(FileManagerType[file.file_manager]);

                // Read the file using the appropriate file manager
                const fileBuffer = await fileReader.readFile(file.path);
                
                return {
                    buffer: fileBuffer,
                    path: file.path
                };
            } catch (error) {
                console.error('Error reading song file:', error);
                NotificationManager.error('file_read_failed');
                throw error;
            }
        });


        ipcMain.handle('delete-album', async (event, albumId) => {
            console.debug('IPC: delete-album called for album:', albumId);

            try {
                // Get the album
                const album = this.getAlbumById(albumId);
                if (!album) {
                    NotificationManager.error('album_delete_failed');
                    throw new Error("Album " + albumId + " not found");
                }
                console.debug("Found album: " + album.name);

                // Get all songs for this album
                const songs = this.getSongsByAlbum(albumId);
                console.debug("Found " + songs.length + " songs to delete");

                // Delete files for each song that has one
                for (const song of songs) {
                    try {
                        if (song.archived_file) {
                            const file: FileDocument = this.getFileById(song.archived_file);
                            
                            if (file) {
                                const fileReader = new FileUtils(FileManagerType[file.file_manager]);
                                
                                try {
                                    await fileReader.deleteFile(file.path);
                                    console.debug("Deleted file: " + file.path);
                                } catch (fileError) {
                                    console.warn("Could not delete file " + file.path + ":", fileError);
                                    // Continue with deletion even if file deletion fails
                                }
                                
                                // Delete file reference from database
                                this.deleteFileDocument(song.archived_file);
                            }
                        }
                    } catch (error) {
                        console.warn("Error processing song " + song.id + ":", error);
                        // Continue with other songs even if one fails
                    }
                }

                // Delete the album (CASCADE will delete songs automatically)
                const deleteAlbumStmt = this.db.prepare('DELETE FROM Album WHERE id = ?');
                deleteAlbumStmt.run(albumId);
                console.debug("Deleted album " + albumId);

                NotificationManager.success('album_delete_success');
                return { success: true };
            } catch (error) {
                console.error('❌ Error deleting album:', error);
                NotificationManager.error('album_delete_failed');
                throw error;
            }
        });


        ipcMain.handle('db-add-songs-batch', async (event, songs: SongInput[]) => {
            try {
                const songIds: number[] = [];
                
                this.db.prepare('BEGIN TRANSACTION').run();
                
                try {
                    for (const song of songs) {
                        const songId = this.addSong(song);
                        songIds.push(songId);
                    }
                    
                    this.db.prepare('COMMIT').run();
                    console.debug('Batch inserted ' + songIds.length + ' songs');
                    return songIds;
                } catch (error) {
                    this.db.prepare('ROLLBACK').run();
                    NotificationManager.error('db_error');
                    throw error;
                }
            } catch (error) {
                console.error('Error in batch song insert:', error);
                NotificationManager.error('db_error');
                throw error;
            }
        });

        ipcMain.handle('db-get-songs-by-album', async (event, albumId) => {
            return this.getSongsByAlbum(albumId);
        });

        ipcMain.handle('db-get-archived-artists', async (event) => {
            return this.getArtistsWithArchivedAlbums();
        });

        ipcMain.handle('db-get-archived-albums-by-artist', async (event, artistId) => {
            return this.getArchivedAlbumsByArtist(artistId);
        });

        ipcMain.handle('db-get-archived-album-by-id', async (event, albumId) => {
            return this.getArchivedAlbumById(albumId);
        });

        ipcMain.handle('db-get-artists-paginated', async (event, searchQuery, limit, offset) => {
            return this.getArtistsPaginated(searchQuery, limit, offset);
        });

        ipcMain.handle('db-get-artists-count', async (event, searchQuery) => {
            return this.getArtistsCount(searchQuery);
        });

        ipcMain.handle('db-get-artist-by-id', async (event, artistId) => {
            return this.getArtistById(artistId);
        });

        ipcMain.handle('reset-album-archive', async (event, albumId: number) => {
            console.debug('IPC: reset-album-archive called for album:', albumId);
            try {
                this.resetAlbumArchive(albumId);
                return { success: true };
            } catch (error) {
                console.error('Error resetting album archive:', error);
                return { success: false, error: (error as Error).message };
            }
        });
    }

    static configureDbCallbacks(): void {
        contextBridge.exposeInMainWorld('electronDbAPI', {
            deleteAlbum: (albumId) => ipcRenderer.invoke('delete-album', albumId),
            addAlbum: (album) => ipcRenderer.invoke('db-add-album', album),
            addArtist: (artist) => ipcRenderer.invoke('db-add-artist', artist),
            addSong: (song) => ipcRenderer.invoke('db-add-song', song),
            addSongsBatch: (songs) => ipcRenderer.invoke('db-add-songs-batch', songs),

            checkAlbumExists: (musicBrainzId) => ipcRenderer.invoke('db-check-album-exists', musicBrainzId),
            checkAlbumByReleaseGroup: (releaseGroupId) => ipcRenderer.invoke('db-check-album-by-release-group', releaseGroupId),

            // Recent searches
            addRecentSearch: (searchText) => ipcRenderer.invoke('db-add-recent-search', searchText),
            getRecentSearches: (limit) => ipcRenderer.invoke('db-get-recent-searches', limit),
            clearRecentSearches: () => ipcRenderer.invoke('db-clear-recent-searches'),

            updateSongVideoUrl: (songId, videoUrl) => ipcRenderer.invoke('db-update-song-video-url', songId, videoUrl),
            uploadSongFile: async (songId, file, artistName, albumName, trackNumber, songName) => {
                // Read file as buffer
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                return ipcRenderer.invoke('db-upload-song-file', {
                    songId,
                    fileBuffer: buffer,
                    fileName: file.name,
                    artistName,
                    albumName,
                    trackNumber,
                    songName
                });
            },
            deleteSongFile: (songId) => ipcRenderer.invoke('db-delete-song-file', songId),
            getSongFile: (songId) => ipcRenderer.invoke('db-get-song-file', songId),
            getSongsByAlbum: (albumId) => ipcRenderer.invoke('db-get-songs-by-album', albumId),
            getSongById: (songId) => ipcRenderer.invoke('db-get-song-by-id', songId),
            getArtistsPaginated: (searchQuery, limit, offset) => ipcRenderer.invoke('db-get-artists-paginated', searchQuery, limit, offset),
            getArtistsCount: (searchQuery) => ipcRenderer.invoke('db-get-artists-count', searchQuery),
            getArtistById: (artistId) => ipcRenderer.invoke('db-get-artist-by-id', artistId),
            getArchivedArtists: () => ipcRenderer.invoke('db-get-archived-artists'),
            getArchivedAlbumsByArtist: (artistId) => ipcRenderer.invoke('db-get-archived-albums-by-artist', artistId),
            getArchivedAlbumById: (albumId) => ipcRenderer.invoke('db-get-archived-album-by-id', albumId),
            resetAlbumArchive: (albumId) => ipcRenderer.invoke('reset-album-archive', albumId),
        })
    }
}
