// src/app/models/epargne-calcul.model.ts

export interface EpargneCalcul {
  numeroQuittance: string;
  dateCalcul: string;                 // format "dd/MM/yyyy"
  contributionEpargne: number;
  contributionNette: number;
  chargementAcquisition: number;
  ecAvecPb: number;
  ecSansPb: number;
  periodeCourue: number;
}