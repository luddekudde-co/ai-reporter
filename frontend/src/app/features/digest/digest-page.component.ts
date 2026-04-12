/**
 * DigestPageComponent — displays the latest weekly AI news digest.
 * Shows an AI-generated summary of the week's themes followed by a ranked list
 * of the most impactful articles from the past 7 days.
 */
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, NgClass } from '@angular/common';
import {
  DigestService,
  DigestResponse,
} from '../../core/services/digest.service';

@Component({
  selector: 'app-digest-page',
  standalone: true,
  imports: [RouterLink, DatePipe, NgClass],
  templateUrl: './digest-page.component.html',
  styleUrl: './digest-page.component.scss',
})
export class DigestPageComponent implements OnInit {
  private readonly digestService = inject(DigestService);

  digest = signal<DigestResponse | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  weekLabel = computed(() => {
    const d = this.digest();
    if (!d) return '';
    const date = new Date(d.weekStartDate);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  });

  ngOnInit(): void {
    this.digestService.getLatestDigest().subscribe({
      next: (digest) => {
        this.digest.set(digest);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('No digest available yet. Generate one via the API.');
        this.isLoading.set(false);
      },
    });
  }

  impactLabel(level: string | null): string {
    if (!level) return 'Unrated';
    return level.charAt(0) + level.slice(1).toLowerCase() + ' Impact';
  }

  impactClass(level: string | null): string {
    if (level === 'HIGH') return 'c-digest-page__impact--high';
    if (level === 'MEDIUM') return 'c-digest-page__impact--medium';
    return 'c-digest-page__impact--low';
  }
}
