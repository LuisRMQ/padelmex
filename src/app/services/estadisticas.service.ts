import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
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


export interface RankingPlayer {
  id: number;
  name: string;
  lastname: string;
  point: number;
  tournament_victories: number;
  club_id: number;
  profile_photo: string;
  category: string;
  level: string;
  created_at: string;
  updated_at: string;
}

export interface PaginationLink {
  url: string | null;
  label: string;
  page: number | null;
  active: boolean;
}

export interface RankingResponse {
  current_page: number;
  data: RankingPlayer[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: PaginationLink[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
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

  getRanking(limit: number = 10, page: number = 1): Observable<RankingResponse> {
    return this.get<RankingResponse>(`/ranking?per_page=${limit}&page=${page}`);
  }


  getTop10Ranking(): Observable<any[]> {
    return this.get<any>('/ranking?per_page=10').pipe(
      map(res => res.data || [])
    );
  }


}