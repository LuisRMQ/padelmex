import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiBaseService } from './api.service';

export interface Club {
    id: number;
    name: string;
    address: string;
    rfc: string;
    type: string;
    phone: string;
    email: string;
    web_site: string;
    city_id: number;
    logo: string;
    status: boolean;
    created_at: string;
    updated_at: string;
}

export interface ClubsResponse {
  current_page: number;
  data: Club[];
  total: number;
  per_page: number;
}

@Injectable({
    providedIn: 'root'
})
export class ClubsService extends ApiBaseService {
    getClubs(): Observable<Club[]> {
        return this.get<Club[]>('/clubs');
    }
    getClubById(id: number): Observable<Club> {
        return this.get<Club>(`/club/${id}`);
    }
    createClub(data: FormData): Observable<any> {
        return this.post('/create/club', data);
    }

    updateClub(id: number, data: Partial<Club> | FormData): Observable<any> {
        return this.put(`/update/club/${id}`, data);
    }

    deleteClub(id: number): Observable<any> {
        return this.delete(`/delete/club/${id}`);
    }

    getClubsa(): Observable<ClubsResponse> {
        return this.get<ClubsResponse>('/clubs');
    }
}


