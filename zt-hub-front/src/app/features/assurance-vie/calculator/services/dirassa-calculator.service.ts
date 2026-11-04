import { Injectable } from '@angular/core';
import { VieCalculatorBaseService } from './calculator-base.service';
import { Etape1_4Result, QuittanceRow, TAUX_PB } from '../calculator.model';

@Injectable({ providedIn: 'root' })
export class DirassaCalculatorService extends VieCalculatorBaseService {

  // =========================================================================
  // TAUX_ACQUISITION — spécifique Dirassa (toujours 0)
  // =========================================================================
  private readonly TAUX_ACQUISITION_DEFAULT = 0;

  // =========================================================================
  // FRAIS DE GESTION (changement de loi)
  //   Jusqu'au 31/10/2025 inclus : 1.0 %
  //   À compter du 01/11/2025    : 1.2 %
  // =========================================================================
  private readonly DATE_FIN_ANCIEN_TAUX = new Date(2025, 9, 31); // 31/10/2025 inclus
  private readonly CHARGEMENT_AVANT = 0.01;   // 1.0 %
  private readonly CHARGEMENT_APRES = 0.012;  // 1.2 %
  private readonly DATE_CHANGEMENT_LOI = new Date(2025, 9, 31);  // 31/10/2025

  getTauxAcquisition(_codeAgence: string): number {
    return this.TAUX_ACQUISITION_DEFAULT;
  }

  hasManagementFees(): boolean { return true; }
  hasManualDateOption(): boolean { return true; }

  getChargement(date: Date, chargementApres = this.CHARGEMENT_APRES): number {
    const d = this.cleanDate(date);
    const dateFin = this.cleanDate(this.DATE_FIN_ANCIEN_TAUX);
    if (d.getTime() > dateFin.getTime()) {
      return chargementApres;
    }
    return this.CHARGEMENT_AVANT;
  }

  // =========================================================================
  // addSpecialLines — Dirassa
  // 1. Lignes 01/01 : ajoutées si changement d'année
  // 2. Ligne 31/10/2025 : TOUJOURS ajoutée.
  //    - Si doublon avec ligne source → doublon rose APRÈS la ligne source
  // =========================================================================
  addSpecialLines(
    data: QuittanceRow[],
    _todayAlreadyAdded: boolean,
  ): { data: QuittanceRow[]; addedIndices: number[]; lawChangeIndices: number[] } {
    const result: QuittanceRow[] = [];
    const sorted = [...data].sort((a, b) =>
      (a.dateCalcul?.getTime() ?? 0) - (b.dateCalcul?.getTime() ?? 0)
    );

    const lawChangeDate = this.cleanDate(this.DATE_CHANGEMENT_LOI);
    let lawChangeAdded = false;

    for (let i = 0; i < sorted.length; i++) {
      const currentRow = { ...sorted[i] };
      const currentDateClean = this.cleanDate(currentRow.dateCalcul);

      if (!lawChangeAdded && currentDateClean.getTime() > lawChangeDate.getTime()) {
        const lawRow: QuittanceRow = {
          numQuittance: '',
          dateEffet: null,
          dateCalcul: new Date(lawChangeDate),
          contribution: 0,
          codeAgence: currentRow.codeAgence,
          contrat: currentRow.contrat,
          isLawChange: true,
          chargementAcquisition: 0,
          contributionNette: 0,
        };
        result.push(lawRow);
        lawChangeAdded = true;
      }

      result.push(currentRow);

      if (!lawChangeAdded && currentDateClean.getTime() === lawChangeDate.getTime()) {
        const lawRow: QuittanceRow = {
          numQuittance: '',
          dateEffet: null,
          dateCalcul: new Date(lawChangeDate),
          contribution: 0,
          codeAgence: currentRow.codeAgence,
          contrat: currentRow.contrat,
          isLawChange: true,
          chargementAcquisition: 0,
          contributionNette: 0,
        };
        result.push(lawRow);
        lawChangeAdded = true;
      }

      if (i < sorted.length - 1) {
        const nextDate = sorted[i + 1].dateCalcul;
        const nextDateClean = this.cleanDate(nextDate);

        const currentYear = currentDateClean.getFullYear();
        const nextYear = nextDateClean.getFullYear();

        if (nextYear > currentYear) {
          for (let year = currentYear + 1; year <= nextYear; year++) {
            const newYearDate = this.cleanDate(new Date(year, 0, 1));

            if (!lawChangeAdded &&
                lawChangeDate.getTime() > currentDateClean.getTime() &&
                lawChangeDate.getTime() < newYearDate.getTime()) {
              const lawRow: QuittanceRow = {
                numQuittance: '',
                dateEffet: null,
                dateCalcul: new Date(lawChangeDate),
                contribution: 0,
                codeAgence: currentRow.codeAgence,
                contrat: currentRow.contrat,
                isLawChange: true,
                chargementAcquisition: 0,
                contributionNette: 0,
              };
              result.push(lawRow);
              lawChangeAdded = true;
            }

            const newRow: QuittanceRow = {
              numQuittance: '',
              dateEffet: null,
              dateCalcul: newYearDate,
              contribution: 0,
              codeAgence: currentRow.codeAgence,
              contrat: currentRow.contrat,
              isNewYear: true,
              yearAdded: year,
              chargementAcquisition: 0,
              contributionNette: 0,
            };
            result.push(newRow);
          }
        }
      }
    }

    if (!lawChangeAdded && sorted.length > 0) {
      const lastDate = sorted[sorted.length - 1].dateCalcul;
      const lastDateClean = this.cleanDate(lastDate);
      if (lawChangeDate.getTime() > lastDateClean.getTime()) {
        const lawRow: QuittanceRow = {
          numQuittance: '',
          dateEffet: null,
          dateCalcul: new Date(lawChangeDate),
          contribution: 0,
          codeAgence: sorted[sorted.length - 1].codeAgence,
          contrat: sorted[sorted.length - 1].contrat,
          isLawChange: true,
          chargementAcquisition: 0,
          contributionNette: 0,
        };
        result.push(lawRow);
      }
    }

    result.sort((a, b) => {
      const diff = (a.dateCalcul?.getTime() ?? 0) - (b.dateCalcul?.getTime() ?? 0);
      if (diff !== 0) return diff;
      if (a.isLawChange && !b.isLawChange) return 1;
      if (!a.isLawChange && b.isLawChange) return -1;
      return 0;
    });

    const updatedAddedIndices: number[] = [];
    const updatedLawChangeIndices: number[] = [];
    result.forEach((row, index) => {
      if (row.isNewYear) updatedAddedIndices.push(index);
      if (row.isLawChange) updatedLawChangeIndices.push(index);
    });

    return {
      data: result,
      addedIndices: updatedAddedIndices,
      lawChangeIndices: updatedLawChangeIndices,
    };
  }

  // =========================================================================
  // Étape 1-4 — Préparation (Dirassa)
  // Toujours ajouter lignes spéciales DANS étape 1-4
  // =========================================================================
  executeEtape1_4(
    raw: QuittanceRow[],
    agence: string,
    contrat: string,
    _todayAlreadyAdded: boolean,
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

    const special = this.addSpecialLines(data, false);
    data = special.data;

    data = data.map((row, index) => {
      let periodeCourue = 0;
      if (index > 0) {
        periodeCourue = this.daysBetween(data[index - 1].dateCalcul, row.dateCalcul);
      }
      return {
        ...row,
        periodeCourue,
        ecAvecPB: null,
        ecSansPB: null,
      };
    });

    return {
      data,
      highlightedRows: special.addedIndices,
      lawChangeRowIndex: special.lawChangeIndices.length > 0 ? special.lawChangeIndices[0] : -1,
    };
  }

  // =========================================================================
  // Calcul EC avec PB — Dirassa
  // Toutes lignes: ec = prevEC * ((1 + tauxPB) * (1 - chargement))^(days/365) + net
  // NewYear: tauxPB = TAUX_PB[yearAdded-1]
  // LawChange: tauxPB = getTauxPB(row.dateCalcul)
  // =========================================================================
  calculateECAvecPB(data: QuittanceRow[], chargementApres = this.CHARGEMENT_APRES): QuittanceRow[] {
    const result: QuittanceRow[] = [...data];
    let ecAvecPB = 0;
    let firstValueSet = false;

    for (let index = 0; index < result.length; index++) {
      const row = result[index];
      let newECAvecPB: number | null = null;

      if (row.isNewYear || row.isLawChange) {
        if (index > 0) {
          let prevEC = ecAvecPB;
          for (let j = index - 1; j >= 0; j--) {
            if (result[j].ecAvecPB !== null && result[j].ecAvecPB !== undefined) {
              prevEC = result[j].ecAvecPB as number;
              break;
            }
          }

          let tauxPB: number;
          if (row.isNewYear) {
            tauxPB = TAUX_PB[(row.yearAdded ?? 0) - 1] || 0;
          } else {
            tauxPB = this.getTauxPB(row.dateCalcul);
          }

          const chargement = this.getChargement(row.dateCalcul, chargementApres);
          const bloc = Math.pow(
            (1 + tauxPB) * (1 - chargement),
            (row.periodeCourue ?? 0) / 365
          );

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
          const chargement = this.getChargement(row.dateCalcul, chargementApres);
          const bloc = Math.pow(
            (1 + tauxPB) * (1 - chargement),
            (row.periodeCourue ?? 0) / 365
          );

          ecAvecPB = prevEC * bloc + (row.contributionNette ?? 0);
          newECAvecPB = ecAvecPB;
        }
      }

      result[index] = { ...row, ecAvecPB: newECAvecPB };
    }

    return result;
  }

  // =========================================================================
  // Calcul EC sans PB — Dirassa
  // Toutes lignes: ec = prevEC * ((1 + 0) * (1 - chargement))^(days/365) + net
  // =========================================================================
  calculateECSansPB(data: QuittanceRow[], chargementApres = this.CHARGEMENT_APRES): QuittanceRow[] {
    const result: QuittanceRow[] = [...data];
    let ecSansPB = 0;
    let firstValueSet = false;

    for (let index = 0; index < result.length; index++) {
      const row = result[index];
      let newECSansPB: number | null = null;

      if (row.isNewYear || row.isLawChange) {
        if (index > 0) {
          let prevEC = ecSansPB;
          for (let j = index - 1; j >= 0; j--) {
            if (result[j].ecSansPB !== null && result[j].ecSansPB !== undefined) {
              prevEC = result[j].ecSansPB as number;
              break;
            }
          }

          const chargement = this.getChargement(row.dateCalcul, chargementApres);
          const bloc = Math.pow(
            (1 + 0) * (1 - chargement),
            (row.periodeCourue ?? 0) / 365
          );

          ecSansPB = prevEC * bloc + (row.contributionNette ?? 0);
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

          const chargement = this.getChargement(row.dateCalcul, chargementApres);
          const bloc = Math.pow(
            (1 + 0) * (1 - chargement),
            (row.periodeCourue ?? 0) / 365
          );

          ecSansPB = prevEC * bloc + (row.contributionNette ?? 0);
          newECSansPB = ecSansPB;
        }
      }

      result[index] = { ...row, ecSansPB: newECSansPB };
    }

    return result;
  }
}
