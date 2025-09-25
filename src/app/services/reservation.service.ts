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
    user_id: number;
    user: string;
    lastname: string;
    court: string;
    sponsor: string;
    club: string;
    address: string;
    court_id?: number; // Agregado para mapeo
}

export interface ReservationDetails {
    id: number;
    user_id: number;
    court_id: number;
    reservation_type_id: number;
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
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
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

    getReservationDetails(id: number): Observable<ReservationDetails> {
        return this.get<ReservationDetails>(`/reservation/${id}`);
    }

    createReservation(reservationData: any): Observable<any> {
    console.log("Enviando payload:", JSON.stringify(reservationData, null, 2));
    return this.http.post(`${this.apiUrl}/reservation/create`, reservationData, {
        headers: {
            'Content-Type': 'application/json'
        }
    });
}

    updateReservation(id: number, data: Partial<Reservation>): Observable<any> {
        return this.put(`/reservation/update/${id}`, data);
    }

    deleteReservation(id: number): Observable<any> {
        return this.delete(`/reservation/delete/${id}`);
    }

    changeReservationStatus(id: number, status: string): Observable<any> {
        return this.patch(`/reservation/changeStatus/${id}`, { status });
    }

    getReservationDetailsByUser(user_id: number, reservation_id: number) {
  return this.http.get(`${this.apiUrl}/reservationDetail`, {
    params: { user_id, reservation_id }
  });
}
}