import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ApiBaseService } from './api.service';

export interface Reservation {
    reservationId: number;
    date: string;
    start_time: string;
    end_time: string;
    duration: string;
    pay_method: string;
    observations: string | null;
    total_court: string;
    commission: string;
    total: string;
    status: string;
    userId: number;
    user: string;
    lastname: string;
    court: string;
    sponsor: string;
    club: string;
    address: string;
    court_id?: number; // Agregado para mapeo
}

export interface ReservationsResponse {
    current_page: number;
    data: Reservation[];
    per_page: number;
    total: number;
}

export interface ReservationFilters {
    user_id?: string;
    userName?: string;
    userLastName?: string;
    club_id?: string;
    court_id?: string;
    date?: string;
    status?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ReservationService extends ApiBaseService {

    getReservations(filters: ReservationFilters = {}): Observable<ReservationsResponse> {
        let params = new HttpParams();

        // Agregar filtros a los parámetros
        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                params = params.append(key, value.toString());
            }
        });

        return this.get<ReservationsResponse>('/reservations', params);
    }

    createReservation(reservationData: any): Observable<any> {
        return this.post('/reservation/create', reservationData);
    }

    updateReservation(id: number, data: Partial<Reservation>): Observable<any> {
        return this.put(`/reservation/update/${id}`, data);
    }

    deleteReservation(id: number): Observable<any> {
        return this.delete(`/reservation/delete/${id}`);
    }
}