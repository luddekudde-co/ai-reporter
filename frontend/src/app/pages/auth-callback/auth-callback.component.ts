// OAuth callback page. Reads JWT from URL hash, hands it to UserStore, then
// redirects home. The hash is stripped via history.replaceState so the token
// never lingers in the address bar.
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserStore } from '../../stores/user.store';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `<p>Signing you in…</p>`,
})
export class AuthCallbackComponent implements OnInit {
  private userStore = inject(UserStore);
  private router = inject(Router);

  ngOnInit(): void {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const token = params.get('token');

    if (token) {
      this.userStore.completeGoogleSignIn(token);
      history.replaceState(null, '', window.location.pathname);
    }

    this.router.navigateByUrl('/');
  }
}
