import { Injectable } from '@angular/core';
import { VieCalculatorBaseService } from './calculator-base.service';
import { Etape1_4Result, QuittanceRow, TAUX_PB } from '../calculator.model';

@Injectable({ providedIn: 'root' })
export class MothmerCalculatorService extends VieCalculatorBaseService {

  // =========================================================================
  // TAUX_ACQUISITION — spécifique Mothmer
  //   2, 6, 9, 20 → 0 %
  //   default     → 3 %
  // =========================================================================
  private readonly TAUX_ACQUISITION: Record<string, number> = {
    '2': 0,
    '6': 0,
    '9': 0,
    '20': 0,
  };
  private readonly TAUX_ACQ_DEFAULT = 0.03;

  getTauxAcquisition(codeAgence: string): number {
    if (this.TAUX_ACQUISITION[codeAgence] !== undefined) {
      return this.TAUX_ACQUISITION[codeAgence];
    }
    return this.TAUX_ACQ_DEFAULT;
  }

  hasManagementFees(): boolean { return false; }
  hasManualDateOption(): boolean { return false; }

  // =========================================================================
  // addNewYearLinesToRawData — uniquement 01/01 si changement d'année
  // Ajouté SOIT dans addTodayAndContinue (si today ajouté)
  // SOIT dans executeEtape1_4 (si today pas ajouté)
  // =========================================================================
  addSpecialLines(
    data: QuittanceRow[],
    todayAlreadyAdded: boolean,
  ): { data: QuittanceRow[]; addedIndices: number[]; lawChangeIndices: number[] } {
    const result: QuittanceRow[] = [];
    const addedIndices: number[] = [];

    const sorted = [...data].sort((a, b) =>
      (a.dateCalcul?.getTime() ?? 0) - (b.dateCalcul?.getTime() ?? 0)
    );

    for (let i = 0; i < sorted.length; i++) {
      const currentRow = { ...sorted[i] };
      result.push(currentRow);

      if (i < sorted.length - 1) {
        const currentDate = sorted[i].dateCalcul;
        const nextDate = sorted[i + 1].dateCalcul;

        const currentYear = currentDate.getFullYear();
        const nextYear = nextDate.getFullYear();

        if (nextYear > currentYear) {
          for (let year = currentYear + 1; year <= nextYear; year++) {
            const newYearDate = new Date(year, 0, 1);

            const exists = result.some(row => {
              if (!row.dateCalcul) return false;
              const rowDate = this.cleanDate(row.dateCalcul);
              const newDate = this.cleanDate(newYearDate);
              return rowDate.getTime() === newDate.getTime();
            });

            if (!exists) {
              const newRow: QuittanceRow = {
                numQuittance: '',
                dateEffet: null,
                dateCalcul: newYearDate,
                contribution: 0,
                codeAgence: sorted[i].codeAgence,
                contrat: sorted[i].contrat,
                isNewYear: true,
                yearAdded: year,
              };
              result.push(newRow);
              addedIndices.push(result.length - 1);
            }
          }
        }
      }
    }

    result.sort((a, b) =>
      (a.dateCalcul?.getTime() ?? 0) - (b.dateCalcul?.getTime() ?? 0)
    );

    return { data: result, addedIndices, lawChangeIndices: [] };
  }

  // =========================================================================
  // Étape 1-4 — Préparation (MOTHMER)
  // =========================================================================
  executeEtape1_4(
    raw: QuittanceRow[],
    agence: string,
    contrat: string,
    todayAlreadyAdded: boolean,
  ): Etape1_4Result {
    let data: QuittanceRow[] = raw.map(row => ({
      ...row,
      numQuittance: row.numQuittance || '',
      dateEffet: row.dateEffet || row.dateCalcul,
      dateCalcul: row.dateCalcul,
      contribution: row.contribution || 0,
      codeAgence: agence,
      contrat,
    }));

    data.sort((a, b) => (a.dateCalcul?.getTime() ?? 0) - (b.dateCalcul?.getTime() ?? 0));

    const tauxAcq = this.getTauxAcquisition(agence);
    data = data.map(row => ({
      ...row,
      chargementAcquisition: row.contribution * tauxAcq,
    }));

    data = data.map(row => ({
      ...row,
      contributionNette: row.contribution - (row.chargementAcquisition ?? 0),
    }));

    let highlightedRows: number[] = [];
    if (!todayAlreadyAdded) {
      const special = this.addSpecialLines(data, false);
      data = special.data;
      highlightedRows = special.addedIndices;
    } else {
      data = data.map(row => ({
        ...row,
        ecAvecPB: row.ecAvecPB ?? null,
        ecSansPB: row.ecSansPB ?? null,
      }));
    }

    data = data.map((row, index) => {
      let periodeCourue = 0;
      if (index > 0) {
        const prevDate = data[index - 1].dateCalcul;
        periodeCourue = this.daysBetween(prevDate, row.dateCalcul);
      }
      return {
        ...row,
        periodeCourue,
        ecAvecPB: row.ecAvecPB ?? null,
        ecSansPB: row.ecSansPB ?? null,
      };
    });

    return {
      data,
      highlightedRows,
      lawChangeRowIndex: -1,
    };
  }

  // =========================================================================
  // Calcul EC avec PB — MOTHMER
  // Normal rows: ec = prevEC * (1 + tauxPB)^(days/365) + contributionNette
  // NewYear rows: ec = prevEC * (1 + TAUX_PB[yearAdded-1])^(days/365) + contributionNette
  // =========================================================================
  calculateECAvecPB(data: QuittanceRow[]): QuittanceRow[] {
    const result: QuittanceRow[] = [...data];
    let ecAvecPB = 0;
    let firstValueSet = false;

    for (let index = 0; index < result.length; index++) {
      const row = result[index];
      let newECAvecPB: number | null = null;

      if (row.isNewYear) {
        if (index > 0) {
          let prevEC = ecAvecPB;
          for (let j = index - 1; j >= 0; j--) {
            if (result[j].ecAvecPB !== null && result[j].ecAvecPB !== undefined) {
              prevEC = result[j].ecAvecPB as number;
              break;
            }
          }

          const prevYear = (row.yearAdded ?? 0) - 1;
          const tauxPB = TAUX_PB[prevYear] || 0;
          const bloc = Math.pow(1 + tauxPB, (row.periodeCourue ?? 0) / 365);

          ecAvecPB = prevEC * bloc + (row.contributionNette ?? 0);
          newECAvecPB = ecAvecPB;
        }
      } else {
        if (!firstValueSet) {
          ecAvecPB = row.contributionNette ?? 0;
          firstValueSet = true;
          newECAvecPB = ecAvecPB;
        } else {
          let prevEC = ecAvecPB;
          for (let j = index - 1; j >= 0; j--) {
            if (result[j].ecAvecPB !== null && result[j].ecAvecPB !== undefined) {
              prevEC = result[j].ecAvecPB as number;
              break;
            }
          }

          const tauxPB = this.getTauxPB(row.dateCalcul);
          const bloc = Math.pow(1 + tauxPB, (row.periodeCourue ?? 0) / 365);

          ecAvecPB = prevEC * bloc + (row.contributionNette ?? 0);
          newECAvecPB = ecAvecPB;
        }
      }

      result[index] = { ...row, ecAvecPB: newECAvecPB };
    }

    return result;
  }

  // =========================================================================
  // Calcul EC sans PB — MOTHMER
  // Toutes lignes: ec = prevEC * 1 + contributionNette (somme)
  // =========================================================================
  calculateECSansPB(data: QuittanceRow[]): QuittanceRow[] {
    const result: QuittanceRow[] = [...data];
    let ecSansPB = 0;
    let firstValueSet = false;

    for (let index = 0; index < result.length; index++) {
      const row = result[index];
      let newECSansPB: number | null = null;

      if (row.isNewYear) {
        if (index > 0) {
          let prevEC = ecSansPB;
          for (let j = index - 1; j >= 0; j--) {
            if (result[j].ecSansPB !== null && result[j].ecSansPB !== undefined) {
              prevEC = result[j].ecSansPB as number;
              break;
            }
          }

          ecSansPB = prevEC * 1 + (row.contributionNette ?? 0);
          newECSansPB = ecSansPB;
        }
      } else {
        if (!firstValueSet) {
          ecSansPB = row.contributionNette ?? 0;
          firstValueSet = true;
          newECSansPB = ecSansPB;
        } else {
          let prevEC = ecSansPB;
          for (let j = index - 1; j >= 0; j--) {
            if (result[j].ecSansPB !== null && result[j].ecSansPB !== undefined) {
              prevEC = result[j].ecSansPB as number;
              break;
            }
          }

          ecSansPB = prevEC * 1 + (row.contributionNette ?? 0);
          newECSansPB = ecSansPB;
        }
      }

      result[index] = { ...row, ecSansPB: newECSansPB };
    }

    return result;
  }
}
