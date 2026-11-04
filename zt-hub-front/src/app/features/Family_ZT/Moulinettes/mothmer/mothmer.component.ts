import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';

// ============================================================
// MODÈLES INTERNES
// ============================================================

interface PoliceRow {
  numQuittance: string;
  dateEffet: Date;
  dateCalcul: Date;
  contribution: number;
  codeAgence: string;
  contrat: string;
}

interface ResultRow extends Partial<PoliceRow> {
  // Lignes spéciales
  isNewYear?: boolean;
  isToday?: boolean;
  isManual?: boolean;
  yearAdded?: number;

  // Résultats calculés
  chargementAcquisition?: number;
  contributionNette?: number;
  periodeCourue?: number;
  ecAvecPB?: number | null;
  ecSansPB?: number | null;
}

interface StatusMessage {
  text: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

// ============================================================
// CONFIGURATION MOTHMER
// ============================================================

const MOTHMER_TAUX_PB: { [annee: number]: number } = {
  2013: 0.0510,
  2014: 0.0505,
  2015: 0.0504,
  2016: 0.0466,
  2017: 0.0508,
  2018: 0.0627,
  2019: 0.0580,
  2020: 0.0500,
  2021: 0.0513,
  2022: 0.0620,
  2023: 0.0620,
  2024: 0.0646,
  2025: 0.0622,
  2026: 0.0500
};

const MOTHMER_TAUX_ACQUISITION: { [code: string]: number } = {
  '2': 0,
  '6': 0,
  '9': 0,
  '20': 0,
  'default': 0.03
};

// ============================================================
// COMPOSANT
// ============================================================

@Component({
  selector: 'app-mothmer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mothmer.component.html',
  styleUrls: ['./mothmer.component.scss']
})
export class MothmerComponent implements OnInit, OnDestroy {

  // ===== ÉTAT =====
  contrat = '';
  agence = '';
  rawData: PoliceRow[] = [];
  data: ResultRow[] = [];
  highlightedRows: number[] = [];

  // Étapes
  decisionMade = false;
  choiceType: 'none' | 'today' | 'manual' = 'none';
  etape1_4Complete = false;
  ecPBComplete = false;
  ecSansPBComplete = false;
  isCalculated = false;

  // Stats
  totalEncaisse = 0;
  totalNet = 0;
  finalECPB = 0;
  finalECSansPB = 0;

  // UI
  status: StatusMessage | null = null;
  progress = 0;
  showProgress = false;
  todayLabel = '';
  manualDateInput = '';
  manualDateError = '';

  private statusTimeout: any;

  // ===== CONFIG (exposée au template) =====
  readonly tauxPB = MOTHMER_TAUX_PB;
  readonly tauxAcquisition = MOTHMER_TAUX_ACQUISITION;

  // ============================================================
  // LIFECYCLE
  // ============================================================

  ngOnInit(): void {
    this.todayLabel = this.formatDate(new Date());
  }

  ngOnDestroy(): void {
    if (this.statusTimeout) clearTimeout(this.statusTimeout);
  }

  // ============================================================
  // GETTERS POUR LE TEMPLATE
  // ============================================================

  get hasData(): boolean {
    return this.rawData.length > 0;
  }

  get canChooseDate(): boolean {
    return this.hasData && !this.decisionMade;
  }

  get canExecute(): boolean {
    return this.decisionMade && !this.etape1_4Complete;
  }

  get canCalcECPB(): boolean {
    return this.etape1_4Complete && !this.ecPBComplete;
  }

  get canCalcECSansPB(): boolean {
    return this.ecPBComplete && !this.ecSansPBComplete;
  }

  get tauxEntries(): { annee: number; taux: number }[] {
    return Object.keys(this.tauxPB)
      .map(k => ({ annee: +k, taux: this.tauxPB[+k] }))
      .sort((a, b) => a.annee - b.annee);
  }

  get steps(): { num: number; label: string; state: 'done' | 'active' | 'pending' }[] {
    const steps = [
      { num: 1, label: 'Chargement', done: this.rawData.length > 0 },
      { num: 2, label: 'Choix date', done: this.decisionMade },
      { num: 3, label: 'Préparation', done: this.etape1_4Complete },
      { num: 4, label: 'EC avec PB', done: this.ecPBComplete },
      { num: 5, label: 'EC sans PB', done: this.ecSansPBComplete },
      { num: 6, label: 'Terminé', done: this.isCalculated }
    ];
    let activeAssigned = false;
    return steps.map(st => {
      let stState: 'done' | 'active' | 'pending';
      if (st.done) stState = 'done';
      else if (!activeAssigned) { stState = 'active'; activeAssigned = true; }
      else stState = 'pending';
      return { num: st.num, label: st.label, state: stState };
    });
  }

  // ============================================================
  // CHARGEMENT DU FICHIER
  // ============================================================

  async onFileSelected(event: any): Promise<void> {
    const file: File = event?.target?.files?.[0] || event?.files?.[0];
    if (!file) return;

    this.showStatus('Chargement du fichier en cours...', 'info');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      if (!jsonData || jsonData.length < 2) {
        throw new Error('Fichier vide ou invalide');
      }

      const headers = (jsonData[0] || []).map(h => String(h || '').trim());
      const colIndex = this.detectColumns(headers);

      const rows: PoliceRow[] = [];
      let contrat = '';
      let agence = '';

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const dateCalcul = this.parseDate(row[colIndex.dateCalcul]);
        if (!dateCalcul) continue;

        if (!contrat && row[colIndex.contrat]) {
          contrat = String(row[colIndex.contrat]).trim();
        }
        if (!agence && row[colIndex.codeAgence]) {
          agence = String(row[colIndex.codeAgence]).trim();
        }

        rows.push({
          numQuittance: String(row[colIndex.numQuittance] || '').trim(),
          dateEffet: this.parseDate(row[colIndex.dateEffet]) || dateCalcul,
          dateCalcul,
          contribution: this.parseNumber(row[colIndex.contribution]),
          codeAgence: agence,
          contrat
        });
      }

      if (rows.length === 0) {
        throw new Error('Aucune donnée valide trouvée dans le fichier');
      }

      // Reset état
      this.contrat = contrat;
      this.agence = agence;
      this.rawData = rows;
      this.data = [];
      this.highlightedRows = [];
      this.decisionMade = false;
      this.choiceType = 'none';
      this.etape1_4Complete = false;
      this.ecPBComplete = false;
      this.ecSansPBComplete = false;
      this.isCalculated = false;
      this.totalEncaisse = 0;
      this.totalNet = 0;
      this.finalECPB = 0;
      this.finalECSansPB = 0;
      this.manualDateInput = '';
      this.manualDateError = '';

      this.showStatus(`✅ ${rows.length} quittances chargées. Choisissez UNE option.`, 'info');

    } catch (err: any) {
      console.error(err);
      this.showStatus('❌ ' + (err?.message || 'Erreur de lecture'), 'error');
    }
  }

  // ============================================================
  // CHOIX DATE : AUJOURD'HUI
  // ============================================================

  chooseToday(): void {
    if (this.decisionMade) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (this.rawData.some(r => this.isSameDay(r.dateCalcul, today))) {
      this.showStatus('⚠️ La date d\'aujourd\'hui existe déjà', 'warning');
      return;
    }

    this.rawData.push({
      numQuittance: '',
      dateEffet: today,
      dateCalcul: today,
      contribution: 0,
      codeAgence: this.agence,
      contrat: this.contrat
    });
    this.rawData.sort((a, b) => a.dateCalcul.getTime() - b.dateCalcul.getTime());

    this.choiceType = 'today';
    this.decisionMade = true;
    this.showStatus(`✅ Date d'aujourd'hui (${this.formatDate(today)}) ajoutée`, 'success');
  }

  // ============================================================
  // CHOIX DATE : MANUELLE
  // ============================================================

  onManualDateInput(): void {
    let v = this.manualDateInput.replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    let f = '';
    for (let i = 0; i < v.length; i++) {
      if (i === 2 || i === 4) f += '/';
      f += v[i];
    }
    this.manualDateInput = f;
    this.manualDateError = '';
  }

  chooseManualDate(): void {
    if (this.decisionMade) return;

    const dateStr = this.manualDateInput.trim();
    if (!dateStr) {
      this.manualDateError = 'Veuillez saisir une date';
      return;
    }

    const date = this.parseDateFromString(dateStr);
    if (!date) {
      this.manualDateError = 'Format invalide (jj/mm/aaaa)';
      return;
    }
    date.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date.getTime() > today.getTime()) {
      this.manualDateError = 'La date ne peut pas être dans le futur';
      return;
    }

    const lastDate = this.getLastDate();
    if (lastDate) {
      const ld = new Date(lastDate);
      ld.setHours(0, 0, 0, 0);
      if (date.getTime() <= ld.getTime()) {
        this.manualDateError = `La date doit être > ${this.formatDate(ld)}`;
        return;
      }
    }

    if (this.rawData.some(r => this.isSameDay(r.dateCalcul, date))) {
      this.manualDateError = 'Cette date existe déjà';
      return;
    }

    this.rawData.push({
      numQuittance: '',
      dateEffet: date,
      dateCalcul: date,
      contribution: 0,
      codeAgence: this.agence,
      contrat: this.contrat
    });
    this.rawData.sort((a, b) => a.dateCalcul.getTime() - b.dateCalcul.getTime());

    this.choiceType = 'manual';
    this.decisionMade = true;
    this.manualDateInput = '';
    this.manualDateError = '';
    this.showStatus(`✅ Date manuelle ${this.formatDate(date)} ajoutée`, 'success');
  }

  // ============================================================
  // PASSER (aucune date)
  // ============================================================

  skipDates(): void {
    if (this.decisionMade) return;
    this.choiceType = 'none';
    this.decisionMade = true;
    this.showStatus('⏭️ Passage direct aux calculs', 'success');
  }

  // ============================================================
  // ÉTAPE 1-4 : PRÉPARATION
  // ============================================================

  executeEtape1_4(): void {
    if (!this.decisionMade) return;

    this.showStatus('🔄 Étape 1-4 en cours...', 'info');
    this.showProgress = true;
    this.progress = 25;

    try {
      // 1. Copie + tri
      let data: ResultRow[] = this.rawData.map(row => ({
        ...row,
        numQuittance: row.numQuittance || '',
        dateEffet: row.dateEffet || row.dateCalcul,
        dateCalcul: row.dateCalcul,
        contribution: row.contribution || 0,
        codeAgence: row.codeAgence,
        contrat: row.contrat
      }));
      data.sort((a, b) => a.dateCalcul!.getTime() - b.dateCalcul!.getTime());

      this.progress = 40;

      // 2. Chargement acquisition (MOTHMER : 0% ou 3%)
      const tauxAcq = this.getTauxAcquisition(data[0]?.codeAgence || '');
      data = data.map(row => ({
        ...row,
        chargementAcquisition: (row.contribution || 0) * tauxAcq
      }));

      this.progress = 60;

      // 3. Contribution nette
      data = data.map(row => ({
        ...row,
        contributionNette: (row.contribution || 0) - (row.chargementAcquisition || 0)
      }));

      this.progress = 75;

      // 4. Ajout des lignes 01/01
      const { data: withNewYears, addedIndices } = this.addNewYearLines(data);
      data = withNewYears;
      this.highlightedRows = addedIndices;

      this.progress = 85;

      // 5. Période courue
      data = data.map((row, i) => {
        let periodeCourue = 0;
        if (i > 0) {
          periodeCourue = this.daysBetween(data[i - 1].dateCalcul!, row.dateCalcul!);
        }
        return {
          ...row,
          periodeCourue,
          ecAvecPB: null,
          ecSansPB: null
        };
      });

      this.progress = 100;
      this.data = data;
      this.etape1_4Complete = true;
      this.showStatus('✅ Étape 1-4 terminée ! Cliquez sur "Calcul EC avec PB"', 'success');

    } catch (err: any) {
      console.error(err);
      this.showStatus('❌ ' + err.message, 'error');
    } finally {
      setTimeout(() => { this.showProgress = false; }, 500);
    }
  }

  // ============================================================
  // CALCUL EC AVEC PB
  // ============================================================

  calculateECAvecPB(): void {
    if (!this.etape1_4Complete) return;

    this.showStatus('🔄 Calcul EC avec PB en cours...', 'info');

    try {
      let ecAvecPB = 0;
      let firstValueSet = false;

      this.data = this.data.map((row, index) => {
        let newEC: number | null = null;

        if (row.isNewYear) {
          // Ligne 01/01
          if (index > 0) {
            let prevEC = ecAvecPB;
            for (let j = index - 1; j >= 0; j--) {
              const v = this.data[j].ecAvecPB;
              if (v !== null && v !== undefined) { prevEC = v; break; }
            }

            const tauxPB = this.tauxPB[row.yearAdded! - 1] || 0;
            const bloc = Math.pow(1 + tauxPB, (row.periodeCourue || 0) / 365);
            ecAvecPB = prevEC * bloc + (row.contributionNette || 0);
            newEC = ecAvecPB;
          }
        } else {
          if (!firstValueSet) {
            ecAvecPB = row.contributionNette || 0;
            firstValueSet = true;
            newEC = ecAvecPB;
          } else {
            let prevEC = ecAvecPB;
            for (let j = index - 1; j >= 0; j--) {
              const v = this.data[j].ecAvecPB;
              if (v !== null && v !== undefined) { prevEC = v; break; }
            }

            const tauxPB = this.tauxPB[row.dateCalcul!.getFullYear()] || 0;
            const bloc = Math.pow(1 + tauxPB, (row.periodeCourue || 0) / 365);
            ecAvecPB = prevEC * bloc + (row.contributionNette || 0);
            newEC = ecAvecPB;
          }
        }

        return { ...row, ecAvecPB: newEC };
      });

      this.ecPBComplete = true;
      this.showStatus('✅ EC avec PB calculé ! Cliquez sur "Calcul EC sans PB"', 'success');

    } catch (err: any) {
      console.error(err);
      this.showStatus('❌ ' + err.message, 'error');
    }
  }

  // ============================================================
  // CALCUL EC SANS PB
  // ============================================================

  calculateECSansPB(): void {
    if (!this.ecPBComplete) return;

    this.showStatus('🔄 Calcul EC sans PB en cours...', 'info');

    try {
      let ecSansPB = 0;
      let firstValueSet = false;

      this.data = this.data.map((row, index) => {
        let newEC: number | null = null;

        if (row.isNewYear) {
          if (index > 0) {
            let prevEC = ecSansPB;
            for (let j = index - 1; j >= 0; j--) {
              const v = this.data[j].ecSansPB;
              if (v !== null && v !== undefined) { prevEC = v; break; }
            }
            ecSansPB = prevEC * 1 + (row.contributionNette || 0);
            newEC = ecSansPB;
          }
        } else {
          if (!firstValueSet) {
            ecSansPB = row.contributionNette || 0;
            firstValueSet = true;
            newEC = ecSansPB;
          } else {
            let prevEC = ecSansPB;
            for (let j = index - 1; j >= 0; j--) {
              const v = this.data[j].ecSansPB;
              if (v !== null && v !== undefined) { prevEC = v; break; }
            }
            ecSansPB = prevEC * 1 + (row.contributionNette || 0);
            newEC = ecSansPB;
          }
        }

        return { ...row, ecSansPB: newEC };
      });

      this.ecSansPBComplete = true;
      this.isCalculated = true;
      this.updateStats();
      this.showStatus('✅ Calcul terminé !', 'success');

    } catch (err: any) {
      console.error(err);
      this.showStatus('❌ ' + err.message, 'error');
    }
  }

  // ============================================================
  // NETTOYAGE
  // ============================================================

  clearData(): void {
    this.contrat = '';
    this.agence = '';
    this.rawData = [];
    this.data = [];
    this.highlightedRows = [];
    this.decisionMade = false;
    this.choiceType = 'none';
    this.etape1_4Complete = false;
    this.ecPBComplete = false;
    this.ecSansPBComplete = false;
    this.isCalculated = false;
    this.totalEncaisse = 0;
    this.totalNet = 0;
    this.finalECPB = 0;
    this.finalECSansPB = 0;
    this.manualDateInput = '';
    this.manualDateError = '';
    this.showStatus('🗑️ Données effacées', 'info');
  }

  // ============================================================
  // HELPERS TEMPLATE
  // ============================================================

  formatDate(d?: Date | null): string {
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  }

  fmt(n: number | null | undefined): string {
    if (n === null || n === undefined) return '';
    return n.toFixed(2);
  }

  isSpecialRow(row: ResultRow): boolean {
    return !!(row.isNewYear || row.isToday || row.isManual);
  }

  rowClass(row: ResultRow): string {
    if (row.isNewYear) return 'row-new-year';
    if (row.isToday) return 'row-today';
    if (row.isManual) return 'row-manual';
    return '';
  }

  trackByIndex(index: number): number {
    return index;
  }

  // ============================================================
  // MÉTHODES PRIVÉES
  // ============================================================

  private detectColumns(headers: string[]): {
    dateCalcul: number;
    codeAgence: number;
    contrat: number;
    numQuittance: number;
    dateEffet: number;
    contribution: number;
  } {
    const find = (label: string, fallback: number): number => {
      const idx = headers.findIndex(h => h.toLowerCase().includes(label.toLowerCase()));
      return idx !== -1 ? idx : fallback;
    };
    return {
      dateCalcul: find('date de calcul', 0),
      codeAgence: find('code agence', 1),
      contrat: find('contrat', 2),
      numQuittance: find('quittance', 3),
      dateEffet: find('date effet', 5),
      contribution: find('contribution encaissee', 7)
    };
  }

  private parseDate(value: any): Date | null {
    if (value === null || value === undefined || value === '') return null;

    if (typeof value === 'number') {
      const d = new Date((value - 25569) * 86400 * 1000);
      return isNaN(d.getTime()) ? null : d;
    }

    if (typeof value === 'string') {
      const s = value.trim();
      const formats = [
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/
      ];
      for (const f of formats) {
        const m = s.match(f);
        if (m) {
          let day: number, month: number, year: number;
          if (m[1].length === 4) {
            year = +m[1]; month = +m[2] - 1; day = +m[3];
          } else {
            day = +m[1]; month = +m[2] - 1; year = +m[3];
          }
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) return d;
        }
      }
      const fallback = new Date(s);
      if (!isNaN(fallback.getTime())) return fallback;
    }
    return null;
  }

  private parseDateFromString(dateStr: string): Date | null {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    const date = new Date(year, month, day);
    if (
      date.getDate() !== day ||
      date.getMonth() !== month ||
      date.getFullYear() !== year
    ) return null;
    return date;
  }

  private parseNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    const s = String(value).replace(/\s/g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  private getTauxAcquisition(codeAgence: string): number {
    if (this.tauxAcquisition[codeAgence] !== undefined) {
      return this.tauxAcquisition[codeAgence];
    }
    return this.tauxAcquisition['default'];
  }

  private addNewYearLines(data: ResultRow[]): { data: ResultRow[]; addedIndices: number[] } {
    const result: ResultRow[] = [];
    const addedIndices: number[] = [];
    const sorted = [...data].sort((a, b) => a.dateCalcul!.getTime() - b.dateCalcul!.getTime());

    for (let i = 0; i < sorted.length; i++) {
      result.push({ ...sorted[i] });

      if (i < sorted.length - 1) {
        const currentYear = sorted[i].dateCalcul!.getFullYear();
        const nextYear = sorted[i + 1].dateCalcul!.getFullYear();

        if (nextYear > currentYear) {
          for (let year = currentYear + 1; year <= nextYear; year++) {
            const newYearDate = new Date(year, 0, 1);
            newYearDate.setHours(0, 0, 0, 0);

            const exists = result.some(r => {
              if (!r.dateCalcul) return false;
              const rd = new Date(r.dateCalcul); rd.setHours(0, 0, 0, 0);
              const nd = new Date(newYearDate); nd.setHours(0, 0, 0, 0);
              return rd.getTime() === nd.getTime();
            });

            if (!exists) {
              result.push({
                numQuittance: '',
                dateEffet: undefined,
                dateCalcul: newYearDate,
                contribution: 0,
                codeAgence: sorted[i].codeAgence,
                contrat: sorted[i].contrat,
                isNewYear: true,
                yearAdded: year,
                chargementAcquisition: 0,
                contributionNette: 0
              });
              addedIndices.push(result.length - 1);
            }
          }
        }
      }
    }

    result.sort((a, b) => a.dateCalcul!.getTime() - b.dateCalcul!.getTime());
    return { data: result, addedIndices };
  }

  private updateStats(): void {
    this.totalEncaisse = this.data.reduce((s, r) => s + (r.contribution || 0), 0);
    this.totalNet = this.data.reduce((s, r) => s + (r.contributionNette || 0), 0);

    for (let i = this.data.length - 1; i >= 0; i--) {
      const v = this.data[i].ecAvecPB;
      if (v !== null && v !== undefined) { this.finalECPB = v; break; }
    }
    for (let i = this.data.length - 1; i >= 0; i--) {
      const v = this.data[i].ecSansPB;
      if (v !== null && v !== undefined) { this.finalECSansPB = v; break; }
    }
  }

  private getLastDate(): Date | null {
    for (let i = this.rawData.length - 1; i >= 0; i--) {
      if (this.rawData[i].dateCalcul) return this.rawData[i].dateCalcul;
    }
    return null;
  }

  private isSameDay(d1?: Date, d2?: Date): boolean {
    if (!d1 || !d2) return false;
    const a = new Date(d1); a.setHours(0, 0, 0, 0);
    const b = new Date(d2); b.setHours(0, 0, 0, 0);
    return a.getTime() === b.getTime();
  }

  private daysBetween(d1: Date, d2: Date): number {
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  }

  private showStatus(text: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
    if (this.statusTimeout) clearTimeout(this.statusTimeout);
    this.status = { text, type };
    if (type === 'success') {
      this.statusTimeout = setTimeout(() => { this.status = null; }, 8000);
    }
  }
}