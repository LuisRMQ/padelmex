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
export class HorariosService {

  private apiUrl = 'http://137.184.178.6/api/clubShedule';

  constructor(private http: HttpClient) { }

  getHorarios(): Observable<Horario[]> {
    return this.get<Horario[]>('/horarios');
  }

  getHorario(id: number): Observable<Horario> {
    return this.http.get<Horario>(`${this.apiUrl}/${id}`);
  }
  getHorariosByClub(clubId: number): Observable<Horario[]> {
    return this.http.get<Horario[]>(this.apiUrl, {
      params: { club_id: clubId.toString() } 
    });
  }

  createHorario(horario: Horario): Observable<Horario> {
    return this.http.post<Horario>(`${this.apiUrl}/create`, horario);
  }

  updateHorario(id: number, data: Partial<Horario>): Observable<any> {
    return this.put(`/horarios/update/${id}`, data);
  }

  deleteHorario(id: number): Observable<any> {
    return this.delete(`/horarios/delete/${id}`);
  }
}