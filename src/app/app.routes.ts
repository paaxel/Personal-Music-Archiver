import { Routes } from '@angular/router';
import { SearchArtistsPageComponent } from './pages/search/search-artists-page/search-artists-page.component';
import { SearchAlbumsPageComponent } from './pages/search/search-albums-page/search-albums-page.component';
import { SearchAlbumPageComponent } from './pages/search/search-album-page/search-album-page.component';
import { ArchivesArtistsComponent } from './pages/archives/archives-artists/archives-artists.component';
import { ArchivesAlbumsComponent } from './pages/archives/archives-albums/archives-albums.component';
import { ArchivesAlbumComponent } from './pages/archives/archives-album/archives-album.component';
import { PluginsPageComponent } from './pages/plugins-page/plugins-page.component';
import { SearchAlbumsResolver } from './resolvers/search-albums.resolver';
import { SearchAlbumResolver } from './resolvers/search-album.resolver';
import { ArchivesAlbumsResolver } from './resolvers/archives-albums.resolver';
import { ArchivesAlbumResolver } from './resolvers/archives-album.resolver';
import { PluginsResolver } from './resolvers/plugins.resolver';

export const routes: Routes = [
  { path: '', redirectTo: '/search', pathMatch: 'full' },
  { path: 'search', component: SearchArtistsPageComponent },
  { 
    path: 'search/albums/:artistId', 
    component: SearchAlbumsPageComponent,
    resolve: { model: SearchAlbumsResolver }
  },
  { 
    path: 'search/album/:releaseGroupId', 
    component: SearchAlbumPageComponent,
    resolve: { model: SearchAlbumResolver }
  },
  { path: 'archives', component: ArchivesArtistsComponent },
  { 
    path: 'archives/albums/:artistId', 
    component: ArchivesAlbumsComponent,
    resolve: { model: ArchivesAlbumsResolver }
  },
  { 
    path: 'archives/album/:albumId', 
    component: ArchivesAlbumComponent,
    resolve: { model: ArchivesAlbumResolver }
  },
  { 
    path: 'plugins', 
    component: PluginsPageComponent,
    resolve: { model: PluginsResolver }
  }
];