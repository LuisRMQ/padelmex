import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ApiBaseService } from './api.service';

export interface Court {
  id: number;
  name: string;
  sponsor: string;
  type: string;
  club_id: number;
  availability: number;
  photo: string;
  price_hour?: number;
  commission: number;
}

export interface Club {
  id: number;
  name: string;
}

export interface CourtsResponse {
  current_page: number;
  data: Court[];
  per_page: number;
  total: number;
  last_page: number;
}


export interface CourtClosedDay {
  id: number;
  court_id: number;
  day: string;
  reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CourtSchedule {
  courts_schedules_id: number;
  court_id: number;
  day: string;
  shift_name: string;
  price_hour: string;
  start_time: string;
  end_time: string;
  clubId: number;
}

export interface CourtOperatingHours {
  openingTime: string;
  closingTime: string;
  schedules: CourtSchedule[];
}

@Injectable({
  providedIn: 'root'
})
export class CourtService extends ApiBaseService {
  getClubs(): Observable<Club[]> {
    return this.get<any>('/clubs').pipe(map(response => response.data));
  }

  createCourt(formData: FormData): Observable<any> {
    return this.post('/court/create', formData);
  }

  getCourtsByClub(clubId: number, limit: number = 5, page: number = 1): Observable<CourtsResponse> {
    let params = new HttpParams()
      .append('club_id', clubId.toString())
      .append('limit', limit.toString())
      .append('page', page.toString());
    return this.get<CourtsResponse>('/courts', params);
  }

  updateCourt(id: number, data: Partial<Court> | FormData): Observable<any> {
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      return this.post(`/court/update/${id}`, data);
    } else {
      return this.put(`/court/update/${id}`, data);
    }
  }

  deleteCourt(id: number, club_id: number): Observable<any> {
    return this.delete(`/court/delete/${id}`, { body: { club_id } });
  }



  // === COURT CLOSED DAYS ===
  getCourtClosedDays(): Observable<CourtClosedDay[]> {
    return this.get<any>('/courtClosedDays').pipe(map(response => response.data));
  }

  getCourtClosedDayById(id: number): Observable<CourtClosedDay> {
    return this.get<any>(`/courtClosedDays/${id}`).pipe(map(response => response.data));
  }

  // Filtra por cancha desde el front
  getCourtClosedDaysByCourt(courtId: number): Observable<CourtClosedDay[]> {
    const params = new HttpParams().set('court_id', courtId.toString());
    return this.get<any>('/courtClosedDays', params).pipe(
      map(response => response.data)
    );
  }

  createCourtClosedDay(data: Partial<CourtClosedDay>): Observable<any> {
    return this.post('/courtClosedDays/create', data);
  }

  updateCourtClosedDay(id: number, data: Partial<CourtClosedDay>): Observable<any> {
    return this.put(`/courtClosedDays/update/${id}`, data);
  }

  deleteCourtClosedDay(id: number): Observable<any> {
    return this.delete(`/courtClosedDays/delete/${id}`);
  }

  /**
   * Obtiene todos los horarios de una cancha
   * @param courtId ID de la cancha
   */
  getCourtSchedules(courtId: number, clubId: number): Observable<CourtSchedule[]> {
    const params = new HttpParams()
      .set('court_id', courtId.toString())
      .set('club_id', clubId.toString());

    return this.get<any>('/courtShedules', params).pipe(
      map(response => response.data || response)
    );
  }

  /**
     * Obtiene el horario de operación de una cancha para una fecha específica
     * @param courtId ID de la cancha
     * @param date Fecha para la que se quiere el horario
     */
  getCourtOperatingHours(courtId: number, clubId: number, date: Date | string): Observable<CourtOperatingHours> {
    return this.getCourtSchedules(courtId, clubId).pipe(
      map(schedules => this.calculateOperatingHours(schedules, date))
    );
  }

  /**
   * Calcula el horario de apertura y cierre para un día específico
   * @param schedules Lista de horarios de la cancha
   * @param date Fecha para la que se calcula el horario
   */
  private calculateOperatingHours(schedules: CourtSchedule[], date: Date | string): CourtOperatingHours {
    const targetDate = new Date(date);
    const dayName = this.getDayNameInSpanish(targetDate);

    // Filtrar horarios para el día específico
    const daySchedules = schedules.filter(schedule =>
      schedule.day.toLowerCase() === dayName.toLowerCase()
    );

    if (daySchedules.length === 0) {
      return {
        openingTime: '00:00',
        closingTime: '00:00',
        schedules: []
      };
    }

    // Encontrar la hora de apertura más temprana y cierre más tarde
    let openingTime = '23:59';
    let closingTime = '00:00';

    daySchedules.forEach(schedule => {
      if (schedule.start_time < openingTime) {
        openingTime = schedule.start_time;
      }
      if (schedule.end_time > closingTime) {
        closingTime = schedule.end_time;
      }
    });

    return {
      openingTime: openingTime.substring(0, 5), // Formato HH:mm
      closingTime: closingTime.substring(0, 5), // Formato HH:mm
      schedules: daySchedules
    };
  }

  /**
   * Obtiene el nombre del día en español
   * @param date Fecha
   */
  private getDayNameInSpanish(date: Date): string {
    const days = [
      'Domingo', 'Lunes', 'Martes', 'Miércoles',
      'Jueves', 'Viernes', 'Sábado'
    ];
    return days[date.getDay()];
  }

}