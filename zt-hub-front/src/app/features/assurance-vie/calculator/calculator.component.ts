import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';

import { ProgressBarModule } from 'primeng/progressbar';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { ToastService } from '../../../core/services/toast.service';
import { VieCalculatorService } from './calculator.service';
import { EpargneCalculRows, ProductMeta, ProductType, QuittanceRow, TAUX_PB } from './calculator.model';
import { SelectModule } from 'primeng/select';

type StatusKind = 'success' | 'error' | 'warning' | 'info' | null;

@Component({
  selector: 'app-vie-calculator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    ProgressBarModule,
    TableModule,
    TagModule,SelectModule
  ],
  templateUrl: './calculator.component.html',
  styleUrl: './calculator.component.scss',
})
export class VieCalculatorComponent {
  private readonly svc = inject(VieCalculatorService);
  private readonly toast = inject(ToastService);

  readonly products: ProductMeta[] = this.svc.products;
  readonly tauxPBList = Object.entries(TAUX_PB)
    .map(([annee, taux]) => ({ annee: +annee, taux }))
    .sort((a, b) => a.annee - b.annee);

  readonly selectedProduct = signal<ProductType>('mothmer');
  readonly statusMessage = signal<{ text: string; type: Exclude<StatusKind, null> } | null>(null);
  readonly progress = signal(0);
  readonly showProgress = signal(false);
  readonly isLoadingData = signal(false);
  
  numeroPoliceInput = '';
  fraisDeGestionInput: number | null = 1.2;
  manualDateInput = '';
  manualDateStatus = '';
  todayLabel = '';
  showProductSelection = true;           // affiche la grille au démarrage

  onFraisChange(value: any) {
        // Si le champ est vide, on remet à null
        if (value === '' || value === null || value === undefined) {
          this.fraisDeGestionInput = null;
          return;
        }

        // Convertit la valeur en nombre (ignore le texte non numérique)
        let num = Number(value);

        // Si ce n'est pas un nombre valide (NaN), on réinitialise ou on ignore
        if (isNaN(num)) {
          this.fraisDeGestionInput = null;
          return;
        }

        // Application des limites (0 à 100)
        if (num > 100) {
          num = 100;
        } else if (num < 0) {
          num = 0;
        }

        // Mise à jour de la variable liée
        this.fraisDeGestionInput = num;
      }
  get fraisModifiable(): boolean {
    return this.selectedProduct()=='dirassa';
  }
  get selectedProductBinding(): ProductType {
    return this.selectedProduct();
  }
  set selectedProductBinding(v: ProductType) {
    if (v && v !== this.selectedProduct()) {
      this.onProductChange(v);
    }
  }

  readonly snapshot = this.svc.snapshot;
  readonly rawData  = this.svc.rawData;
  readonly data     = this.svc.data;
  readonly decisionMade = this.svc.decisionMade;
  readonly etape1_4Complete = this.svc.etape1_4Complete;
  readonly ecPBComplete     = this.svc.ecPBComplete;
  readonly isCalculated     = computed(() => {
    if(this.currentProductConfig().isOnlyApi) {
      return this.epargneResult()?.calculs.some(r => typeof r.ecSansPb === 'number');
    }
    return this.svc.isCalculated();
      }
  ); 
    
  readonly highlightedRows  = this.svc.highlightedRows;
  readonly contrat  = this.svc.contrat;
  readonly agence  = this.svc.agence;
  readonly todayStr = this.svc.formatDate(this.svc.today());
  readonly hasData = this.svc.hasData;
  readonly  isOnlyApi = computed(() => this.currentProductConfig().isOnlyApi);
  readonly currentProductConfig = computed<ProductMeta>(() =>
    this.svc.getProductConfig(this.selectedProduct())
  );
  
 epargneColumns: string[] = ['Numéro quittance', 'Date de calcul', 'Contribution épargne', 'Contribution nette', 'Période courue', 'Chargement acquisition', 'EC avec PB', 'EC sans PB'];

  readonly epargneResult = this.svc.epargneResult;
  readonly  tailleTableauData = computed(() => {
    if(this.currentProductConfig().isOnlyApi) {
      return this.epargneResult()?.calculs.length || 0;
    }
    return this.rawData().length;
  });

  readonly lastDateStr = computed(() => {
     if(this.currentProductConfig().isOnlyApi) {
     
      return  this.getMaxDateCalcul(this.epargneResult()?.calculs || []);
    }
    const last = this.svc.getLastDate();
    return last ? this.svc.formatDate(last) : '-';
  });

  readonly displayedColumns = [
    'numQuittance', 'dateEffet', 'dateCalcul', 'periodeCourue',
    'contribution', 'chargementAcquisition', 'contributionNette',
    'ecAvecPB', 'ecSansPB',
  ];

  readonly stats = computed(() => {
   if(this.currentProductConfig().isOnlyApi) {
    const d = this.epargneResult()?.calculs || [];
    if (!d.length) return { totalEncaisse: 0, totalNet: 0, finalECPB: 0, finalECSansPB: 0 };
    return this.svc.computeStatsEpargne(d);
   }

    const d = this.data();
    if (!d.length) return { totalEncaisse: 0, totalNet: 0, finalECPB: 0, finalECSansPB: 0 };
    return this.svc.computeStats(d);
  });
  ngOnInit(): void {
    this.todayLabel = this.formatDate(new Date());
    this.manualDateInput = this.toDateInputValue(new Date());

  }
  onProductChange(type: ProductType): void {
    this.selectedProduct.set(type);
    this.svc.setProductType(type);
    this.svc.clear();
    this.statusMessage.set(null);
    this.manualDateStatus = '';
    this.manualDateInput = '';
  }
  get canExecute(): boolean {
    const decisionMade = this.decisionMade() ?? false;
    const etape1_4Complete = this.etape1_4Complete() ?? false;
    return decisionMade && !etape1_4Complete;
  }


  private getMaxDateCalcul(rows: EpargneCalculRows[]): string | null {
  if (!rows.length) {
    return null;
  }

  return rows.reduce((latest, current) => {
    const [d1, m1, y1] = latest.dateCalcul.split('/').map(Number);
    const [d2, m2, y2] = current.dateCalcul.split('/').map(Number);

    const dateLatest = new Date(y1, m1 - 1, d1);
    const dateCurrent = new Date(y2, m2 - 1, d2);

    return dateCurrent > dateLatest ? current : latest;
  }).dateCalcul;
}

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.showStatus('Veuillez sélectionner un fichier', 'warning');
      return;
    }
    this.isLoadingData.set(true);
    this.showStatus('Chargement du fichier en cours...', 'info');
    try {
      const { rawData, contrat, agence } = await this.svc.loadFromFile(file);
      this.svc.setProductType(this.selectedProduct());
      this.svc.setLoadedData(rawData, contrat, agence);
      this.showStatus(
        `✅ ${rawData.length} quittances chargées. Choisissez une option de date.`,
        'info'
      );
      this.toast.info('Fichier chargé', `${rawData.length} lignes`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.showStatus('Erreur : ' + msg, 'error');
      this.toast.error('Erreur chargement', msg);
    } finally {
      this.isLoadingData.set(false);
      input.value = '';
       const last = this.svc.getLastDate();
            if (last) {
              this.manualDateInput = this.toDateInputValue(last);
            }
    }
  }
  voirPdf_() {
   
    this.svc.downloadPdfLettre( '9009060011420').subscribe(blob => {
     // 1. Forcer explicitement le type application/pdf pour que le navigateur comprenne
    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
    
    // 2. Créer l'URL temporaire
    const fileURL = URL.createObjectURL(pdfBlob);
    
    // 3. Ouvrir dans un nouvel onglet
    window.open(fileURL, '_blank');
    });
  }



  async loadFromApi(): Promise<void> {
    const numeroPolice = this.numeroPoliceInput.trim();
    if (!numeroPolice) {
      this.showStatus('Veuillez saisir un numéro de police', 'warning');
      return;
    }

    if (this.isLoadingData()) return;

    this.isLoadingData.set(true);
    this.svc.setProductType(this.selectedProduct());
    this.svc.clear();

    if (this.isOnlyApi()) {
      this.showProgress.set(true);
      this.progress.set(0);
      this.showStatus('Récupération du calcul d’épargne en cours...', 'info');

      const interval = setInterval(() => {
        if (this.progress() < 90) this.progress.update(value => value + 5);
      }, 200);

      try {
        await this.svc.loadEpargneFromApi(numeroPolice);
        this.progress.set(100);
        this.showStatus('Calcul d’épargne récupéré avec succès.', 'success');
        this.toast.success('Données récupérées', 'Calcul d’épargne chargé');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.showStatus('Erreur : ' + msg, 'error');
        this.toast.error('Erreur récupération', msg);
      } finally {
        clearInterval(interval);
        this.isLoadingData.set(false);
        setTimeout(() => this.showProgress.set(false), 500);
      }
      return;
    }

    this.showStatus('Récupération des quittances en cours...', 'info');
    try {
      const { rawData, contrat, agence } = await this.svc.loadFromApi(numeroPolice);
      this.svc.setLoadedData(rawData, contrat, agence);
      this.showStatus(
        `✅ ${rawData.length} quittances chargées. Choisissez une option de date.`,
        'info'
      );
      this.toast.info('Données récupérées', `${rawData.length} lignes`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.showStatus('Erreur : ' + msg, 'error');
      this.toast.error('Erreur récupération', msg);
    } finally {
      this.isLoadingData.set(false);
      const last = this.svc.getLastDate();
      if (last) {
        this.manualDateInput = this.toDateInputValue(last);
      }
    }
  }

  chooseToday(): void {
    if (this.decisionMade()) return;
    const today = this.svc.today();
    const exists = this.rawData().some(row => {
      if (!row.dateCalcul) return false;
      return this.svc.cleanDate(row.dateCalcul).getTime() === today.getTime();
    });
    if (exists) {
      this.showStatus('⚠️ La date d\'aujourd\'hui existe déjà', 'warning');
      if (this.selectedProduct() === 'mothmer') {
        this.svc.setDecision('today', undefined);
      }
      return;
    }
    const s = this.snapshot();
    const todayRow: QuittanceRow = {
      numQuittance: this.selectedProduct() === 'mothmer' ? "AUJOURD'HUI" : '',
      dateEffet: this.selectedProduct() === 'mothmer' ? today : null,
      dateCalcul: today,
      contribution: 0,
      chargementAcquisition: 0,
      contributionNette: 0,
      codeAgence: s.agence,
      contrat: s.contrat,
      isToday: true,
    };

    let newRaw = [...s.rawData, todayRow].sort(
      (a, b) => (a.dateCalcul?.getTime() ?? 0) - (b.dateCalcul?.getTime() ?? 0)
    );

    if (this.selectedProduct() === 'mothmer') {
      const special = this.svc.addSpecialLinesForDecision(newRaw);
      newRaw = special.data;
      this.svc.highlightedRows.set(special.addedIndices);
    }

    this.svc.setDecision('today', newRaw);
    this.showStatus(`✅ Date d'aujourd'hui (${this.todayStr}) ajoutée`, 'success');
  }
/*
  chooseManualDate(): void {
    if (this.decisionMade()) return;
    const dateStr = this.manualDateInput.trim();
    if (!dateStr) {
      this.manualDateStatus = '';
      this.showStatus('Veuillez saisir une date', 'warning');
      return;
    }
    const date = this.svc.parseDateFromString(dateStr);
    if (!date) {
      this.manualDateStatus = 'Format invalide. Utilisez jj/mm/aaaa';
      this.showStatus('❌ Format invalide', 'error');
      return;
    }
    const today = this.svc.today();
    date.setHours(0, 0, 0, 0);
    if (date.getTime() > today.getTime()) {
      this.manualDateStatus = 'La date ne peut pas être dans le futur';
      this.showStatus('❌ Date dans le futur', 'error');
      return;
    }
    const lastDate = this.svc.getLastDate();
    if (lastDate) {
      const lastClean = this.svc.cleanDate(lastDate);
      if (date.getTime() <= lastClean.getTime()) {
        this.manualDateStatus = 'La date doit être > ' + this.svc.formatDate(lastClean);
        this.showStatus('❌ Date trop ancienne', 'error');
        return;
      }
    }
    const exists = this.rawData().some(row => {
      if (!row.dateCalcul) return false;
      return this.svc.cleanDate(row.dateCalcul).getTime() === date.getTime();
    });
    if (exists) {
      this.manualDateStatus = 'Cette date existe déjà';
      this.showStatus('❌ Date déjà présente', 'error');
      return;
    }
    const s = this.snapshot();
    const manualRow: QuittanceRow = {
      numQuittance: '',
      dateEffet: null,
      dateCalcul: date,
      contribution: 0,
      chargementAcquisition: 0,
      contributionNette: 0,
      codeAgence: s.agence,
      contrat: s.contrat,
      isManual: true,
    };
    const newRaw = [...s.rawData, manualRow].sort(
      (a, b) => (a.dateCalcul?.getTime() ?? 0) - (b.dateCalcul?.getTime() ?? 0)
    );
    this.svc.setDecision('manual', newRaw);
    this.manualDateStatus = '✅ ' + this.svc.formatDate(date);
    this.manualDateInput = '';
    this.showStatus(`✅ Date manuelle ${this.svc.formatDate(date)} ajoutée`, 'success');

    this.executeEtape1_4(); this.calculateECAvecPB(); this.calculateECSansPB();
  }*/

chooseManualDate(): void {
  if (this.decisionMade()) return;

  const dateStr = this.manualDateInput.trim();

  if (!dateStr) {
    this.manualDateStatus = 'Veuillez saisir une date';
    this.showStatus('Veuillez saisir une date', 'warning');
    return;
  }

 const date = new Date(this.manualDateInput);

 if (isNaN(date.getTime())) {
   this.manualDateStatus = 'Date invalide';
   this.showStatus('Date invalide', 'error');
   return;
 }

  const today = this.svc.today();
  date.setHours(0, 0, 0, 0);

  if (date.getTime() > today.getTime()) {
    this.manualDateStatus = 'La date ne peut pas être dans le futur';
    this.showStatus('La date ne peut pas être dans le futur', 'error');
    return;
  }

  const lastDate = this.svc.getLastDate();
  if (lastDate) {
    const lastClean = this.svc.cleanDate(lastDate);
    if (date.getTime() <= lastClean.getTime()) {
      this.manualDateStatus = `La date doit être postérieure au ${this.svc.formatDate(lastClean)}`;
      this.showStatus(`La date doit être postérieure au ${this.svc.formatDate(lastClean)}`, 'error');
      return;
    }
  }

  const exists = this.rawData().some(row => {
    if (!row.dateCalcul) return false;
    return this.svc.cleanDate(row.dateCalcul).getTime() === date.getTime();
  });

  if (exists) {
    this.manualDateStatus = 'Cette date existe déjà dans les quittances';
    this.showStatus('Cette date existe déjà', 'error');
    return;
  }

 
  const s = this.snapshot();
  const manualRow: QuittanceRow = {
    numQuittance: '',
    dateEffet: null,
    dateCalcul: date,
    contribution: 0,
    chargementAcquisition: 0,
    contributionNette: 0,
    codeAgence: s.agence,
    contrat: s.contrat,
    isManual: true,
  };

  const newRaw = [...s.rawData, manualRow].sort(
    (a, b) => (a.dateCalcul?.getTime() ?? 0) - (b.dateCalcul?.getTime() ?? 0)
  );

  this.svc.setDecision('manual', newRaw);
  this.manualDateStatus = `Date validée : ${this.svc.formatDate(date)}`;
  this.showStatus(`Date manuelle ${this.svc.formatDate(date)} ajoutée`, 'success');

  this.executeEtape1_4();
  this.calculateECAvecPB();
  this.calculateECSansPB();
}

  skipDates(): void {
    if (this.decisionMade()) return;
    this.svc.setDecision('none');
    this.showStatus('⏭️ Aucune date ajoutée. Vous pouvez commencer les calculs.', 'info');
  }

  executeEtape1_4(): void {
    if (!this.decisionMade() || !this.rawData().length) {
      this.showStatus('Veuillez d\'abord charger les données et faire un choix', 'warning');
      return;
    }
    this.showProgressBar(0);
    this.showStatus('🔄 Étape 1-4 en cours...', 'info');
    try {
      const s = this.snapshot();
      const result = this.svc.executeEtape1_4(
        s.rawData, s.productType, s.agence, s.contrat
      );
      this.svc.setEtape1_4Result(result.data, result.highlightedRows, result.lawChangeRowIndex);
      this.showProgressBar(100);
      let msg = '✅ Étape 1-4 terminée !';
      if (result.lawChangeRowIndex >= 0) msg += ' Ligne 31/10/2025 ajoutée.';
      msg += ' Cliquez sur "Calcul EC avec PB".';
      this.showStatus(msg, 'success');
      this.toast.success('Préparation OK', `${result.data.length} lignes traitées`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.showStatus('❌ Erreur : ' + msg, 'error');
      this.toast.error('Étape 1-4', msg);
    }
  }

  calculateECAvecPB(): void {
   
    if (!this.etape1_4Complete()) {
      this.showStatus('Veuillez d\'abord exécuter l\'étape 1-4', 'error');
      return;
    }
    this.showStatus('🔄 Calcul EC avec PB en cours...', 'info');
    try {
      const chargementApres = this.fraisDeGestionInput == null
        ? undefined
        : this.fraisDeGestionInput / 100;
      const result = this.svc.calculateECAvecPB(this.data(), this.snapshot().productType, chargementApres);
      this.svc.setECAvecPB(result);
      this.showStatus('✅ EC avec PB calculé ! Cliquez sur "Calcul EC sans PB"', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.showStatus('❌ Erreur : ' + msg, 'error');
      this.toast.error('EC avec PB', msg);
    }
  }

  calculateECSansPB(): void {
    if (!this.ecPBComplete()) {
      this.showStatus('Veuillez d\'abord calculer EC avec PB', 'error');
      return;
    }
    this.showStatus('🔄 Calcul EC sans PB en cours...', 'info');
    try {
      const chargementApres = this.fraisDeGestionInput == null
        ? undefined
        : this.fraisDeGestionInput / 100;
      const result = this.svc.calculateECSansPB(this.data(), this.snapshot().productType, chargementApres);
      this.svc.setECSansPB(result);
      this.showStatus('✅ Calcul terminé ! Vous pouvez télécharger ou imprimer', 'success');
      this.toast.success('Calcul terminé', `${result.length} lignes`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.showStatus('❌ Erreur : ' + msg, 'error');
      this.toast.error('EC sans PB', msg);
    }
  }

  downloadResult(): void {
    if (!this.isCalculated()) {
      this.showStatus('Aucun résultat à télécharger', 'error');
      return;
    }
    const s = this.snapshot();
    this.svc.downloadExcel(s.rawData, s.contrat, s.agence);
    this.showStatus('✅ Fichier téléchargé', 'success');
    this.toast.success('Export OK', 'Fichier CSV téléchargé');
  }

  printDocument(): void {
    if (!this.isCalculated()) {
      this.showStatus('Aucun résultat à imprimer', 'error');
      return;
    }
    window.print();
  }

  clearData(): void {
    this.svc.clear();
    this.statusMessage.set(null);
    this.manualDateInput = '';
    this.manualDateStatus = '';
    this.showStatus('🗑️ Données effacées', 'info');
  }

  formatDate(d: Date | null | undefined): string {
    return this.svc.formatDate(d);
  }

  formatNum(n: number | null | undefined): string {
    if (n == null) return '';
    return n.toFixed(2);
  }

  columnLabel(key: string): string {
    switch (key) {
      case 'numQuittance':        return 'N° Quittance';
      case 'dateEffet':           return 'Date Effet';
      case 'dateCalcul':          return 'Date Calcul';
      case 'periodeCourue':       return 'Période Courue';
      case 'contribution':        return 'Contribution Encaissée';
      case 'chargementAcquisition': return 'Chargement Acquisition';
      case 'contributionNette':   return 'Contribution Nette';
      case 'ecAvecPB':            return 'EC avec PB';
      case 'ecSansPB':            return 'EC sans PB';
      default:                    return key;
    }
  }

  isSpecial(row: QuittanceRow): boolean {
    return !!(row.isNewYear || row.isToday || row.isManual || row.isLawChange);
  }

  getRowClass(row: QuittanceRow, index: number): string | null {
    if (row.isToday) return 'row--today';
    if (row.isManual) return 'row--manual';
    if (row.isLawChange) return 'row--law';
    if (this.highlightedRows().includes(index)) return 'row--hl';
    return null;
  }

  // -------------------------------------------------------------------
  // privés
  // -------------------------------------------------------------------
  private showStatus(text: string, type: Exclude<StatusKind, null>): void {
    this.statusMessage.set({ text, type });
    if (type === 'success') {
      setTimeout(() => {
        if (this.statusMessage()?.type === 'success') {
          this.statusMessage.set(null);
        }
      }, 8000);
    }
  }

  private showProgressBar(pct: number): void {
    this.showProgress.set(true);
    this.progress.set(pct);
    if (pct >= 100) {
      setTimeout(() => this.showProgress.set(false), 800);
    }
  }

  onDragOver(event: DragEvent): void {
  event.preventDefault();
}

onDrop(event: DragEvent): void {
  event.preventDefault();

  const files = event.dataTransfer?.files;

  if (files && files.length > 0) {
    const file = files[0];
    console.log(file);
  }
}

private toDateInputValue(date: Date): string {
   const year = date.getFullYear();
   const month = String(date.getMonth() + 1).padStart(2, '0');
   const day = String(date.getDate()).padStart(2, '0');

   return `${year}-${month}-${day}`;
 }

selectProduct(product: any): void {
  this.selectedProductBinding = product.id;
  this.onProductChange(product.id);

  // Ferme la sélection après un court délai (meilleure UX)
  setTimeout(() => {
    this.showProductSelection = false;
  }, 280);
}







openProductSelection(): void {
  this.showProductSelection = true;
}

}
