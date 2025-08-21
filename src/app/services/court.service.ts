import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export interface Court {
  name: string;
  sponsor: string;
  type: string;
  club_id: number;
  availability: number;
  photo: string;
}

export interface Club {
  id: number;
  name: string;
  // otros campos que tenga tu club
}

export interface CourtsResponse {
  current_page: number;
  data: Court[];
  per_page: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class CourtService {
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) { }

  getClubs(): Observable<Club[]> {
    return this.http.get<any>(`${this.apiUrl}/clubs`).pipe(
      map(response => response.data)
    );
  }
  createCourt(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/court/create`, formData);
  }
  getCourtsByClub(clubId: number, limit: number = 5): Observable<CourtsResponse> {
    let params = new HttpParams();
    params = params.append('club_id', clubId.toString());
    params = params.append('limit', limit.toString());

    return this.http.get<CourtsResponse>(`${this.apiUrl}/courts`, { params });
  }
}