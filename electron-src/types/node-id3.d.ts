declare module 'node-id3' {
  export interface Tags {
    title?: string;
    artist?: string;
    album?: string;
    year?: string;
    trackNumber?: string;
    genre?: string;
    comment?: string;
    performerInfo?: string;
    [key: string]: any;
  }

  export function write(tags: Tags, filepath: string): boolean;
  export function read(filepath: string): Tags;
  export function update(tags: Tags, filepath: string): boolean;
  export function remove(filepath: string): boolean;
}
