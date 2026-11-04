import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { LettreEpargneService } from './lettre-epargne.service';
import { SafeUrlPipe } from '../../../core/pipes/safe-url.pipe';

@Component({
  selector: 'app-lettre-epargne',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, SafeUrlPipe],
  templateUrl: './lettre-epargne.component.html',
  styleUrl: './lettre-epargne.component.scss',
})
export class LettreEpargneComponent {
  private readonly service = inject(LettreEpargneService);

  numeroPolice = '';
  isLoading = false;
  readonly progress = signal(0);
  statusMessage = '';
  statusType: 'error' | 'success' | null = null;
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private progressTimeout: ReturnType<typeof setTimeout> | null = null;
  pdfUrl: string | null = null;
  private currentPdfUrl: string | null = null; // Pour le nettoyage mémoire
  genererLettre(): void {
    const numeroPolice = this.numeroPolice.trim();
    if (!numeroPolice || this.isLoading) {
      return;
    }

    // 1. Activation immédiate de l'état de chargement
    this.isLoading = true;
    this.statusMessage = '';
    this.progress.set(10);

    if (this.progressTimeout) {
      clearTimeout(this.progressTimeout);
      this.progressTimeout = null;
    }

    // 2. Lancement de l'animation visuelle de la barre (progression artificielle lissée)
    this.progressInterval = setInterval(() => {
      if (this.progress() < 90) {
        this.progress.update(value => value + 5);
      }
    }, 150);

    // 3. UTILISATION D'UN TIMEOUT (0ms) : Laisse le navigateur respirer et peindre le DOM (progress bar) 
    // avant d'exécuter l'appel réseau synchrone/asynchrone lourd.
    setTimeout(() => {
      this.service.downloadPdfLettre(numeroPolice).subscribe({
       next: (data) => {
          this.progress.set(100);

          if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
          }

          // Nettoyer l'ancien URL si un PDF avait déjà été généré
          if (this.currentPdfUrl) {
            URL.revokeObjectURL(this.currentPdfUrl);
          }

          const pdfBlob = new Blob([data], { type: 'application/pdf' });
          this.currentPdfUrl = URL.createObjectURL(pdfBlob);
          
          // On assigne l'URL au signal ou à la propriété pour l'afficher dans le HTML
          this.pdfUrl = this.currentPdfUrl; 
          
          this.showStatus('La lettre a été générée ci-dessous.', 'success');
          this.finishProgress();
        },
        error: (error: unknown) => {
          console.error('Erreur lors du téléchargement de la lettre PDF :', error);
          
          if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
          }

          this.progress.set(0);
          this.showStatus('Impossible de générer la lettre. Vérifiez le numéro de police et réessayez.', 'error');
          this.finishProgress();
        },
      });
    }, 50); // Petit délai de 50ms garantissant l'affichage de la progress bar
  }

  private finishProgress(): void {
    // Délai pour laisser la barre à 100% visible un court instant avant de masquer le bloc
    this.progressTimeout = setTimeout(() => {
      this.isLoading = false;
      this.progressTimeout = null;
    }, 600);
  }

  private showStatus(message: string, type: 'error' | 'success'): void {
    this.statusMessage = message;
    this.statusType = type;
  }
}