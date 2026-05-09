/**
 * FeedPageComponent — renders the infinite-scroll article feed.
 * All state lives in FeedStore (survives navigation for scroll restoration).
 * An IntersectionObserver on #scrollSentinel triggers loading more articles.
 */
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ArticleCardComponent } from '../../design/article-card/article-card.component';
import { NavMenuItem } from '../../design/nav-menu/nav-menu.component';
import { FeedFilterBarComponent } from './feed-filter-bar/feed-filter-bar.component';
import { FeedStore } from './feed.store';

@Component({
  selector: 'app-feed-page',
  standalone: true,
  imports: [ArticleCardComponent, FeedFilterBarComponent],
  templateUrl: './feed-page.component.html',
  styleUrl: './feed-page.component.scss',
})
export class FeedPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollSentinel') private sentinelRef!: ElementRef;

  private readonly route = inject(ActivatedRoute);
  readonly feedStore = inject(FeedStore);

  private observer!: IntersectionObserver;
  private shouldRestoreScroll = false;

  navigationItems: NavMenuItem[] = [
    { label: 'All', categoryKey: null },
    { label: 'Medical', categoryKey: 'medical' },
    { label: 'Applications', categoryKey: 'application' },
    { label: 'Foundation', categoryKey: 'foundation' },
    { label: 'Funding', categoryKey: 'funding' },
    { label: 'Robotics', categoryKey: 'robotics' },
    { label: 'Policies', categoryKey: 'polic' },
    { label: 'Research', categoryKey: 'research' },
  ];

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const category = params.get('category') ?? undefined;
      const sort = params.get('sort') ?? 'score';

      const isBackNav =
        this.feedStore.articles().length > 0 &&
        this.feedStore.activeCategory() === category &&
        this.feedStore.activeSort() === sort;

      if (isBackNav) {
        this.shouldRestoreScroll = true;
      } else {
        this.feedStore.reset(category, sort);
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.shouldRestoreScroll) {
      const y = this.feedStore.getScrollPosition();
      requestAnimationFrame(() =>
        window.scrollTo({ top: y, behavior: 'instant' }),
      );
      this.shouldRestoreScroll = false;
    }

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          !this.feedStore.isLoading() &&
          this.feedStore.hasMore()
        ) {
          this.feedStore.loadMore();
        }
      },
      { rootMargin: '300px' },
    );

    this.observer.observe(this.sentinelRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.feedStore.saveScrollPosition(window.scrollY);
    this.observer?.disconnect();
  }
}
