import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiBaseService } from './api.service';
import { HttpParams } from '@angular/common/http';

export interface HorarioCancha {
    id?: number;
    court_id: number;
    day: string;
    start_time: string;
    end_time: string;
    status: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class HorariosServiceCancha extends ApiBaseService {

    getHorarios(): Observable<HorarioCancha[]> {
        return this.get<HorarioCancha[]>('/courtSchedules');
    }

    getHorario(id: number): Observable<HorarioCancha> {
        return this.get<HorarioCancha>(`/courtSchedules/${id}`);
    }

    getHorariosByCourt(clubId: number, courtId: number): Observable<HorarioCancha[]> {
        const params = new HttpParams()
            .set('club_id', clubId.toString())
            .set('court_id', courtId.toString());
        return this.get<HorarioCancha[]>('/courtShedules/', params);
    }

    createHorario(horario: Partial<HorarioCancha>): Observable<any> {
        return this.post('/courtSchedules/create', horario);
    }

    updateHorario(id: number, data: Partial<HorarioCancha>): Observable<any> {
        return this.put(`/courtSchedules/update/${id}`, data);
    }

    deleteHorario(id: number): Observable<any> {
        return this.delete(`/courtSchedules/delete/${id}`);
    }
}