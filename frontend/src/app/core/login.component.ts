import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from './auth.service';
import { LanguageService } from './language.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, MatIconModule],
  styles: [`
    .login-page {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: clamp(1rem, 2.4vw, 2rem);
      background: var(--app-bg);
    }

    .login-layout {
      width: min(440px, 100%);
    }

    .login-card {
      width: 100%;
      border: 1px solid var(--app-border);
      border-radius: 20px;
      background: var(--app-surface);
      box-shadow: var(--app-shadow);
      padding: clamp(1.1rem, 2.4vw, 1.75rem);
    }

    .login-head h2 {
      margin: 0;
      color: var(--app-text);
      font-size: 1.35rem;
      font-weight: 800;
      text-align: center;
    }

    .login-head p {
      margin: 0.45rem 0 1rem;
      color: var(--app-muted);
      line-height: 1.45;
      text-align: center;
    }

    .login-language {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 7px;
      margin-bottom: 12px;
      color: var(--app-muted);
      font-size: 12px;
      font-weight: 650;
    }

    .login-language select {
      border: 1px solid var(--app-border);
      border-radius: 7px;
      background: #ffffff;
      color: var(--app-text);
      font: inherit;
      padding: 5px 7px;
    }

    .login-form {
      display: grid;
      gap: 0.9rem;
    }

    .login-field {
      display: grid;
      gap: 0.35rem;
      justify-self: center;
      width: 88%;
    }

    .login-field > span {
      color: #374151;
      font-size: 0.86rem;
      font-weight: 600;
      padding-left: 0.05rem;
    }

    .login-input,
    .login-password-wrap {
      box-sizing: border-box;
      width: 100%;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
      color: var(--app-text);
      font: inherit;
      font-size: 0.95rem;
      min-height: 42px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .login-input {
      padding: 0 0.75rem;
    }

    .login-password-wrap {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      overflow: hidden;
    }

    .login-password-wrap input {
      min-width: 0;
      height: 40px;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--app-text);
      font: inherit;
      padding: 0 0.75rem;
    }

    .login-input:focus,
    .login-password-wrap:focus-within {
      border-color: var(--app-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
      outline: none;
    }

    .password-toggle {
      display: inline-grid;
      place-items: center;
      width: 2.3rem;
      height: 2.3rem;
      margin-right: 0.2rem;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--app-muted);
      cursor: pointer;
    }

    .password-toggle:hover {
      background: var(--app-primary-soft);
      color: var(--app-primary-strong);
    }

    .password-toggle mat-icon {
      width: 19px;
      height: 19px;
      font-size: 19px;
      line-height: 19px;
    }

    .login-actions {
      display: grid;
      gap: 0.7rem;
      justify-self: center;
      margin-top: 0.25rem;
      width: 88%;
    }

    .login-submit {
      width: 100%;
      min-height: 42px;
      justify-content: center;
      border-radius: 8px;
    }

    .login-error {
      box-sizing: border-box;
      justify-self: center;
      width: 88%;
      margin: 0;
      border: 1px solid #fecaca;
      border-radius: 8px;
      background: #fef2f2;
      color: #991b1b;
      font-size: 0.88rem;
      font-weight: 600;
      line-height: 1.35;
      padding: 0.65rem 0.75rem;
    }

  `],
  template: `
    <main class="login-page">
      <div class="login-layout">
        <section class="login-card">
          <div class="login-language">
            <span>{{ language.t('language.label') }}</span>
            <select [ngModel]="language.language()" (ngModelChange)="language.setLanguage($event)" [attr.aria-label]="language.t('language.label')">
              <option value="ro">{{ language.t('language.ro') }}</option>
              <option value="en">{{ language.t('language.en') }}</option>
            </select>
          </div>
          <div class="login-head">
            <h2>{{ language.t('login.title') }}</h2>
            <p>{{ language.t('login.subtitle') }}</p>
          </div>

          <form class="login-form" [formGroup]="form" (ngSubmit)="submit()">
            <label class="login-field">
              <span>{{ language.t('login.username') }}</span>
              <input class="login-input" type="text" formControlName="username" autocomplete="username" required>
            </label>

            <label class="login-field">
              <span>{{ language.t('login.password') }}</span>
              <span class="login-password-wrap">
                <input [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" required>
                <button
                  class="password-toggle"
                  type="button"
                  [attr.aria-label]="showPassword() ? language.t('login.hidePassword') : language.t('login.showPassword')"
                  (click)="togglePassword()">
                  <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </span>
            </label>

            @if (errorMessage()) {
              <p class="login-error">{{ errorMessage() }}</p>
            }

            <div class="login-actions">
              <button class="toolbar-button toolbar-primary-button login-submit" type="submit" [disabled]="form.invalid || isSubmitting()">
                {{ isSubmitting() ? language.t('login.submitting') : language.t('login.submit') }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  language = inject(LanguageService);
  showPassword = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');

  form = this.fb.nonNullable.group({
    username: ['admin', Validators.required],
    password: ['admin123', Validators.required]
  });

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    const { username, password } = this.form.getRawValue();
    this.errorMessage.set('');
    this.isSubmitting.set(true);
    this.auth.login(username, password).subscribe({
      next: () => void this.router.navigate(['/persons']),
      error: () => {
        this.isSubmitting.set(false);
        this.errorMessage.set(this.language.t('login.error'));
      }
    });
  }

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }
}
