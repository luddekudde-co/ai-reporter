import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'ai-reporter';

  constructor(private http: HttpClient) {}

  helloWorld() {
    this.http.get('/api', { responseType: 'text' }).subscribe(res => {
      console.log(res);
    });
  }
}
