import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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


@Injectable({
    providedIn: 'root'
})
export class ClubsService {

    private apiUrl = 'http://127.0.0.1:8000/api/clubs'; 
    private apiUrlCrea = 'http://127.0.0.1:8000/api/create/club'; 
    private apiUrlUpdate = 'http://127.0.0.1:8000/api/update/club';
    private apiUrlDelete = 'http://127.0.0.1:8000/api/delete/club';

    constructor(private http: HttpClient) { }

    getClubs(): Observable<Club[]> {
        return this.http.get<Club[]>(this.apiUrl);
    }

    createClub(data: FormData): Observable<any> {
        return this.http.post(this.apiUrlCrea, data);
    }

    updateClub(id: number, data: Partial<Club>): Observable<any> {
        return this.http.put(`${this.apiUrlUpdate}/${id}`, data);
    }

    deleteClub(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrlDelete}/${id}`);
    }
}


