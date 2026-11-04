// ==========================================================================
// RPA Gateway — TypeScript contracts
// ==========================================================================

/**
 * Configuration shape for the RPA Gateway (lives in environment.rpa).
 */
export interface RpaConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  processCodeDecharge: string;
}

// --------------------------------------------------------------------------
// Auth
// --------------------------------------------------------------------------

export interface RpaAuthRequest {
  clientId: string;
  clientSecret: string;
}

export interface RpaAuthResponse {
  accessToken: string;
  tokenType?: string;
  /** Expressed in SECONDS. */
  expiresIn?: number;
}

// --------------------------------------------------------------------------
// Process request / response
// --------------------------------------------------------------------------

/**
 * Raw payload serialized as JSON inside the RPA request body.
 */
export interface RpaDechargePayload {
  numero_bordereau: string;
  utilisateur_connecte: string;
  requestedBy: string;
  [key: string]: unknown;
}

/**
 * Body sent to POST /api/v1/rpa/requests
 */
export interface RpaSubmitRequest {
  processCode: string;
  businessKey: string;
  /** JSON-stringified {@link RpaDechargePayload}. */
  payload: string;
}

/**
 * Raw (unknown) success payload returned by the RPA Gateway.
 * We intentionally keep it open; the consumer can type it if needed later
 * using a generic parameter or a cast.
 */
export type RpaApiSuccessData = unknown;

/**
 * Shape of an RPA error body returned alongside a non-2xx HTTP status.
 */
export interface RpaApiErrorBody {
  message?: string;
  error?: string;
  code?: string;
  details?: unknown;
  [key: string]: unknown;
}

// --------------------------------------------------------------------------
// Service-level return types
// --------------------------------------------------------------------------

export interface RpaSubmitResult {
  rpaResponse: RpaApiSuccessData;
  payload: RpaSubmitRequest;
}

/**
 * Custom error thrown by {@link RpaGatewayService}.
 */
export class RpaGatewayError extends Error {
  readonly status: number;
  readonly details: RpaApiErrorBody | undefined;

  constructor(message: string, status = 0, details?: RpaApiErrorBody) {
    super(message);
    this.name = 'RpaGatewayError';
    this.status = status;
    this.details = details;
    // Fix prototype chain for instanceof checks in TS targets < ES2015
    Object.setPrototypeOf(this, RpaGatewayError.prototype);
  }
}
