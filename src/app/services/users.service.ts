import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiBaseService } from './api.service';
import { map } from 'rxjs/operators';
import { HttpParams } from '@angular/common/http';

export interface User {
    id?: number;
    name: string;
    lastname: string;
    email: string;
    password?: string;
    gender: string;
    phone: string;
    area_code: string;
    club_id: number;
    profile_photo: string | null;
    rol?: string;
    category?: string;
    rol_id?: number;
    category_id?: number;
    created_at?: string;
    updated_at?: string;
}

export interface UsersResponse {
    current_page: number;
    data: User[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: any[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
}

export interface Reservation {
    reservationId: number;
    date: string;
    start_time: string;
    end_time: string;
    duration: string;
    max_players: number;
    current_players: number;
    pay_method: string;
    observations: string | null;
    totalCourtForHour: string;
    commission: string;
    totalToPay: string;
    typeGame: string;
    status: string;
    userId: number;
    user: string;
    lastname: string;
    courtId: number;
    court: string;
    sponsor: string;
    club: string;
    address: string;
    typeReservation: string;
    category: string | null;
    level: string | null;
    gender: string | null;
}

export interface ReservationsResponse {
    current_page: number;
    data: Reservation[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: any[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
}

export interface Club {
    id: number;
    name: string;
}

@Injectable({
    providedIn: 'root'
})
export class UsersService extends ApiBaseService {

    getUsers(): Observable<User[]> {
        return this.get<{ success: boolean, data: User[] }>('/users')
            .pipe(
                map(res => res.data)
            );
    }

    getClubs(): Observable<Club[]> {
        return this.get<any>('/clubs').pipe(map(response => response.data));
    }

    searchUsers(searchTerm: string, club_id?: number): Observable<User[]> {
        let params = new HttpParams()
            .set('rol_id', '')
            .set('category_id', '')
            .set('name', searchTerm || '')
            .set('lastname', '')
            .set('club_id', club_id ? club_id.toString() : '');

        console.log('Search params:', params.toString());

        return this.get<UsersResponse>('/users', params).pipe(
            map(response => response.data)
        );
    }

    createUser(data: FormData): Observable<any> {
        return this.post('/user/create', data);
    }

    getUsersByRol(rol_id: number): Observable<User[]> {
        return this.get<{ success: boolean, data: User[] }>(`/users?rol_id=${rol_id}`)
            .pipe(
                map(res => res.data)
            );
    }

    // updateUserById(id: number, data: any) {
    //     const isFormData = data instanceof FormData;
    //     if (isFormData) {
    //         return this.post(`/user/update/${id}`, data);
    //     } else {
    //         return this.put(`/user/update/${id}`, data);
    //     }
    // }

    updateUserById(id: number, data: any) {
        // Siempre usar PUT
        return this.put(`/user/update/${id}`, data);
    }


    deleteUser(id: number): Observable<any> {
        return this.delete(`/user/delete/${id}`);
    }

    uploadProfilePhoto(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        return this.post('/upload/profile-photo', formData);
    }

    desactivarUser(id: number): Observable<any> {
        return this.delete(`/user/disabled/${id}`);
    }

   getUserReservations(user_id: number): Observable<Reservation[]> {
        return this.get<ReservationsResponse>(`/reservations?user_id=${user_id}`).pipe(
            map(res => res.data) 
        );
    }
    
}