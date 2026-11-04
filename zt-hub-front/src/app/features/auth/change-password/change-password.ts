import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PasswordModule } from 'primeng/password';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PasswordModule],
  templateUrl: './change-password.html',
  styleUrl: './change-password.scss'
})
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);
  loading = false;

  form = this.fb.nonNullable.group({
    current: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirm: ['', Validators.required]
  });

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    if (v.newPassword !== v.confirm) {
      this.toast.error('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    this.loading = true;
    this.auth.changePassword(v.current, v.newPassword).subscribe({
      next: (res) => {
        this.toast.success('Succès', res.message);
        this.router.navigate(['/auth/profile']);
      },
      complete: () => { this.loading = false; }
    });
  }
}
