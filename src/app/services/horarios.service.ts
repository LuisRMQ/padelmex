import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiBaseService } from './api.service';

export interface Horario {
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

  getHorarios(): Observable<Horario[]> {
    return this.get<Horario[]>('/horarios');
  }

  getHorario(id: number): Observable<Horario> {
    return this.get<Horario>(`/horarios/${id}`);
  }

  createHorario(data: Partial<Horario>): Observable<any> {
    return this.post('/courtSchedules/create', data);
  }

  updateHorario(id: number, data: Partial<Horario>): Observable<any> {
    return this.put(`/horarios/update/${id}`, data);
  }

  deleteHorario(id: number): Observable<any> {
    return this.delete(`/horarios/delete/${id}`);
  }
}