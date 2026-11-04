import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { DialogModule } from 'primeng/dialog';
import { RbacService } from '../../../core/services/rbac.service';
import { ToastService } from '../../../core/services/toast.service';
import { NotificationService } from '../../../core/services/notification.service';
import { RbacUser, UserStatus } from '../../../core/models/rbac.model';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { environment } from '../../../../environments/environment';

type Mode = 'add' | 'edit';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    MultiSelectModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './user-management.html',
  styleUrl: './user-management.scss',
})
export class UserManagementComponent implements OnInit {
  private readonly rbac = inject(RbacService);
  private readonly toast = inject(ToastService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly confirm = inject(ConfirmationService);

  readonly formError = signal<string | null>(null);
  readonly users = this.rbac.users;
  readonly roles = this.rbac.roles;
  readonly roleByCode = this.rbac.roleByCode;
  readonly loading = signal(true);
  readonly query = signal<string>('');
  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.users().filter(u =>
      !q
        ? true
        : u.username.toLowerCase().includes(q)
        || u.email.toLowerCase().includes(q)
        || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
    );
  });

  readonly showDialog = signal(false);
  readonly mode = signal<Mode>('add');
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);
  showPassword = false;

  // Flag provenant de l'environment
  private readonly enableEmailSending = environment.enableEmailSending ?? false;

  readonly form = this.fb.nonNullable.group({
    emailLocal: this.fb.control('', [
      Validators.required,
      Validators.minLength(2),
      Validators.pattern(/^[a-zA-Z0-9._-]+$/)
    ]),
    firstName: this.fb.control('', [Validators.required]),
    lastName: this.fb.control('', [Validators.required]),
    password: this.fb.control(''),
    roleCodes: this.fb.control<string[]>([], [Validators.minLength(1)]),
    status: this.fb.control<UserStatus>('ACTIVE'),
  });

  ngOnInit(): void {
    this.rbac.ensureLoaded().finally(() => this.loading.set(false));
  }

  get passwordRequired(): boolean {
    return this.mode() === 'add';
  }

  private buildEmail(local: string): string {
    return `${local.trim().toLowerCase()}@zitounatakaful.com`;
  }

  openAdd(): void {
    this.formError.set(null);
    this.mode.set('add');
    this.editingId.set(null);

    this.form.reset({
      emailLocal: '',
      firstName: '',
      lastName: '',
      password: '12345678',
      roleCodes: [],
      status: 'ACTIVE',
    });

    this.form.get('password')!.setValidators([
      Validators.required,
      Validators.minLength(8)
    ]);
    this.form.get('password')!.updateValueAndValidity();

    this.form.get('firstName')!.valueChanges.subscribe(() => this.updateEmailLocal());
    this.form.get('lastName')!.valueChanges.subscribe(() => this.updateEmailLocal());

    this.showDialog.set(true);
  }

  private updateEmailLocal(): void {
    const firstName = (this.form.get('firstName')?.value ?? '').trim().toLowerCase();
    const lastName = (this.form.get('lastName')?.value ?? '').trim().toLowerCase();

    if (!firstName && !lastName) {
      this.form.get('emailLocal')?.setValue('', { emitEvent: false });
      return;
    }

    const generated = [firstName, lastName]
      .filter(Boolean)
      .join('.')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9._-]/g, '');

    this.form.get('emailLocal')?.setValue(generated, { emitEvent: false });
  }

  openEdit(u: RbacUser): void {
    this.formError.set(null);
    this.mode.set('edit');
    this.editingId.set(u.id);

    const localPart = u.email.split('@')[0] ?? '';

    this.form.get('password')!.clearValidators();
    this.form.get('password')!.updateValueAndValidity();

    this.form.setValue({
      emailLocal: localPart,
      firstName: u.firstName,
      lastName: u.lastName,
      password: '',
      roleCodes: [...u.roleCodes],
      status: u.status,
    });

    this.showDialog.set(true);
  }

  onHideDialog(): void {
    this.showDialog.set(false);
    this.form.reset();
    this.formError.set(null);
  }

  onToggleStatusInput(): void {
    const current = this.form.getRawValue().status ?? 'ACTIVE';
    this.form.patchValue({ status: current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.formError.set(null);

    const raw = this.form.getRawValue();
    const fullEmail = this.buildEmail(raw.emailLocal ?? '');
    const firstName = (raw.firstName ?? '').trim();
    const lastName = (raw.lastName ?? '').trim();

    const payload = {
      username: fullEmail,
      email: fullEmail,
      firstName,
      lastName,
      password: raw.password || '12345678',
      roleCodes: (raw.roleCodes ?? []) as string[],
      status: (raw.status ?? 'ACTIVE') as UserStatus,
    };

    this.saving.set(true);
    const done = () => this.saving.set(false);

    if (this.mode() === 'add') {
      this.rbac.createUserFromForm(payload).subscribe({
        next: () => {
          if (this.enableEmailSending) {
            this.notification.sendCredentials(fullEmail, fullEmail, payload.password).subscribe({
              next: () => {
                this.toast.success(
                  'Utilisateur créé',
                  `${payload.firstName} ${payload.lastName} – Email envoyé`
                );
              },
              error: () => {
                this.toast.warn(
                  'Utilisateur créé',
                  'Créé avec succès, mais l\'email n\'a pas pu être envoyé'
                );
              }
            });
          } else {
            this.toast.success(
              'Utilisateur créé',
              `${payload.firstName} ${payload.lastName}`
            );
          }

          this.showDialog.set(false);
          this.form.reset();
        },
        error: (err) => {
          this.formError.set(this.getErrorMessage(err));
          done();
        },
        complete: done,
      });
      return;
    }

    // ===== MODE EDIT =====
    const id = this.editingId();
    if (!id) {
      done();
      return;
    }

    const patch: Partial<RbacUser> = {
      username: fullEmail,
      email: fullEmail,
      firstName: payload.firstName,
      lastName: payload.lastName,
      roleCodes: payload.roleCodes,
      status: payload.status,
    };

    this.rbac.updateUser(id, patch).subscribe({
      next: (updated) => {
        if (raw.password && raw.password.length >= 8 && updated) {
          this.rbac.changeUserPassword(id, raw.password).subscribe({
            error: (e) => this.toast.error('Erreur MDP', this.getErrorMessage(e)),
          });
        }
        this.toast.success('Utilisateur mis à jour', `${payload.firstName} ${payload.lastName}`);
        this.showDialog.set(false);
        this.form.reset();
      },
      error: (err) => {
        this.formError.set(this.getErrorMessage(err));
        done();
      },
      complete: done,
    });
  }

  private getErrorMessage(err: any): string {
    if (err.status === 0) {
      return 'Impossible de contacter le serveur.';
    }
    if (err.status === 400) {
      return err?.error?.message || 'Données invalides (vérifiez les champs).';
    }
    if (err.status === 409) {
      return 'Cet email / identifiant existe déjà.';
    }
    return err?.error?.message || err?.message || 'Une erreur est survenue.';
  }

 onToggleStatus(u: RbacUser): void {
   const next: UserStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
   this.confirm.confirm({
     message: next === 'INACTIVE'
       ? `Désactiver ${u.firstName} ${u.lastName} ?`
       : `Réactiver ${u.firstName} ${u.lastName} ?`,
     header: next === 'INACTIVE' ? 'Désactivation' : 'Réactivation',
     icon: 'pi pi-exclamation-triangle',
     acceptLabel: 'Oui',
     rejectLabel: 'Non',
     accept: () => {
       this.rbac.setUserStatus(u.id, next).subscribe({
         next: () => this.toast.success(next === 'INACTIVE' ? 'Utilisateur désactivé' : 'Utilisateur réactivé'),
         error: (err) => this.toast.error('Erreur', this.getErrorMessage(err)),
       });
     }
   });
 }

 onDelete(u: RbacUser): void {
   this.confirm.confirm({
     message: `Supprimer définitivement ${u.firstName} ${u.lastName} ?`,
     header: "Supprimer l'utilisateur",
     icon: 'pi pi-info-circle',
     acceptLabel: 'Oui',
     rejectLabel: 'Non',
     accept: () => {
       this.rbac.deleteUser(u.id).subscribe({
         next: () => this.toast.success('Utilisateur supprimé'),
         error: (err) => this.toast.error('Erreur', this.getErrorMessage(err)),
       });
     }
   });
 }

 onResetPassword(u: RbacUser): void {
   this.confirm.confirm({
     message: `Réinitialiser le mot de passe de ${u.firstName} ${u.lastName} ?`,
     header: 'Réinitialisation du mot de passe',
     icon: 'pi pi-key',
     acceptLabel: 'Oui',
     rejectLabel: 'Non',
     accept: () => {
       const temp = '12345678';
       this.rbac.changeUserPassword(u.id, temp).subscribe({
         next: () => {
           if (this.enableEmailSending) {
             this.notification.sendCredentials(u.email, u.username, temp).subscribe();
             this.toast.info(
               'Mot de passe réinitialisé',
               `Nouveau mot de passe : ${temp} (email envoyé)`
             );
           } else {
             this.toast.info(
               'Mot de passe réinitialisé',
               `Nouveau mot de passe : ${temp}`
             );
           }
         },
         error: (err) => this.toast.error('Erreur', this.getErrorMessage(err)),
       });
     }
   });
 }
}