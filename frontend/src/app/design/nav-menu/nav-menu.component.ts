import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DropdownComponent } from '../dropdown/dropdown.component';
import { LayoutService } from '../../services/layout-service/layout.service';

export interface NavMenuItem {
  label: string;
  categoryKey: string | null;
}

@Component({
  selector: 'app-nav-menu',
  standalone: true,
  imports: [RouterLink, DropdownComponent],
  templateUrl: './nav-menu.component.html',
  styleUrl: './nav-menu.component.scss',
})
export class NavMenuComponent {
  navItems = input<NavMenuItem[]>([]);

  private readonly route = inject(ActivatedRoute);
  readonly layout = inject(LayoutService);

  private readonly activeCategory = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('category'))),
  );

  readonly activeLabel = computed(() => {
    const active = this.activeCategory();
    const match = this.navItems().find((item) =>
      item.categoryKey === null ? !active : item.categoryKey === active,
    );
    return match?.label ?? 'Menu';
  });

  isActive(item: NavMenuItem): boolean {
    const active = this.activeCategory();
    if (item.categoryKey === null) return !active;
    return active === item.categoryKey;
  }
}
