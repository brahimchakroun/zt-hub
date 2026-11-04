import { Injectable } from '@angular/core';
import { VieCalculatorBaseService } from './calculator-base.service';
import { Etape1_4Result, QuittanceRow, TAUX_PB } from '../calculator.model';

@Injectable({ providedIn: 'root' })
export class MounacibCalculatorService  extends VieCalculatorBaseService{
    override getTauxAcquisition(codeAgence: string): number {
        throw new Error('Method not implemented.');
    }
    override hasManagementFees(): boolean {
        throw new Error('Method not implemented.');
    }
    override hasManualDateOption(): boolean {
        throw new Error('Method not implemented.');
    }
    override addSpecialLines(data: QuittanceRow[], todayAlreadyAdded: boolean): { data: QuittanceRow[]; addedIndices: number[]; lawChangeIndices: number[]; } {
        throw new Error('Method not implemented.');
    }
    override executeEtape1_4(raw: QuittanceRow[], agence: string, contrat: string, todayAlreadyAdded: boolean): Etape1_4Result {
        throw new Error('Method not implemented.');
    }
    override calculateECAvecPB(data: QuittanceRow[]): QuittanceRow[] {
        throw new Error('Method not implemented.');
    }
    override calculateECSansPB(data: QuittanceRow[]): QuittanceRow[] {
        throw new Error('Method not implemented.');
    }

  
  
  
 
}
