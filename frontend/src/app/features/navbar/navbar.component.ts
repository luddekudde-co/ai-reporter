import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ModalComponent } from '../../design/modal/modal.component';
import { InputComponent } from '../../design/input/input.component';
import { AuthService } from '../../services/auth-service/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ModalComponent, InputComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  private authService = inject(AuthService);

  menuOpen = signal(false);
  signInModalOpen = signal(false);
  signUpModalOpen = signal(false);

  emailValue = '';
  passwordValue = '';

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  modal(type: 'signIn' | 'signUp') {
    this.emailValue = '';
    this.passwordValue = '';
    if (type === 'signIn') {
      this.signInModalOpen.set(!this.signInModalOpen());
    } else {
      this.signUpModalOpen.set(!this.signUpModalOpen());
    }
  }

  signUp(email: string, password: string) {
    console.log('Signing up with', email, password);
    this.authService.register(email, password).subscribe((response) => {
      console.log('User registered:', response);
    });
  }

  signIn(email: string, password: string) {
    console.log('Signing in with', email, password);
    this.authService.login(email, password).subscribe((response) => {
      console.log('User logged in:', response);
      this.authService.setAccessToken(response.accessToken);
    });
  }
}
