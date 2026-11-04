import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DechargeRequest, DechargeResponse, DechargeSuccessData } from '../models/decharge.model';
import { RpaGatewayService } from '../../../core/services/rpa-gateway.service';
import { RpaGatewayError } from '../../../core/models/rpa-gateway.model';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({ providedIn: 'root' })
export class DechargeService {
    private readonly rpa = inject(RpaGatewayService);
    private readonly auth = inject(AuthService);

    /**
     * Délégué à RpaGatewayService.submitDecharge (PROC_GED_DECHARGE_BORD)
     * puis transforme la réponse brute RPA en {@link DechargeResponse} pour
     * rester compatible avec le composant DechargeBordereauxComponent.
     */
    submitDecharge(payload: DechargeRequest): Observable<DechargeResponse> {
        const user = this.auth.currentUser();

        return this.rpa.submitDecharge(payload.numeroBordereau, user ?? { name: 'Utilisateur Zitouna' }).pipe(
            map(({ rpaResponse, payload: rpaPayload }) => {
                // Extrait les champs typiques si la réponse RPA est un objet,
                // sinon on build un DechargeSuccessData minimal à partir du
                // businessKey et du numeroBordereau.
                const rpaObj = (rpaResponse ?? {}) as Record<string, unknown>;
                const rpaRequestId =
                    (rpaObj['id'] as string | undefined) ??
                    (rpaObj['requestId'] as string | undefined) ??
                    null;

                const data: DechargeSuccessData = {
                    reference:
                        (rpaObj['reference'] as string | undefined) ??
                        rpaPayload.businessKey,
                    numeroBordereau: payload.numeroBordereau,
                    processedAt:
                        (rpaObj['processedAt'] as string | undefined) ??
                        new Date().toISOString(),
                    rpaRequestId,
                };

                return {
                    success: true,
                    message:
                        (rpaObj['message'] as string | undefined) ??
                        'Décharge bordereau soumise au RPA Gateway.',
                    data,
                };
            }),
            catchError((err: unknown) => {
                // Normalise en DechargeResponse success:false pour que le
                // composant lise res.error / res.message comme avant.
                if (err instanceof RpaGatewayError) {
                    return [{
                        success: false,
                        message: err.message,
                        error: err.message,
                        code: err.status ? String(err.status) : undefined,
                        details: err.details ? JSON.stringify(err.details) : undefined,
                    } as DechargeResponse];
                }
                const msg = err instanceof Error ? err.message : 'Erreur RPA inattendue.';
                return [{
                    success: false,
                    message: msg,
                    error: msg,
                } as DechargeResponse];
            })
        );
    }
}
