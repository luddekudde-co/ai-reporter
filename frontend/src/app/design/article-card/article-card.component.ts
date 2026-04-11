import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Article } from '../../core/services/articles.service';
import { TimeAgoPipe } from '../../core/pipes/time-ago.pipe';

@Component({
  selector: 'app-article-card',
  standalone: true,
  imports: [RouterLink, TimeAgoPipe],
  templateUrl: './article-card.component.html',
  styleUrl: './article-card.component.scss',
})
export class ArticleCardComponent {
  article = input.required<Article>();
}
