import { Injectable } from '@angular/core';
import { CalculationStats, EpargneCalculRows, Etape1_4Result, QuittanceRow, TAUX_PB } from '../calculator.model';

@Injectable()
export abstract class VieCalculatorBaseService {

  // =========================================================================
  // Shared utilities
  // =========================================================================

  today(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  cleanDate(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  parseDateFromString(s: string): Date | null {
    const trimmed = s.trim();
    const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const day = +m[1], month = +m[2] - 1, year = +m[3];
    const d = new Date(year, month, day);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  formatDate(d: Date | null | undefined): string {
    if (!d) return '';
    const x = this.cleanDate(d);
    const dd = String(x.getDate()).padStart(2, '0');
    const mm = String(x.getMonth() + 1).padStart(2, '0');
    const yyyy = x.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  daysBetween(date1: Date, date2: Date): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diff = d2.getTime() - d1.getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }

  getTauxPB(date: Date): number {
    return TAUX_PB[date.getFullYear()] ?? 0;
  }

  getLastDate(data: QuittanceRow[]): Date | null {
    if (!data.length) return null;
    return data.reduce<Date | null>((acc, row) => {
      if (!row.dateCalcul) return acc;
      const c = this.cleanDate(row.dateCalcul);
      if (!acc) return c;
      return c > acc ? c : acc;
    }, null);
  }

  computeStats(data: QuittanceRow[]): CalculationStats {
    let totalEncaisse = 0, totalNet = 0, finalPB = 0, finalNoPB = 0;
    for (const r of data) {
      totalEncaisse += r.contribution ?? 0;
      totalNet     += r.contributionNette ?? 0;
      if (typeof r.ecAvecPB === 'number')  finalPB    = r.ecAvecPB;
      if (typeof r.ecSansPB === 'number') finalNoPB = r.ecSansPB;
    }
    return {
      totalEncaisse: Number(totalEncaisse.toFixed(2)),
      totalNet:     Number(totalNet.toFixed(2)),
      finalECPB:    Number(finalPB.toFixed(2)),
      finalECSansPB: Number(finalNoPB.toFixed(2)),
    };
  }

    computeStatsEpargne(data: EpargneCalculRows[]): CalculationStats {
    let totalEncaisse = 0, totalNet = 0, finalPB = 0, finalNoPB = 0;
    for (const r of data) {
      totalEncaisse += r.contributionEpargne ?? 0;
      totalNet     += r.contributionNette ?? 0;
      if (typeof r.ecAvecPb === 'number')  finalPB    = r.ecAvecPb;
      if (typeof r.ecSansPb === 'number') finalNoPB = r.ecSansPb;
    }
    return {
      totalEncaisse: Number(totalEncaisse.toFixed(2)),
      totalNet:     Number(totalNet.toFixed(2)),
      finalECPB:    Number(finalPB.toFixed(2)),
      finalECSansPB: Number(finalNoPB.toFixed(2)),
    };
  }

  // =========================================================================
  // Abstract product-specific methods to be implemented
  // =========================================================================

  abstract getTauxAcquisition(codeAgence: string): number;
  abstract hasManagementFees(): boolean;
  abstract hasManualDateOption(): boolean;

  abstract addSpecialLines(
    data: QuittanceRow[],
    todayAlreadyAdded: boolean,
  ): { data: QuittanceRow[]; addedIndices: number[]; lawChangeIndices: number[] };

  abstract executeEtape1_4(
    raw: QuittanceRow[],
    agence: string,
    contrat: string,
    todayAlreadyAdded: boolean,
  ): Etape1_4Result;

  abstract calculateECAvecPB(data: QuittanceRow[]): QuittanceRow[];
  abstract calculateECSansPB(data: QuittanceRow[]): QuittanceRow[];
}
