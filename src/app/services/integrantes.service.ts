import { Injectable } from '@angular/core';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiBaseService } from './api.service';
import { AuthService } from './auth.service';

export interface Integrante {
  id: number;
  name: string;
  lastname: string;
  email: string;
  rol_id: number;
  club_id: number;
  category_id?: number;
  profile_photo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class IntegrantesService {
  private apiUrl = '/users';

  constructor(
    private api: ApiBaseService,
    private authService: AuthService
  ) {}

  getIntegrantes(): Observable<Integrante[]> {
    const token = this.authService.getToken();
    const user = this.authService.getUserData();

    if (!user?.club_id) {
      return throwError(() => new Error('No se encontró el club_id del usuario'));
    }

    // 🔹 Query params para GET
    const params = new HttpParams().set('club_id', user.club_id.toString());

    // 🔹 Headers para autenticación
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    });

    // 🔹 Llamada GET con query params
    return this.api.get<Integrante[]>(this.apiUrl + `?${params.toString()}`, { headers }).pipe(
      tap(res => console.log('Integrantes del club:', res)),
      catchError(err => throwError(() => err))
    );
  }

  getIntegranteById(id: number): Observable<Integrante> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    });

    return this.api.get<Integrante>(`${this.apiUrl}/${id}`, { headers });
  }
}
