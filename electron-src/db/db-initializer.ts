import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';

/**
 * Current schema version
 */
const CURRENT_SCHEMA_VERSION = 2;

/**
 * SQL schema for initializing the music archive database
 */
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS schema_version (
    id INTEGER PRIMARY KEY,
    version INTEGER NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Artist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    music_brainz_id TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS Album (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    artist_id INTEGER NOT NULL,
    music_brainz_id TEXT UNIQUE NOT NULL,
    music_brainz_release_group_id TEXT NOT NULL,
    release_year INTEGER,
    archive_status TEXT DEFAULT 'NOT_ARCHIVED' CHECK(archive_status IN ('PARTIALLY_ARCHIVED', 'NOT_ARCHIVED', 'ARCHIVED', 'VIDEO_NOT_FOUND', 'ARCHIVING_FAILURE')),
    FOREIGN KEY (artist_id) REFERENCES Artist(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS File_Document (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_manager TEXT NOT NULL,
    path TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS Song (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    album_id INTEGER NOT NULL,
    music_brainz_id TEXT,
    track_number INTEGER,
    duration INTEGER,
    archived_file_duration INTEGER,
    video_url TEXT,
    archive_status TEXT DEFAULT 'NOT_ARCHIVED' CHECK(archive_status IN ('PARTIALLY_ARCHIVED', 'NOT_ARCHIVED', 'ARCHIVED', 'VIDEO_NOT_FOUND', 'ARCHIVING_FAILURE')) NOT NULL,
    archived_file INTEGER,
    FOREIGN KEY (album_id) REFERENCES Album(id) ON DELETE CASCADE,
    FOREIGN KEY (archived_file) REFERENCES File_Document(id) ON DELETE SET NULL,
    UNIQUE(album_id, music_brainz_id)
  );

  CREATE TABLE IF NOT EXISTS recent_artist_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_text TEXT NOT NULL CHECK(length(search_text) <= 255),
    searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_album_artist ON Album(artist_id);
  CREATE INDEX IF NOT EXISTS idx_song_album ON Song(album_id);
  CREATE INDEX IF NOT EXISTS idx_album_status ON Album(archive_status);
  CREATE INDEX IF NOT EXISTS idx_album_release_group ON Album(music_brainz_release_group_id);
  CREATE INDEX IF NOT EXISTS idx_recent_searches_date ON recent_artist_searches(searched_at DESC);
`;

/**
 * Database initializer class
 */
export class DatabaseInitializer {
  private dbPath: string;
  private db: Database.Database | null = null;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'music-downloader.db');
  }

  /**
   * Initialize and return the database instance
   */
  initialize(): Database.Database {
    console.debug('Database file location:', this.dbPath);
    
    // Create database connection
    this.db = new Database(this.dbPath);
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Check if database is already initialized
    if (this.isInitialized()) {
      console.debug('✅ Database already initialized');
      console.debug('Current schema version:', this.getSchemaVersion());
      
      // Check if migration is needed
      const currentVersion = this.getSchemaVersion();
      if (currentVersion < CURRENT_SCHEMA_VERSION) {
        console.debug("Migrating database from version " + currentVersion + " to " + CURRENT_SCHEMA_VERSION);
        this.migrate(currentVersion, CURRENT_SCHEMA_VERSION);
      }
    } else {
      // First time initialization
      console.debug('Initializing database for the first time...');
      this.createSchema();
      this.setSchemaVersion(CURRENT_SCHEMA_VERSION);
      console.debug('Database initialized with CASCADE constraints');
    }
    
    console.debug('Database file location:', this.dbPath);
    return this.db;
  }

  /**
   * Check if the database is already initialized
   */
  private isInitialized(): boolean {
    if (!this.db) return false;
    
    try {
      const stmt = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'");
      const result = stmt.get();
      return !!result;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current schema version
   */
  private getSchemaVersion(): number {
    if (!this.db) return 0;
    
    try {
      const stmt = this.db.prepare('SELECT version FROM schema_version WHERE id = 1');
      const result = stmt.get() as { version: number } | undefined;
      return result?.version || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Set schema version
   */
  private setSchemaVersion(version: number): void {
    if (!this.db) return;
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO schema_version (id, version, updated_at) 
      VALUES (1, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(version);
  }

  /**
   * Create database schema
   */
  private createSchema(): void {
    if (!this.db) return;
    this.db.exec(SCHEMA_SQL);
  }

  /**
   * Migrate database from one version to another
   */
  private migrate(fromVersion: number, toVersion: number): void {
    if (!this.db) return;
    
    // Apply sequential migrations
    for (let version = fromVersion; version < toVersion; version++) {
      console.debug(`Applying migration: v${version} → v${version + 1}`);
      this.applyMigration(version, version + 1);
    }
    
    this.setSchemaVersion(toVersion);
    console.debug("Migration completed: v" + fromVersion + " → v" + toVersion);
  }

  /**
   * Apply a single migration step.
   * SQLite does not support ALTER TABLE DROP CONSTRAINT, so we rebuild the table.
   *
   * IMPORTANT: Foreign keys MUST be disabled around any DROP TABLE statement.
   * SQLite's DROP TABLE fires ON DELETE CASCADE on child tables when
   * foreign_keys pragma is ON, which would wipe related data before the
   * INSERT INTO … SELECT * FROM … copy has run.
   */
  private applyMigration(from: number, to: number): void {
    if (!this.db) return;
    
    if (from === 1 && to === 2) {
      // v1 → v2: Remove UNIQUE constraint from Album.music_brainz_release_group_id
      // to allow multiple releases (editions) from the same release-group.
      // Also change Song.music_brainz_id from globally UNIQUE to per-album unique,
      // since different album editions can share the same recordings.

      // Disable FK enforcement so that DROP TABLE does not cascade to child rows.
      this.db.pragma('foreign_keys = OFF');
      try {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS Album_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            artist_id INTEGER NOT NULL,
            music_brainz_id TEXT UNIQUE NOT NULL,
            music_brainz_release_group_id TEXT NOT NULL,
            release_year INTEGER,
            archive_status TEXT DEFAULT 'NOT_ARCHIVED' CHECK(archive_status IN ('PARTIALLY_ARCHIVED', 'NOT_ARCHIVED', 'ARCHIVED', 'VIDEO_NOT_FOUND', 'ARCHIVING_FAILURE')),
            FOREIGN KEY (artist_id) REFERENCES Artist(id) ON DELETE CASCADE
          );

          INSERT INTO Album_new SELECT * FROM Album;
          DROP TABLE Album;
          ALTER TABLE Album_new RENAME TO Album;

          CREATE INDEX IF NOT EXISTS idx_album_artist ON Album(artist_id);
          CREATE INDEX IF NOT EXISTS idx_album_status ON Album(archive_status);
          CREATE INDEX IF NOT EXISTS idx_album_release_group ON Album(music_brainz_release_group_id);

          CREATE TABLE IF NOT EXISTS Song_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            album_id INTEGER NOT NULL,
            music_brainz_id TEXT,
            track_number INTEGER,
            duration INTEGER,
            archived_file_duration INTEGER,
            video_url TEXT,
            archive_status TEXT DEFAULT 'NOT_ARCHIVED' CHECK(archive_status IN ('PARTIALLY_ARCHIVED', 'NOT_ARCHIVED', 'ARCHIVED', 'VIDEO_NOT_FOUND', 'ARCHIVING_FAILURE')) NOT NULL,
            archived_file INTEGER,
            FOREIGN KEY (album_id) REFERENCES Album(id) ON DELETE CASCADE,
            FOREIGN KEY (archived_file) REFERENCES File_Document(id) ON DELETE SET NULL,
            UNIQUE(album_id, music_brainz_id)
          );

          INSERT INTO Song_new SELECT * FROM Song;
          DROP TABLE Song;
          ALTER TABLE Song_new RENAME TO Song;

          CREATE INDEX IF NOT EXISTS idx_song_album ON Song(album_id);
        `);
      } finally {
        // Always re-enable FK enforcement even if the migration SQL fails.
        this.db.pragma('foreign_keys = ON');
      }
      console.debug('Migration v1→v2: Updated Album and Song constraints for multi-edition support');
      return;
    }

    console.warn(`No migration handler for v${from} → v${to}`);
  }

  /**
   * Get database path
   */
  getDbPath(): string {
    return this.dbPath;
  }
}
