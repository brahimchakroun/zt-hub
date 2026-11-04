import { Injectable, signal, computed, inject, Signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CalculationStats,
  EpargneCalculResult,
  EpargneCalculRows,
  FileProcessResult,
  PoliceEpargneInfo,
  ProductMeta,
  ProductType,
  QuittanceRow,
  VIE_PRODUCTS,
} from './calculator.model';
import { MothmerCalculatorService } from './services/mothmer-calculator.service';
import { MoucenedCalculatorService } from './services/moucened-calculator.service';
import { MounacibCalculatorService } from './services/mounacib-calculator.service';
import { ApiResponse } from '../../../core/models/backend-api.model';
import { unwrapApiResponse } from '../../../core/services/rbac.mapper';
import { DirassaCalculatorService } from './services/dirassa-calculator.service';

export interface AppSnapshot {
  productType: ProductType;
  contrat: string;
  agence: string;
  rawData: QuittanceRow[];
  todayAdded: boolean;
}

interface QuittanceReglementDto {
  dateCalcul: string | null;
  codeAgence: string | null;
  numeroPolice: string | null;
  numeroQuittance: string | null;
  dateEffet: string | null;
  montant: number | null;
}

@Injectable({ providedIn: 'root' })
export class VieCalculatorService {

  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl + '/api/v1/apiproassure';
  private readonly mothmerSvc = inject(MothmerCalculatorService);
  private readonly moucenedSvc = inject(MoucenedCalculatorService);
  private readonly dirassaSvc = inject(DirassaCalculatorService);
  private readonly mounacibSvc = inject(MounacibCalculatorService);
  readonly hasData = signal(false);
  // =========================================================================
  // Strategy factory
  // =========================================================================
  readonly products: ProductMeta[] = VIE_PRODUCTS;

  getProductConfig(type: ProductType): ProductMeta {
    return this.products.find(p => p.id === type) ?? this.products[0];
  }

  private strategyFor(type: ProductType): MothmerCalculatorService | MoucenedCalculatorService | MounacibCalculatorService | DirassaCalculatorService {
    switch (type) {
      case 'mothmer':
        return this.mothmerSvc;
      case 'moucened':
        return this.moucenedSvc;
      case 'mounacib':
        return this.mounacibSvc;
      case 'dirassa':
        return this.dirassaSvc;
      default:
        return this.mothmerSvc;
    }
  }

  // =========================================================================
  // Date helpers — délégués à la stratégie courante
  // =========================================================================
  today(): Date {
    return this.mothmerSvc.today();
  }

  cleanDate(d: Date): Date {
    return this.mothmerSvc.cleanDate(d);
  }

  parseDateFromString(s: string): Date | null {
    return this.mothmerSvc.parseDateFromString(s);
  }

  formatDate(d: Date | null | undefined): string {
    return this.mothmerSvc.formatDate(d);
  }

  getLastDate(): Date | null {
    const d = this.rawData();
    return this.mothmerSvc.getLastDate(d);
  }

  // =========================================================================
  // State
  // =========================================================================
  readonly productType  = signal<ProductType>('mothmer');
  readonly contrat      = signal<string>('');
  readonly agence       = signal<string>('');
  readonly rawData      = signal<QuittanceRow[]>([]);

  readonly epargneResult = signal<EpargneCalculResult | null>(null);
  readonly decisionMade = signal<null | 'today' | 'manual' | 'none'>(null);
  readonly todayAdded   = signal<boolean>(false);
  readonly etape1_4Complete = signal(false);
  readonly ecPBComplete     = signal(false);
  readonly highlightedRows  = signal<number[]>([]);

  private readonly _ecAvecPB = signal<QuittanceRow[]>([]);
  private readonly _ecSansPB = signal<QuittanceRow[]>([]);



  readonly data = computed<QuittanceRow[]>(() => {
    const finalRows = this._ecSansPB();
    if (finalRows.length) return finalRows;
    const pbRows = this._ecAvecPB();
    if (pbRows.length) return pbRows;
    return this.rawData();
  });

  readonly ecSansPBComplete = computed(() => this._ecSansPB().length > 0);

  readonly isCalculated = computed(() => {   
    const rows = this.data();
    return this.ecPBComplete() && rows.some(r => typeof r.ecSansPB === 'number');
  });

  readonly snapshot = computed<AppSnapshot>(() => ({
    productType: this.productType(),
    contrat: this.contrat(),
    agence: this.agence(),
    rawData: this.rawData(),
    todayAdded: this.todayAdded(),
  }));

  // =========================================================================
  // State mutators
  // =========================================================================
  setProductType(t: ProductType): void {
    this.productType.set(t);
  }

  setLoadedData(raw: QuittanceRow[], contrat: string, agence: string): void {
    this.rawData.set(raw);
    this.epargneResult.set(null);
    this.contrat.set(contrat);
    this.agence.set(agence);
    this.decisionMade.set(null);
    this.todayAdded.set(false);
    this.etape1_4Complete.set(false);
    this.ecPBComplete.set(false);
    this.highlightedRows.set([]);
    this._ecAvecPB.set([]);
    this._ecSansPB.set([]);
  }

  setDecision(kind: 'today' | 'manual' | 'none', rows?: QuittanceRow[]): void {
    this.decisionMade.set(kind);
    this.todayAdded.set(kind === 'today');
    if (rows) this.rawData.set(rows);
  }

  clear(): void {
    this.rawData.set([]);
    this.epargneResult.set(null);
    this.contrat.set('');
    this.agence.set('');
    this.hasData.set(false);
    this.decisionMade.set(null);
    this.todayAdded.set(false);
    this.etape1_4Complete.set(false);
    this.ecPBComplete.set(false);
    this.highlightedRows.set([]);
    this._ecAvecPB.set([]);
    this._ecSansPB.set([]);
  }

  setEtape1_4Result(data: QuittanceRow[], highlighted: number[], lawIdx: number): void {
    void lawIdx;
    this.rawData.set(data);
    this.highlightedRows.set(highlighted);
    this.etape1_4Complete.set(true);
    this._ecAvecPB.set([]);
    this._ecSansPB.set([]);
  }

  setECAvecPB(rows: QuittanceRow[]): void {
    this._ecAvecPB.set(rows);
    this.ecPBComplete.set(true);
    this._ecSansPB.set([]);
  }

  setECSansPB(rows: QuittanceRow[]): void {
    this._ecSansPB.set(rows);
  }

  // =========================================================================
  // File loader — réel (xlsx / csv)
  // =========================================================================
  async loadFromFile(file: File): Promise<FileProcessResult> {
    this.hasData.set(false);
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const ws = workbook.Sheets[firstSheetName];
    const jsonData: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    if (!jsonData || jsonData.length < 2) {
      throw new Error('Fichier vide ou invalide (aucune donnée');
    }

    const headers: string[] = (jsonData[0] as unknown[]).map(h => String(h ?? '').trim());

    const findCol = (candidates: string[]): number => {
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i] || '';
        for (const c of candidates) {
          if (h && (h === c || h.toLowerCase() === c.toLowerCase())) return i;
        }
      }
      return -1;
    };

    const colIndex = {
      dateCalcul: findCol(['Date de calcul', 'DateCalcul', 'Date calcul']) >= 0 ? findCol(['Date de calcul', 'DateCalcul', 'Date calcul']) : 0,
      codeAgence: findCol(['Code agence', 'CodeAgence', 'Agence']) >= 0 ? findCol(['Code agence', 'CodeAgence', 'Agence']) : 1,
      contrat:    findCol(['Contrat', 'Contrat', 'N°Contrat']) >= 0 ? findCol(['Contrat', 'Contrat', 'N°Contrat']) : 2,
      numQuittance: findCol(['N°QUITTANCE', 'N° Quittance', 'Quittance', 'NumeroQuittance']) >= 0 ? findCol(['N°QUITTANCE', 'N° Quittance', 'Quittance', 'NumeroQuittance']) : 3,
      dateEffet: findCol(['Date Effet', 'DateEffet', 'Date d\'effet']) >= 0 ? findCol(['Date Effet', 'DateEffet', 'Date d\'effet']) : 5,
      contribution: findCol(['CONTRIBUTION ENCAISSEE', 'CONTRIBUTION', 'Contribution Encaissée', 'Contribution']) >= 0 ? findCol(['CONTRIBUTION ENCAISSEE', 'CONTRIBUTION', 'Contribution Encaissée', 'Contribution']) : 7,
    };

    const rawData: QuittanceRow[] = [];
    let contrat = '';
    let agence = '';

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;

      const dateCalcul = this._parseDateAny(row[colIndex.dateCalcul]);
      if (!dateCalcul) continue;

      if (!contrat && row[colIndex.contrat] != null) {
        contrat = String(row[colIndex.contrat]).trim();
      }
      if (!agence && row[colIndex.codeAgence] != null) {
        agence = String(row[colIndex.codeAgence] ?? '').trim();
      }

      rawData.push({
        numQuittance: String(row[colIndex.numQuittance] ?? '').trim(),
        dateEffet: this._parseDateAny(row[colIndex.dateEffet]) || dateCalcul,
        dateCalcul,
        contribution: parseFloat(String(row[colIndex.contribution] ?? '0')) || 0,
        codeAgence: agence,
        contrat,
      });
    }

    if (rawData.length === 0) {
      throw new Error('Aucune donnée valide trouvée dans le fichier');
    }
    this.hasData.set(true);
    return { rawData, contrat, agence };
  }


  loadPoliceEpargne(numeroPolice: string): Observable<PoliceEpargneInfo> {
    return this.http
    .get<ApiResponse<PoliceEpargneInfo>>(
    `${this.base}/policeEpargneInfo`,
    { params: { numeroPolice } }
    )
    .pipe(unwrapApiResponse);
  }

  loadCalculEpargne(numeroPolice: string): Observable<EpargneCalculRows[]> {
    return this.http
    .get<ApiResponse<EpargneCalculRows[]>>(
    `${this.base}/epargneCalcul`,
    { params: { numeroPolice } }
    )
    .pipe(unwrapApiResponse);
  }

    loadCalculEpargneLettre(numeroPolice: string): Observable<EpargneCalculRows[]> {
    return this.http
    .get<ApiResponse<EpargneCalculRows[]>>(
    `${this.base}/epargneCalcul`,
    { params: { numeroPolice } }
    )
    .pipe(unwrapApiResponse);
  }

  downloadPdfLettre(numeroPolice: string): Observable<Blob> {
    return this.http.get(`${this.base}/policeEpargneLettre`, {
      params: { numeroPolice },
      responseType: 'blob' // Indispensable pour recevoir du binaire (PDF)
    });
  }

  async loadEpargneFromApi(numeroPolice: string): Promise<EpargneCalculResult>{
    this.hasData.set(false);
   
    const rows = await firstValueFrom(
            this.loadCalculEpargne(numeroPolice)
            );
            console.log("loadEpaFromApi rows:", rows);

    if (!rows.length) {
      throw new Error('Aucune quittance trouvée pour ce numéro de police');
    }
    const result: EpargneCalculResult = {
      police: await firstValueFrom(this.loadPoliceEpargne(numeroPolice)),
      calculs: rows
    };
    this.epargneResult.set(result);
    this.contrat.set(result.police.numeroPolice);
    this.agence.set(result.police.codeAgence);
    this.hasData.set(true);
    return result;

  }

 loadPolice(numeroPolice: string): Observable<QuittanceReglementDto[]> {
    return this.http
    .get<ApiResponse<QuittanceReglementDto[]>>(
    `${this.base}/quittanceReglement`,
    { params: { numeroPolice } }
    )
    .pipe(unwrapApiResponse);
  }
  async loadFromApi(numeroPolice: string): Promise<FileProcessResult> {
    this.hasData.set(false);
    const rows = await firstValueFrom(
            this.loadPolice(numeroPolice)
            );
            console.log("loadFromApi rows:", rows);

    if (!rows.length) {
      throw new Error('Aucune quittance trouvée pour ce numéro de police');
    }

    const contrat = rows.find(row => row.numeroPolice?.trim())?.numeroPolice?.trim() ?? numeroPolice;
    const agence = rows.find(row => row.codeAgence?.trim())?.codeAgence?.trim() ?? '';
    const rawData: QuittanceRow[] = [];

    for (const row of rows) {
      const dateCalcul = this._parseDateAny(row.dateCalcul);
      if (!dateCalcul) continue;

      const montant = Number(row.montant ?? 0);
      rawData.push({
        numQuittance: row.numeroQuittance?.trim() ?? '',
        dateEffet: this._parseDateAny(row.dateEffet) ?? dateCalcul,
        dateCalcul,
        contribution: Number.isFinite(montant) ? montant : 0,
        codeAgence: agence,
        contrat,
      });
    }

    if (!rawData.length) {
      throw new Error('Aucune donnée valide trouvée dans la réponse de l’API');
    }
    this.hasData.set(true);
    return { rawData, contrat, agence };
  }

  // =========================================================================
  // Calcul delegation — délégation à la stratégie produit appropriée
  // =========================================================================
  executeEtape1_4(
    raw: QuittanceRow[],
    _product: ProductType,
    agence: string,
    contrat: string,
  ): ReturnType<MothmerCalculatorService['executeEtape1_4']> {
    const svc = this.strategyFor(this.productType());
    return svc.executeEtape1_4(raw, agence, contrat, this.todayAdded());
  }

  calculateECAvecPB(data: QuittanceRow[], _product: ProductType, chargementApres?: number): QuittanceRow[] {
    if (this.productType() === 'dirassa') {
      return this.dirassaSvc.calculateECAvecPB(data, chargementApres);
    }
    return this.strategyFor(this.productType()).calculateECAvecPB(data);
  }

  calculateECSansPB(data: QuittanceRow[], _product: ProductType, chargementApres?: number): QuittanceRow[] {
    if (this.productType() === 'dirassa') {
      return this.dirassaSvc.calculateECSansPB(data, chargementApres);
    }
    return this.strategyFor(this.productType()).calculateECSansPB(data);
  }

  computeStats(data: QuittanceRow[]): CalculationStats {
    return this.mothmerSvc.computeStats(data);
  }


  computeStatsEpargne(data: EpargneCalculRows[]): CalculationStats {
    return this.mothmerSvc.computeStatsEpargne(data);
  }
  addSpecialLinesForDecision(
    data: QuittanceRow[],
  ): { data: QuittanceRow[]; addedIndices: number[] } {
    const svc = this.strategyFor(this.productType());
    const res = svc.addSpecialLines(data, false);
    return { data: res.data, addedIndices: res.addedIndices };
  }

  // =========================================================================
  // Export CSV
  // =========================================================================
  downloadExcel(_rawData: QuittanceRow[], contrat: string, _agence: string): void {
    const source = this.data();
    const header = [
      'N°QUITTANCE', 'Date Effet', 'Date de calcul', 'PERIODE COURUE',
      'CONTRIBUTION ENCAISSEE', 'CHARGEMENT D\'ACQUISITION', 'CONTRIBUTION NETTE',
      'EC avec PB', 'EC sans PB', 'Code agence', 'Contrat',
    ];
    const lines: string[] = [header.join(';')];
    for (const r of source) {
      const isSpecial = !!(r.isNewYear || r.isToday || r.isManual || r.isLawChange);
      lines.push([
        isSpecial ? '' : (r.numQuittance || ''),
        isSpecial ? '' : this.formatDate(r.dateEffet),
        this.formatDate(r.dateCalcul),
        String(r.periodeCourue ?? 0),
        isSpecial ? '' : this._fmt(r.contribution),
        isSpecial ? '' : this._fmt(r.chargementAcquisition),
        isSpecial ? '' : this._fmt(r.contributionNette),
        this._fmt(r.ecAvecPB as number | undefined | null),
        this._fmt(r.ecSansPB as number | undefined | null),
        r.codeAgence || _agence,
        r.contrat || contrat,
      ].join(';'));
    }
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EC_VIE_${contrat.replace(/\//g, '_')}_${this.formatDate(new Date()).replace(/\//g, '')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // =========================================================================
  // Helpers privés
  // =========================================================================
  private _parseDateAny(value: unknown): Date | null {
    if (value == null || value === '') return null;

    if (typeof value === 'number') {
      const ms = Math.round((value - 25569) * 86400 * 1000);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) {
        return this.cleanDate(d);
      }
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const formats: RegExp[] = [
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
      ];
      for (const re of formats) {
        const m = trimmed.match(re);
        if (m) {
          let day: number, month: number, year: number;
          if (m[1].length === 4) {
            year = +m[1]; month = +m[2] - 1; day = +m[3];
          } else {
            day = +m[1]; month = +m[2] - 1; year = +m[3];
          }
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) {
            return this.cleanDate(d);
          }
        }
      }
      const fallback = new Date(trimmed);
      if (!isNaN(fallback.getTime())) {
        return this.cleanDate(fallback);
      }
    }

    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : this.cleanDate(value);
    }

    return null;
  }

  private _fmt(v: number | null | undefined): string {
    if (v == null) return '';
    return v.toFixed(2).replace('.', ',');
  }

  private _shift(d: Date, days: number): Date {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  }

  private _makeRow(num: string, df: Date, dc: Date, cot: number, _p: ProductMeta): QuittanceRow {
    return {
      numQuittance: num,
      dateEffet: this.cleanDate(df),
      dateCalcul: this.cleanDate(dc),
      contribution: Number(cot.toFixed(2)),
      codeAgence: this.agence() || (this.productType() === 'mothmer' ? '2' : 'AG-001'),
      contrat: this.contrat() || 'VIE',
    };
  }
}
