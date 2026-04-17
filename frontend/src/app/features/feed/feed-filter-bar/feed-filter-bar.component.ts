import { Component, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import {
  NavMenuComponent,
  NavMenuItem,
} from '../../../design/nav-menu/nav-menu.component';
import { DropdownComponent } from '../../../design/dropdown/dropdown.component';

export interface SortOption {
  label: string;
  value: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { label: 'Top stories', value: 'score' },
  { label: 'Newest first', value: 'newest' },
  { label: 'Oldest first', value: 'oldest' },
  { label: 'Highest impact', value: 'impact' },
];

@Component({
  selector: 'app-feed-filter-bar',
  standalone: true,
  imports: [NavMenuComponent, DropdownComponent],
  templateUrl: './feed-filter-bar.component.html',
  styleUrl: './feed-filter-bar.component.scss',
})
export class FeedFilterBarComponent {
  navItems = input<NavMenuItem[]>([]);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly sortOptions = SORT_OPTIONS;

  readonly activeSort = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('sort') ?? 'score')),
    { initialValue: 'score' },
  );

  activeSortLabel(): string {
    return (
      this.sortOptions.find((o) => o.value === this.activeSort())?.label ??
      'Top stories'
    );
  }

  selectSort(value: string, dd: DropdownComponent): void {
    this.router.navigate([], {
      queryParamsHandling: 'merge',
      queryParams: { sort: value === 'score' ? null : value },
    });
    dd.close();
  }
}
