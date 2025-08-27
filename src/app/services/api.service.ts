import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiBaseService {
  protected apiUrl = 'http://137.184.178.6/api';

  constructor(protected http: HttpClient) {}

  get<T>(endpoint: string, params?: HttpParams): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}${endpoint}`, { params, observe: 'body' });
  }

  post<T>(endpoint: string, data: any, headers?: HttpHeaders): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}${endpoint}`, data, { headers, observe: 'body' });
  }

  put<T>(endpoint: string, data: any, headers?: HttpHeaders): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}${endpoint}`, data, { headers, observe: 'body' });
  }

  delete<T>(
    endpoint: string,
    options?: { headers?: HttpHeaders; params?: HttpParams; body?: any }
  ): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}${endpoint}`, { ...options, observe: 'body' });
  }
}
