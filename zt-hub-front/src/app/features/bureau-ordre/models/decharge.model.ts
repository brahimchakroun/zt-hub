export interface DechargeRequest {
    numeroBordereau: string;
    contrat?: string;
    adherent?: string;
    rawContent?: string;
    extra?: string;
}

export interface DechargeSuccessData {
    reference: string;
    numeroBordereau: string;
    processedAt: string;
    rpaRequestId?: string | null;
}

export interface DechargeResponse {
    success: boolean;
    message?: string;
    error?: string;
    code?: string;
    details?: string;
    data?: DechargeSuccessData;
}

export type DechargeStep = 'scan' | 'confirm' | 'loading' | 'success' | 'error';