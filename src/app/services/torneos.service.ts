import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiBaseService } from './api.service';

export interface Tournament {
  id: number;
  name: string;
  description?: string;
  club_name?: string;
  club_id: number;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  registration_fee: number;
  max_participants: number;
  current_participants: number;
  status: 'draft' | 'open' | 'closed' | 'in_progress' | 'completed' | 'cancelled';
  prizes?: any;
  rules?: string;
  photo?: string;
  tournament_call?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  categories?: TournamentCategory[]; 
}

export interface CategoryDetail {
  id: number;
  category: string; // nombre de la categoría
}

// Categoria dentro de un torneo
export interface TournamentCategory {
  id: number;
  tournament_id: number;
  category: CategoryDetail;
  category_id: number;  // <-- esto existe en la respuesta real

  max_participants: number;
  current_participants: number;
  status: string;
  created_at: string;
  updated_at: string;
}


export interface TournamentFilters {
  club_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  name?: string;
}

export interface Category {
  id: number;
  category: string;
  max_participants?: number | string;
}

export interface Club {
  id: number;
  name: string;
  address: string;
  rfc: string;
  type: string;
  phone: string;
  email: string;
  web_site: string;
  city_id: number;
  logo: string;
  status: boolean;
  created_at: string;
  updated_at: string;
}

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
export interface CourtsResponse {
  current_page: number;
  data: Court[];
  per_page: number;
  total: number;
  last_page: number;
}

export interface SetDetail {
  set_id: number;
  score_1: number;
  score_2: number;
  set_number: number;
}

export interface Player {
  id: number;
  name: string;
  photo: string;
}

export interface Couple {
  players: Player[];
  couple_id: number;
}

export interface Reservation {
  id: number;
  date: string;
  end_time: string;
  start_time: string;
}

export interface GameDetailResponse {
  sets: SetDetail[];
  phase: string;
  winner: Couple;
  couples: Couple[];
  game_id: number;
  reservation: Reservation;
  status_game: string;
}

export interface GameDetailApiResponse {
  status: string;
  data: GameDetailResponse;
}

@Injectable({
  providedIn: 'root'
})
export class TournamentService extends ApiBaseService {

  getTournaments(filters: TournamentFilters = {}): Observable<Tournament[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params = params.append(key, value.toString());
    });
    return this.get<Tournament[]>('/tournaments', params);
  }

  getTournament(id: number): Observable<Tournament> {
    return this.get<Tournament>(`/tournament/${id}`);
  }

  createTournament(data: any): Observable<any> {
    return this.post('/tournament/create', data);
  }



  getCategories(): Observable<Category[]> {
    return this.get<Category[]>('/categories');
  }

  getCategoriesByTournamentId(tournamentId: number): Observable<Category[]> {
    return this.get<Category[]>(`/tournament/categories/${tournamentId}`);
  }

  updateTournament(id: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/tournament/update/${id}?_method=PUT`, data);
  }



  updateTournamentById(id: number, data: any): Observable<any> {


    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      return this.post(`/tournament/update/${id}`, data);
    } else {
      return this.put(`/tournament/update/${id}`, data);
    }
  }


  updateTournamentStatus(id: number, status: Tournament['status']): Observable<any> {
    return this.patch(`/tournament/updateStatus/${id}`, { status });
  }

  deleteTournament(id: number): Observable<any> {
    return this.delete(`/tournament/delete/${id}`);
  }

  getClubs(): Observable<Club[]> {
    return this.get<Club[]>('/clubs');
  }

  addUsertoTournament(data: any): Observable<any> {
    return this.post('/coupleTournament/create', data);
  }

  getCourtsByClub(clubId: number, limit: number = 5, page: number = 1): Observable<CourtsResponse> {
    let params = new HttpParams()
      .append('club_id', clubId.toString())
      .append('limit', limit.toString())
      .append('page', page.toString());
    return this.get<CourtsResponse>('/courts', params);
  }


  getBracketsByTournament(tournamentId: number): Observable<any> {
    const params = new HttpParams().set('tournament_id', tournamentId.toString());
    return this.get<any>('/tournament/bracket', params);
  }


  storeSet(data: { game_id: number, set_number: number, score_1: number, score_2: number }): Observable<any> {
    return this.post('/set/store', data);
  }

  getGameDetail(gameId: number): Observable<GameDetailApiResponse> {
    return this.get<GameDetailApiResponse>(`/set/getGameDetail/${gameId}`);
  }


}
