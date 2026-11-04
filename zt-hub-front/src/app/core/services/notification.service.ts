import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);

  // Important : on utilise le même préfixe que tes autres services
  private readonly base = `${environment.apiUrl}/api/v1/notifications`;

  sendCredentials(email: string, username: string, password: string): Observable<any> {
    return this.http.post(`${this.base}/send-credentials`, {
      email,
      username,
      password,
      subject: 'Vos identifiants de connexion - Zitouna Takaful',
    });
  }
}