// ==========================================================================
// Calculator Vie — contrats locaux (identiques à ceux de CS\Vie)
// ==========================================================================

export type ProductType = 'mothmer' | 'moucened' | 'dirassa' |'mounacib';

export interface ProductMeta {
  id: ProductType;
  label: string;
  description: string;
  hasManagementFees: boolean;
  managementFeesRate?: string;
  hasManualDateOption: boolean;
  hasManualFeesOption: boolean;
  isOnlyApi: boolean;
}

export interface QuittanceRow {
  numQuittance: string;
  dateEffet: Date | null;
  dateCalcul: Date;
  periodeCourue?: number;
  contribution: number;
  chargementAcquisition?: number;
  contributionNette?: number;
  ecAvecPB?: number | null;
  ecSansPB?: number | null;
  codeAgence: string;
  contrat: string;
  isToday?: boolean;
  isManual?: boolean;
  isLawChange?: boolean;
  isNewYear?: boolean;
  yearAdded?: number;
}

export interface CalculationStats {
  totalEncaisse: number;
  totalNet: number;
  finalECPB: number;
  finalECSansPB: number;
}

export interface Etape1_4Result {
  data: QuittanceRow[];
  highlightedRows: number[];
  lawChangeRowIndex: number;
}

export const TAUX_PB: Record<number, number> = {
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
  2026: 0.0500,
};

export const VIE_PRODUCTS: ProductMeta[] = [
  { id: 'mothmer',              label: 'MOTHMER',                 description: 'Produit d\'épargne classique', hasManagementFees: false, hasManualDateOption: false, hasManualFeesOption: false, isOnlyApi: false },
  { id: 'moucened',             label: 'MOUCENED',                description: 'Produit d\'épargne avec frais de gestion', hasManagementFees: true, managementFeesRate: '1.0% → 1.2%',  hasManualDateOption: true, hasManualFeesOption: false, isOnlyApi: false  },
  { id: 'dirassa',              label: 'DIRASSA',                 description: 'Produit d\'épargne avec frais de gestion', hasManagementFees: true, managementFeesRate: '1.0% → 1.2%',  hasManualDateOption: true, hasManualFeesOption: true, isOnlyApi: false  },
  { id: 'mounacib',             label: 'MOUNACIB',                description: 'Produit d\'épargne avec frais de gestion', hasManagementFees: true, managementFeesRate: '0.6% → 0%', hasManualDateOption: true, hasManualFeesOption: true, isOnlyApi: true }

];

export interface FileProcessResult {
  rawData: QuittanceRow[];
  contrat: string;
  agence: string;
}


// src/app/models/epargne-calcul.model.ts

export interface EpargneCalculRows {
  numeroQuittance: string;
  dateCalcul: string;                 // format "dd/MM/yyyy"
  contributionEpargne: number;
  contributionNette: number;
  periodeCourue: number;
  chargementAcquisition: number;
  ecAvecPb: number;
  ecSansPb: number;
}

export interface PoliceEpargneInfo {
  numeroPolice: string;
  codeAgence: string;
  dateEcheancePrincipale: string;      // format "dd/MM/yyyy"
  dateEffetPolice: string;                 // format "dd/MM/yyyy"
  dateExpiration: string;      // format "dd/MM/yyyy" 
  dureeContrat: number;
  
}


export interface EpargneCalculResult {
  police: PoliceEpargneInfo;
  calculs: EpargneCalculRows[];
}
