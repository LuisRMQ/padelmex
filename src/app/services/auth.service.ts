import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, throwError } from 'rxjs';
import { ApiBaseService } from './api.service';
import { UserLoginData } from '../../pages/auth/login/login.model';

export interface User {
  id: number;
  email: string;
  name: string;
  lastname: string;
  rol_id: number;
  rol: string;
  club_rfc: string;
  profile_photo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/web';
  private logoutUrl = '';

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserData());

  constructor(private api: ApiBaseService) { }


  getUserById(userId: number): Observable<User> {
    const token = this.getToken();

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    });

    return this.api.get<User>(`/user/${userId}`, { headers }).pipe(
      tap((user: User) => {
        localStorage.setItem('userData', JSON.stringify(user));
        this.currentUserSubject.next(user);
      }),
      catchError((error) => throwError(() => error))
    );
  }


  login(loginData: UserLoginData): Observable<any> {
    const apiData = {
      email: loginData.email.trim(),
      password: loginData.password,
      club_rfc: loginData.club_rfc.trim()
    };

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.api.post<any>(`${this.apiUrl}/login`, apiData, headers).pipe(
      tap((response: any) => {
        if (response.token && response.user) {
          localStorage.setItem('authToken', response.token);
          localStorage.setItem('userData', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
          this.getUserById(response.user.id).subscribe();

        } else if (response.msg === 'incorrect credentials') {
          throw new Error('Credenciales incorrectas');
        } else {
          throw new Error(response.msg || 'Error desconocido en el login');
        }
      }),
      catchError((error) => throwError(() => error))
    );
  }

  logout(): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    });

    return this.api.get<any>(`${this.logoutUrl}/logout`, undefined).pipe(
      tap(() => this.clearLocalStorage()),
      catchError((error) => {
        this.clearLocalStorage();
        return throwError(() => error);
      })
    );
  }

  private clearLocalStorage(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  getCurrentUser(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  getUserData(): User | null {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  }

  getUserName(): string {
    const user = this.getUserData();
    return user ? `${user.name} ${user.lastname}` : 'Usuario';
  }

  getUserRole(): string {
    const user = this.getUserData();
    return user ? user.rol : '';
  }

  getUserClubRfc(): string {
    const user = this.getUserData();
    return user ? user.club_rfc : '';
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('authToken');
  }




}

