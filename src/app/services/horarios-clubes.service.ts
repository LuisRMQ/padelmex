import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiBaseService } from './api.service';
import { HttpParams } from '@angular/common/http';

export interface HorarioClub {
  id?: number;
  club_id: number;
  day: string;
  start_time: string;
  end_time: string;
  status: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class HorariosService extends ApiBaseService {

  getHorarios(): Observable<HorarioClub[]> {
    return this.get<HorarioClub[]>('/clubShedule');
  }

  getHorario(id: number): Observable<HorarioClub> {
    return this.get<HorarioClub>(`/clubShedule/${id}`);
  }

  getHorariosByClub(clubId: number): Observable<HorarioClub[]> {
    const params = new HttpParams().set('club_id', clubId.toString());
    return this.get<HorarioClub[]>('/clubShedule', params);
  }

  createHorario(horario: Partial<HorarioClub>): Observable<any> {
    return this.post('/clubShedule/create', horario);
  }

  updateHorario(id: number, data: Partial<HorarioClub>): Observable<any> {
    return this.put(`/clubShedule/update/${id}`, data);
  }

  deleteHorario(id: number): Observable<any> {
    return this.delete(`/clubShedule/delete/${id}`);
  }
}