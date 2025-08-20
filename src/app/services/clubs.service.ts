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

    private apiUrl = 'http://127.0.0.1:8000/api/clubs'; // 🔹 pon aquí la URL real de tu API
    private apiUrlCrea = 'http://127.0.0.1:8000/api/create/club'; // 🔹 pon aquí la URL real de tu API

    constructor(private http: HttpClient) { }

    getClubs(): Observable<Club[]> {
        return this.http.get<Club[]>(this.apiUrl);
    }

    createClub(data: FormData): Observable<any> {
        return this.http.post(this.apiUrlCrea, data);
    }
}
