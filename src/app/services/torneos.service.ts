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


  updateTournament(id: number, data: Partial<Tournament>): Observable<any> {
    return this.put(`/tournament/update/${id}`, data);
  }

  updateTournamentStatus(id: number, status: Tournament['status']): Observable<any> {
    return this.put(`/tournament/updateStatus/${id}`, { status });
  }

  deleteTournament(id: number): Observable<any> {
    return this.delete(`/tournament/delete/${id}`);
  }
}
