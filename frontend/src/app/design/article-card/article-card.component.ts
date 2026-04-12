import { Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Article } from '../../core/services/articles.service';
import { TimeAgoPipe } from '../../core/pipes/time-ago.pipe';

@Component({
  selector: 'app-article-card',
  standalone: true,
  imports: [RouterLink, TimeAgoPipe, NgClass],
  templateUrl: './article-card.component.html',
  styleUrl: './article-card.component.scss',
})
export class ArticleCardComponent {
  article = input.required<Article>();

  impactLabel = computed(() => {
    const level = this.article().impactLevel;
    if (!level) return 'Unrated';
    const word = level.charAt(0) + level.slice(1).toLowerCase();
    return `${word} Impact`;
  });

  impactClass = computed(() => {
    const level = this.article().impactLevel;
    if (level === 'HIGH') return 'c-article-card__impact--high';
    if (level === 'LOW') return 'c-article-card__impact--low';
    return 'c-article-card__impact--medium';
  });
}
