import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ModalComponent } from '../../design/modal/modal.component';
import { InputComponent } from '../../design/input/input.component';
import { UserStore } from '../../stores/user.store';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ModalComponent, InputComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  userStore = inject(UserStore);

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

  signIn(email: string, password: string): void {
    this.userStore.login(email, password, () =>
      this.signInModalOpen.set(false),
    );
  }

  signUp(email: string, password: string): void {
    this.userStore.register(email, password, () =>
      this.signUpModalOpen.set(false),
    );
  }

  logout(): void {
    this.userStore.logout();
    this.closeMenu();
  }
}
