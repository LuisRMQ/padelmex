import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiBaseService } from './api.service';


export interface CourtStatistic {
  court_id: number;
  court_name: string;
  total_reservations: number;
}



export interface UserStatistic {
  user_id: number;
  fullname: string;
  rol_id: number;
  rol: string;
  club_id: number;
  club: string;
  total_reservations: number;
}

@Injectable({
  providedIn: 'root'
})
export class EstadisticasService extends ApiBaseService {


  getCourtsWithMostReservationsByClub(clubId: number): Observable<CourtStatistic[]> {
    return this.get<CourtStatistic[]>(`/courtsWithMostReservationsByClub/${clubId}`);
  }

  getCourtWithMostReservationsByClub(clubId: number): Observable<CourtStatistic> {
    return this.get<CourtStatistic>(`/courtWithMostReservationsByClub/${clubId}`);
  }

  getCourtWithLessReservationsByClub(clubId: number): Observable<CourtStatistic> {
    return this.get<CourtStatistic>(`/courtWithLessReservationsByClub/${clubId}`);
  }

  getUsersWithMostReservationByClub(club_id: number): Observable<UserStatistic[]> {
    return this.get<UserStatistic[]>(`/usersWithMostReservationByClub?club_id=${club_id}`);
  }

  getUserWithMostReservationByClub(): Observable<UserStatistic> {
    return this.get<UserStatistic>(`/userWithMostReservationByClub`);
  }
}