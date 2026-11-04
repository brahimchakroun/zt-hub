import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

const DEFAULT_URL = '/dashboard';

// ===================== VALIDATOR =====================
function zitounaEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null; // laisse Validators.required gérer le champ vide
    }

    const isValid = value.toLowerCase().endsWith('@zitounatakaful.com');
    return isValid ? null : { zitounaEmail: true };
  };
}
// =====================================================

/** N'accepte que les chemins internes (protection contre les open redirects). */
function isSafeReturnUrl(url: string | null): url is string {
  return (
    !!url &&
    url.startsWith('/') &&
    !url.startsWith('//') &&
    !url.startsWith('/auth')
  );
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CardModule,
    MessageModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  usernameFocused = false;
  passwordFocused = false;

  form = this.fb.nonNullable.group({
    username: ['', [
      Validators.required,
      Validators.email,
      zitounaEmailValidator()
    ]],
    password: ['', Validators.required]
  });

  ngOnInit(): void {
    // Message selon la raison de la redirection (posée par l'intercepteur)
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason === 'expired') {
      this.errorMessage.set('Votre session a expiré. Veuillez vous reconnecter.');
    } else if (reason === 'unreachable') {
      this.errorMessage.set('Le serveur ne répond pas. Réessayez dans quelques instants.');
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: (res) => {
        // La session doit être posée AVANT la navigation, sinon le authGuard
        // de la page cible renverrait vers le login.
        this.auth.setSession(res);
        this.toast.success('Connexion réussie', `Bienvenue ${res.user.firstName}`);

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(isSafeReturnUrl(returnUrl) ? returnUrl : DEFAULT_URL);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(this.getErrorMessage(err));
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  onForgotPassword(event: Event): void {
    event.preventDefault();
    this.router.navigate(['/auth/forgot-password']);
  }

  private getErrorMessage(err: any): string {
    console.error('[login] Erreur de connexion', err);
    if (err.status === 0) {
      return 'Impossible de contacter le serveur. Vérifiez votre connexion réseau.';
    }

    if (err.status === 401) {
      return 'Email ou mot de passe incorrect.';
    }

    if (err.status === 403) {
      return 'Accès refusé. Votre compte est peut-être désactivé.';
    }

    const backendMessage =
      err?.error?.message ||
      err?.error?.error ||
      err?.error?.detail;

    if (backendMessage && typeof backendMessage === 'string') {
      return backendMessage;
    }

    return 'Une erreur est survenue. Veuillez réessayer.';
  }
}