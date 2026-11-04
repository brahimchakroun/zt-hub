import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LettreEpargneService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl + '/api/v1/apiproassure';

  downloadPdfLettre(numeroPolice: string): Observable<Blob> {
    return this.http.get(`${this.base}/policeEpargneLettre`, {
      params: { numeroPolice },
      responseType: 'blob',
    });
  }
}
