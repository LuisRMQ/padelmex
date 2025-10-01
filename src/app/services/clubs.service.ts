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


export interface ClubAmenity {
    id: number;
    club_id: number;
    amenity_id: number;
    created_at: string;
    updated_at: string;
}

export interface Comidad {
    id?: number;
    name: string;
    created_at?: string;
    updated_at?: string;
}

export interface ClubClosedDay {
    id?: number;
    club_id: number;
    date: string;
    reason?: string;
    created_at?: string;
    updated_at?: string;
}


export interface ClubAmenityWithName {
    id: number;
    amenity_name: string;
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

    // updateClub(id: number, data: Partial<Club> | FormData): Observable<any> {
    //     return this.put(`/update/club/${id}`, data);
    // }


    updateClub(id: number, data: Partial<Club> | FormData): Observable<any> {
       
    
        if (data instanceof FormData) {
          data.append('_method', 'PUT');
          return this.post(`/update/club/${id}`, data);
        } else {
          return this.put(`/update/club/${id}`, data);
        }
      }

    deleteClub(id: number): Observable<any> {
        return this.delete(`/delete/club/${id}`);
    }

    getClubsa(): Observable<ClubsResponse> {
        return this.get<ClubsResponse>('/clubs');
    }


    // ================================
    // 📌 CLUB AMENITIES
    // ================================
    getClubAmenities(club_id: number): Observable<ClubAmenityWithName[]> {
        return this.get<ClubAmenityWithName[]>(`/clubAmenities?club_id=${club_id}`);
    }

    getClubAmenityById(id: number): Observable<ClubAmenity> {
        return this.get<ClubAmenity>(`/clubAmenities/${id}`);
    }

    createClubAmenity(clubId: number, amenityId: number) {
        const body = { club_id: clubId, amenity_id: amenityId };
        return this.post('/clubAmenities/create', body);
    }
    updateClubAmenity(clubId: number, amenities: number[]) {
        const params = amenities.map(id => `amenity_id[]=${id}`).join('&');
        const url = `/clubAmenities/create?club_id=${clubId}&${params}`;

        return this.post(url, {});
    }

    deleteClubAmenity(id: number): Observable<any> {
        return this.delete(`/clubAmenities/delete/${id}`);
    }


    //Comidades 
    getComidades(): Observable<Comidad[]> {
        return this.get<Comidad[]>('/amenities');

    }

    // ================================
    // 📌 CLUB CLOSED DAYS
    // ================================

    getClubClosedDays(): Observable<ClubClosedDay[]> {
        return this.get<ClubClosedDay[]>('/clubClosedDays');
    }

    createClubClosedDay(data: { club_id: number; date: string; reason?: string }): Observable<ClubClosedDay> {
        return this.post<ClubClosedDay>('/clubClosedDays/create', data);
    }

    getClubClosedDayById(id: number): Observable<ClubClosedDay> {
        return this.get<ClubClosedDay>(`/clubClosedDays/${id}`);
    }

    updateClubClosedDay(id: number, data: Partial<ClubClosedDay>): Observable<ClubClosedDay> {
        return this.put<ClubClosedDay>(`/clubClosedDays/update/${id}`, data);
    }

    deleteClubClosedDay(id: number): Observable<any> {
        return this.delete(`/clubClosedDays/delete/${id}`);
    }
}


