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
  commission: number;
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
  last_page: number;
}


export interface CourtClosedDay {
  id: number;
  court_id: number;
  date: string;
  reason?: string;
  created_at?: string;
  updated_at?: string;
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

  getCourtsByClub(clubId: number, limit: number = 5, page: number = 1): Observable<CourtsResponse> {
    let params = new HttpParams()
      .append('club_id', clubId.toString())
      .append('limit', limit.toString())
      .append('page', page.toString());
    return this.get<CourtsResponse>('/courts', params);
  }

  updateCourt(id: number, data: Partial<Court> | FormData): Observable<any> {
    console.log('=== SERVICE UPDATE COURT DEBUG ===');
    console.log('Court ID:', id);
    console.log('Data type:', data instanceof FormData ? 'FormData' : 'Object');

    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      return this.post(`/court/update/${id}`, data);
    } else {
      return this.put(`/court/update/${id}`, data);
    }
  }

  deleteCourt(id: number, club_id: number): Observable<any> {
    return this.delete(`/court/delete/${id}`, { body: { club_id } });
  }



  // === COURT CLOSED DAYS ===
  getCourtClosedDays(): Observable<CourtClosedDay[]> {
    return this.get<any>('/courtClosedDays').pipe(map(response => response.data));
  }

  getCourtClosedDayById(id: number): Observable<CourtClosedDay> {
    return this.get<any>(`/courtClosedDays/${id}`).pipe(map(response => response.data));
  }

  // Filtra por cancha desde el front
  getCourtClosedDaysByCourt(courtId: number): Observable<CourtClosedDay[]> {
  const params = new HttpParams().set('court_id', courtId.toString());
  return this.get<any>('/courtClosedDays', params).pipe(
    map(response => response.data)
  );
}

  createCourtClosedDay(data: Partial<CourtClosedDay>): Observable<any> {
    return this.post('/courtClosedDays/create', data);
  }

  updateCourtClosedDay(id: number, data: Partial<CourtClosedDay>): Observable<any> {
    return this.put(`/courtClosedDays/update/${id}`, data);
  }

  deleteCourtClosedDay(id: number): Observable<any> {
    return this.delete(`/courtClosedDays/delete/${id}`);
  }


}