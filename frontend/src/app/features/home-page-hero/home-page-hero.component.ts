/**
 * FeedComponent — displays the daily AI news feed.
 * Entry point for the homepage. Renders the hero banner and (eventually) the article grid.
 */
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page-hero',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-page-hero.component.html',
  styleUrl: './home-page-hero.component.scss'
})
export class HomePageHeroComponent {}
