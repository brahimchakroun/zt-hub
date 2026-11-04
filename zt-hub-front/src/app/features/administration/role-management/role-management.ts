import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { BadgeModule } from 'primeng/badge';
import { MessageService, ConfirmationService } from 'primeng/api';
import { RbacService } from '../../../core/services/rbac.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageCode, Role } from '../../../core/models/rbac.model';

type Mode = 'add' | 'edit';

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    BadgeModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './role-management.html',
  styleUrl: './role-management.scss',
})
export class RoleManagementComponent implements OnInit {
  private readonly rbac = inject(RbacService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly confirm = inject(ConfirmationService);

  readonly roles = this.rbac.roles;
  readonly users = this.rbac.users;
  readonly pagesGrouped = computed(() => this.rbac.pageGrouped());
  readonly pageCatalog = computed(() => this.rbac.pageCatalog());

  readonly loading = signal(true);
  readonly query = signal<string>('');
  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.roles().filter(r =>
      !q
        ? true
        : r.name.toLowerCase().includes(q)
        || r.code.toLowerCase().includes(q)
        || (r.description ?? '').toLowerCase().includes(q)
    );
  });

  /** Combien d'utilisateurs portent un rôle donné (compte affiché en badge) */
  readonly userCountPerRole = computed(() => {
    const counts = new Map<string, number>();
    for (const u of this.users()) for (const rc of u.roleCodes) {
      counts.set(rc, (counts.get(rc) ?? 0) + 1);
    }
    return counts;
  });

  readonly showDialog = signal(false);
  readonly mode = signal<Mode>('add');
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    code:        this.fb.control('',    [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Z0-9_\-]+$/)]),
    name:        this.fb.control('',    [Validators.required, Validators.minLength(2)]),
    description: this.fb.control(''),
    pageAccess:  this.fb.control<PageCode[]>([], [Validators.minLength(1)]),
  });

  ngOnInit(): void {
    this.rbac.ensureLoaded().finally(() => this.loading.set(false));
  }

  // ----- UI actions
  openAdd(): void {
    this.mode.set('add');
    this.editingId.set(null);
    this.form.setValue({ code: '', name: '', description: '', pageAccess: [] });
    this.form.controls.code.enable();
    this.showDialog.set(true);
  }

  openEdit(r: Role): void {
    this.mode.set('edit');
    this.editingId.set(r.id);
    this.form.setValue({
      code: r.code,
      name: r.name,
      description: r.description ?? '',
      pageAccess: [...r.pageAccess],
    });
    this.form.controls.code.disable();
    this.showDialog.set(true);
  }

  onHideDialog(): void {
    this.showDialog.set(false);
    this.form.controls.code.enable();
    this.form.reset();
  }

  hasPage(code: PageCode): boolean {
    const arr = this.form.controls.pageAccess.value ?? [];
    return Array.isArray(arr) && (arr as PageCode[]).includes(code);
  }

  togglePage(code: PageCode, event: Event): void {
    event.preventDefault();
    const prev: PageCode[] = (this.form.controls.pageAccess.value ?? []) as PageCode[];
    const next = prev.includes(code)
      ? prev.filter(c => c !== code)
      : [...prev, code];
    this.form.controls.pageAccess.setValue(next);
  }

  selectAllPages(): void {
    this.form.controls.pageAccess.setValue(this.pageCatalog().map(p => p.code));
  }

  clearPages(): void {
    this.form.controls.pageAccess.setValue([]);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const v = {
      code:        (raw.code ?? '').trim(),
      name:        (raw.name ?? '').trim(),
      description: (raw.description ?? '').trim() || undefined,
      pageAccess:  (raw.pageAccess ?? []) as PageCode[],
    };
    if (!v.code || !v.name) {
      this.toast.error('Erreur', 'Veuillez renseigner un code et un nom valides.');
      return;
    }
    this.saving.set(true);
    const done = () => this.saving.set(false);

    if (this.mode() === 'add') {
      if (this.roles().some(r => r.code === v.code)) {
        this.toast.error('Erreur', `Un rôle existe déjà avec le code "${v.code}".`);
        done();
        return;
      }
      this.rbac.createRole({
        code: v.code,
        name: v.name,
        description: v.description,
        pageAccess: v.pageAccess,
      }).subscribe({
        next: () => {
          this.toast.success('Rôle créé', v.name);
          this.showDialog.set(false);
        },
        error: (err) => { this.toast.error('Erreur', err?.message ?? 'Création échouée.'); done(); },
        complete: done,
      });
      return;
    }
    const id = this.editingId();
    if (!id) { done(); return; }
    this.rbac.updateRole(id, {
      name: v.name,
      description: v.description,
      pageAccess: v.pageAccess,
    }).subscribe({
      next: () => {
        this.toast.success('Rôle mis à jour', v.name);
        this.showDialog.set(false);
      },
      error: (err) => { this.toast.error('Erreur', err?.message ?? 'Mise à jour échouée.'); done(); },
      complete: done,
    });
  }

  onDelete(r: Role): void {
    const affected = this.userCountPerRole().get(r.code) ?? 0;
    const confirmMsg = affected > 0
      ? `Supprimer "${r.name}" ? Ce rôle est actuellement attribué à ${affected} utilisateur(s).`
      : `Supprimer définitivement le rôle "${r.name}" ?`;

    this.confirm.confirm({
      message: confirmMsg,
      header: 'Supprimer le rôle',
      icon: 'pi pi-info-circle',
      accept: () => {
        this.rbac.deleteRole(r.id).subscribe({
          next: () => this.toast.success('Rôle supprimé', r.name),
          error: (err) => this.toast.error('Erreur', err?.message ?? 'Suppression échouée.'),
        });
      }
    });
  }
}
