import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ApiBaseService } from './api.service';

export interface Court {
  id: number;
  name: string;
  sponsor: string;
  type: string;
  club_id: number;
  availability: number;
  photo: string;
  price_hour?: number;
}

export interface Club {
  id: number;
  name: string;
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
export class CourtService extends ApiBaseService {
  getClubs(): Observable<Club[]> {
    return this.get<any>('/clubs').pipe(map(response => response.data));
  }

  createCourt(formData: FormData): Observable<any> {
    return this.post('/court/create', formData);
  }

  getCourtsByClub(clubId: number, limit: number = 5): Observable<CourtsResponse> {
    let params = new HttpParams()
      .append('club_id', clubId.toString())
      .append('limit', limit.toString());
    return this.get<CourtsResponse>('/courts', params);
  }

  updateCourt(id: number, data: Partial<Court> | FormData): Observable<any> {
    return this.put(`/court/update/${id}`, data);
  }

  deleteCourt(id: number, club_id: number): Observable<any> {
    return this.delete(`/court/delete/${id}`, { body: { club_id } });
  }
}