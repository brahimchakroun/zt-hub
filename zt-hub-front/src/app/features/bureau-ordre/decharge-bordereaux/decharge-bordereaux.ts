import {
    Component, OnDestroy, AfterViewInit, ViewChild, ElementRef, inject, signal, ChangeDetectorRef
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DechargeService } from '../services/decharge.service';
import { DechargeStep } from '../models/decharge.model';
import { ToastService } from '../../../core/services/toast.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

const QR_READER_EL_ID = 'qr-reader';

@Component({
    selector: 'app-decharge-bordereaux',
    standalone: true,
    imports: [
        CommonModule,
        DatePipe,
        FormsModule,
        ButtonModule,
        ProgressSpinnerModule,
        ToastModule,
    ],
    providers: [MessageService],
    templateUrl: './decharge-bordereaux.html',
    styleUrl: './decharge-bordereaux.scss'
})
export class DechargeBordereauxComponent implements AfterViewInit, OnDestroy {
    private readonly dechargeService = inject(DechargeService);
    private readonly toastService = inject(ToastService);
    private readonly cdr = inject(ChangeDetectorRef);

    @ViewChild('qrReader') qrReaderRef!: ElementRef<HTMLDivElement>;
    @ViewChild('manualInput') manualInputRef!: ElementRef<HTMLInputElement>;

    readonly step = signal<DechargeStep>('scan');
    readonly numeroBordereau = signal('');
    readonly rawContent = signal('');
    readonly errorMessage = signal('');
    readonly successData = signal<{
        numeroBordereau: string; reference?: string; processedAt?: string; rpaRequestId?: string | null;
    } | null>(null);

    manualValue = '';
    /** Skeleton visible pendant l'initialisation du scanner (feedback immédiat). */
    readonly scannerLoading = signal(true);

    private html5QrCode: Html5Qrcode | null = null;
    private isScanning = false;
    private destroyed = false;
    private scannerStartTimeoutId: number | null = null;

    ngAfterViewInit(): void {
        if (this.step() === 'scan') {
            this.scheduleScannerStart(150);
        }
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        this.clearScannerStartTimeout();
        this.stopScanner().catch(() => void 0);
    }

    // ===================================================================
    // Scanner QR
    // ===================================================================

    private scheduleScannerStart(delayMs: number): void {
        this.clearScannerStartTimeout();
        this.scannerStartTimeoutId = window.setTimeout(() => this.ensureScannerStarts(), delayMs);
    }

    private clearScannerStartTimeout(): void {
        if (this.scannerStartTimeoutId != null) {
            clearTimeout(this.scannerStartTimeoutId);
            this.scannerStartTimeoutId = null;
        }
    }

    /**
     * Attend que l'élément DOM #qr-reader existe réellement (cas de
     * re-création via @if après step.set('scan')) puis démarre le scanner.
     */
    private async ensureScannerStarts(attemptsLeft = 15): Promise<void> {
        if (this.destroyed) return;

        // Force un cycle de détection pour que le @if recrée le div #qr-reader
        this.cdr.markForCheck();
        this.cdr.detectChanges();

        const el = document.getElementById(QR_READER_EL_ID);
        if (!el) {
            if (attemptsLeft <= 0) {
                this.toastService.error(
                    'Lecteur indisponible',
                    'Impossible de préparer le lecteur QR. Utilisez la saisie manuelle.'
                );
                this.scannerLoading.set(false);
                return;
            }
            // Réessaie par tranches de 100ms (max ~1.5s) — sans consommer de CPU
            this.scheduleScannerStart(100);
            return;
        }
        await this.startScanner();
    }

    async startScanner(): Promise<void> {
        if (this.destroyed) return;

        // Sécurité anti double-démarrage : on force l'arrêt complet avant
        if (this.isScanning || this.html5QrCode) {
            await this.stopScanner();
        }

        const el = document.getElementById(QR_READER_EL_ID);
        if (!el) {
            // DOM pas encore prêt → on repasse par le polling
            this.scheduleScannerStart(100);
            return;
        }

        this.scannerLoading.set(true);

        try {
            this.html5QrCode = new Html5Qrcode(QR_READER_EL_ID, {
                verbose: false,
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
            });

            await this.html5QrCode.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => this.onScanSuccess(decodedText),
                () => { /* ignore frame errors */ }
            );
            this.isScanning = true;
        } catch (err: any) {
            const msg = err?.message?.includes('Permission')
                ? 'Accès caméra refusé. Autorisez la caméra ou saisissez le n° manuellement.'
                : 'Impossible de démarrer la caméra. Vérifiez HTTPS / les permissions.';
            this.toastService.error('Caméra indisponible', msg);
            this.errorMessage.set(msg);
            this.step.set('error');
        } finally {
            if (!this.destroyed) this.scannerLoading.set(false);
        }
    }

    async stopScanner(): Promise<void> {
        this.clearScannerStartTimeout();
        if (this.html5QrCode && this.isScanning) {
            try {
                // html5-qrcode isScanning évite de stopper 2 fois
                const instance: any = this.html5QrCode;
                if (typeof instance.isScanning === 'function' && instance.isScanning() === false) {
                    // déjà arrêté
                } else {
                    await this.html5QrCode.stop();
                }
                await this.html5QrCode.clear();
            } catch { /* ignore */ }
            this.isScanning = false;
        }
        this.html5QrCode = null;
        this.scannerLoading.set(false);
    }

    private onScanSuccess(decodedText: string): void {
        if (this.step() !== 'scan') return;
        this.stopScanner().catch(() => void 0);
        this.rawContent.set(decodedText);
        const numero = this.extractNumeroBordereau(decodedText);
        this.numeroBordereau.set(numero);
        this.step.set('confirm');
        this.toastService.info('QR détecté', `Bordereau : ${numero}`);
    }

    private extractNumeroBordereau(raw: string): string {
        const trimmed = raw.trim();
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed.numeroBordereau) return String(parsed.numeroBordereau);
            if (parsed.numero_bordereau) return String(parsed.numero_bordereau);
        } catch { /* not JSON */ }

        const match = trimmed.match(/(?:BORD|BRD|BOR)[-\s]?([A-Z0-9\-]+)/i)
            || trimmed.match(/([A-Z0-9]{6,})/);
        return match ? (match[1] || match[0]) : trimmed;
    }

    // ===================================================================
    // Saisie manuelle (fallback mobile + desktop)
    // ===================================================================

    onManualSubmit(value: string): void {
        const v = value?.trim();
        if (!v) return;
        this.numeroBordereau.set(v);
        this.rawContent.set(v);
        this.step.set('confirm');
        this.stopScanner().catch(() => void 0);
        this.toastService.info('Saisie manuelle', `Bordereau : ${v}`);
    }

    onManualKeypress(event: Event): void {
        if ((event as KeyboardEvent).key === 'Enter') {
            event.preventDefault();
            this.onManualSubmit(this.manualValue);
        }
    }

    // ===================================================================
    // Confirmation → soumission RPA
    // ===================================================================

    confirmDecharge(): void {
        const numero = this.numeroBordereau().trim();
        if (!numero) {
            this.errorMessage.set('Numéro de bordereau manquant.');
            this.step.set('error');
            return;
        }

        this.step.set('loading');

        this.dechargeService.submitDecharge({
            numeroBordereau: numero,
            rawContent: this.rawContent()
        }).subscribe({
            next: (res) => {
                if (res.success) {
                    this.successData.set({
                        numeroBordereau: res.data?.numeroBordereau || numero,
                        reference: res.data?.reference,
                        processedAt: res.data?.processedAt,
                        rpaRequestId: res.data?.rpaRequestId,
                    });
                    this.step.set('success');
                    this.toastService.success(
                        'Décharge confirmée',
                        `Référence ${this.successData()?.reference ?? numero}`
                    );
                } else {
                    const msg = res.error || res.message || 'Erreur lors de la décharge.';
                    this.errorMessage.set(msg);
                    this.step.set('error');
                    this.toastService.error('Échec décharge', msg);
                }
            },
            error: (err) => {
                const msg =
                    err?.error?.error ||
                    err?.error?.message ||
                    err?.message ||
                    'Erreur réseau ou serveur.';
                this.errorMessage.set(msg);
                this.step.set('error');
                this.toastService.error('Erreur', msg);
            }
        });
    }

    cancelConfirm(): void {
        this.resetToScan();
    }

    // ===================================================================
    // Succès / Erreur → suivant
    // ===================================================================

    scanNext(): void {
        this.resetToScan();
    }

    private resetToScan(): void {
        // 1) on s'assure qu'aucun scan ne tourne encore
        this.stopScanner().finally(() => {
            if (this.destroyed) return;

            // 2) reset complet de l'état
            this.numeroBordereau.set('');
            this.rawContent.set('');
            this.errorMessage.set('');
            this.successData.set(null);
            this.manualValue = '';

            // 3) afficher le template scan (→ créé un nouveau div #qr-reader)
            this.step.set('scan');

            // 4) attendre que le DOM du @if soit réellement prêt, puis démarrer
            this.scheduleScannerStart(180);
        });
    }
}
