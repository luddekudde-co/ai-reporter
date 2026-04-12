import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly destroyRef = inject(DestroyRef);

  readonly windowWidth = signal(window.innerWidth);
  readonly smBreakpoint = computed(() => this.windowWidth() < 895);

  constructor() {
    fromEvent(window, 'resize')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.windowWidth.set(window.innerWidth));
  }
}
