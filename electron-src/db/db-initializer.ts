import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';

/**
 * Current schema version
 */
const CURRENT_SCHEMA_VERSION = 1;

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
    music_brainz_release_group_id TEXT UNIQUE NOT NULL,
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
    music_brainz_id TEXT UNIQUE NOT NULL,
    track_number INTEGER,
    duration INTEGER,
    archived_file_duration INTEGER,
    video_url TEXT,
    archive_status TEXT DEFAULT 'NOT_ARCHIVED' CHECK(archive_status IN ('PARTIALLY_ARCHIVED', 'NOT_ARCHIVED', 'ARCHIVED', 'VIDEO_NOT_FOUND', 'ARCHIVING_FAILURE')) NOT NULL,
    archived_file INTEGER,
    FOREIGN KEY (album_id) REFERENCES Album(id) ON DELETE CASCADE,
    FOREIGN KEY (archived_file) REFERENCES File_Document(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS recent_artist_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_text TEXT NOT NULL CHECK(length(search_text) <= 255),
    searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_album_artist ON Album(artist_id);
  CREATE INDEX IF NOT EXISTS idx_song_album ON Song(album_id);
  CREATE INDEX IF NOT EXISTS idx_album_status ON Album(archive_status);
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
    
    // Add migration logic here for future schema changes
    // Example:
    // if (fromVersion === 1 && toVersion === 2) {
    //   this.db.exec('ALTER TABLE ...');
    // }
    
    this.setSchemaVersion(toVersion);
    console.debug("Migration completed: v" + fromVersion + " → v" + toVersion);
  }

  /**
   * Get database path
   */
  getDbPath(): string {
    return this.dbPath;
  }
}
