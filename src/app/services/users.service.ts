import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiBaseService } from './api.service';
import { map } from 'rxjs/operators';

export interface User {
    id?: number;
    name: string;
    lastname: string;
    email: string;
    password?: string;
    gender: string;
    club_id: number;
    profile_photo: string | null;
    rol?: string;
    category?: string;
    rol_id?: number;
    category_id?: number;
    created_at?: string;
    updated_at?: string;
}

@Injectable({
    providedIn: 'root'
})
export class UsersService extends ApiBaseService {

    getUsers(): Observable<User[]> {
        return this.get<{ success: boolean, data: User[] }>('/users')
            .pipe(
                map(res => res.data)
            );
    }

    createUser(data: FormData): Observable<any> {
        return this.post('/user/create', data);
    }


    getUsersByRol(rol_id: number): Observable<User[]> {
        return this.get<{ success: boolean, data: User[] }>(`/users?rol_id=${rol_id}`)
            .pipe(
                map(res => res.data)
            );
    }

    updateUserById(id: number, data: any) {
        const isFormData = data instanceof FormData;
        if (isFormData) {
            return this.post(`/user/update/${id}`, data);
        } else {
            return this.put(`/user/update/${id}`, data);
        }
    }


    deleteUser(id: number): Observable<any> {
        return this.delete(`/user/delete/${id}`);
    }

    uploadProfilePhoto(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        return this.post('/upload/profile-photo', formData);
    }

    desactivarUser(id: number): Observable<any> {
        return this.delete(`/user/disabled/${id}`);
    }

}
