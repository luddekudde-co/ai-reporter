import { Component } from '@angular/core';
import { HomePageHeroComponent } from '../../features/home-page-hero/home-page-hero.component';

@Component({
  selector: 'app-home-page',
  imports: [HomePageHeroComponent],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {

}
