import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiBaseService } from './api.service';
import { map } from 'rxjs/operators';

// ================================
// 📌 INTERFACES
// ================================
export interface FriendShipRequest {
  id?: number;
  user_id: number;          
  friend_id: number;       
  status?: 'pending' | 'accepted' | 'rejected';
  created_at?: string;
  updated_at?: string;
}

// ================================
// 📌 SERVICIO
// ================================
@Injectable({
  providedIn: 'root'
})
export class FriendShipService extends ApiBaseService {

  getAllRequests(): Observable<FriendShipRequest[]> {
    return this.get<{ success: boolean, data: FriendShipRequest[] }>('/friendShipRequest')
      .pipe(map(res => res.data));
  }

  getSentRequests(userId: number): Observable<FriendShipRequest[]> {
    return this.get<{ success: boolean, data: FriendShipRequest[] }>(`/friendShipRequest/sent/${userId}`)
      .pipe(map(res => res.data));
  }

  getReceivedRequests(userId: number): Observable<FriendShipRequest[]> {
    return this.get<{ success: boolean, data: FriendShipRequest[] }>(`/friendShipRequest/received/${userId}`)
      .pipe(map(res => res.data));
  }

  createRequest(data: { user_id: number; friend_id: number }): Observable<any> {
    return this.post('/friendShipRequest/create', data);
  }

  updateRequest(id: number, data: { status: string }): Observable<any> {
  return this.patch(`/friendShipRequest/update/${id}`, data);
}

  deleteRequest(id: number): Observable<any> {
    return this.delete(`/friendShipRequest/delete/${id}`);
  }

  acceptRequest(id: number): Observable<any> {
    return this.updateRequest(id, { status: 'accepted' });
  }

  rejectRequest(id: number): Observable<any> {
    return this.updateRequest(id, { status: 'rejected' });
  }
}
