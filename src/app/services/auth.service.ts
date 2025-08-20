import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    rfc?: string;
  };
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rfc?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl + '/web/login'; // Ajusta la URL según tu API

  constructor(private http: HttpClient) { }

  login(loginData: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.apiUrl, loginData);
  }

  // Opcional: Guardar token en localStorage
  setToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  // Opcional: Obtener token
  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  // Opcional: Eliminar token (logout)
  logout(): void {
    localStorage.removeItem('authToken');
  }
}