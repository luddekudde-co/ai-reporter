import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'feed', pathMatch: 'full' },
  {
    path: 'feed',
    loadComponent: () =>
      import('./features/feed/feed-page.component').then(
        (m) => m.FeedPageComponent,
      ),
  },
  {
    path: 'articles/:id',
    loadComponent: () =>
      import('./features/article/article-detail.component').then(
        (m) => m.ArticleDetailComponent,
      ),
  },
  {
    path: 'digest',
    loadComponent: () =>
      import('./features/digest/digest-page.component').then(
        (m) => m.DigestPageComponent,
      ),
  },
];
