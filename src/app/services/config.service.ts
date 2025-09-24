import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiBaseService } from './api.service';
import { map } from 'rxjs/operators';

export interface Category {
  id?: number;
category: string;
  description?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Rol {
  id?: number;
  rol: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService extends ApiBaseService {

  // ================================
  // 📌 CATEGORIES
  // ================================

  getCategories(): Observable<Category[]> {
    return this.get<{ success: boolean, data: Category[] }>('/categories')
      .pipe(map(res => res.data));
  }

  getCategoryById(id: number): Observable<Category> {
    return this.get<{ success: boolean, data: Category }>(`/categories/${id}`)
      .pipe(map(res => res.data));
  }

  createCategory(data: any): Observable<any> {
    return this.post('/categories/create', data);
  }

  updateCategory(id: number, data: any): Observable<any> {
    return this.put(`/categories/update/${id}`, data);
  }

  deleteCategory(id: number): Observable<any> {
    return this.delete(`/categories/delete/${id}`);
  }

  activateCategory(id: number): Observable<any> {
    return this.post(`/categories/activate/${id}`, {});
  }

  // ================================
  // 📌 ROLES
  // ================================

 getRoles(): Observable<Rol[]> {
  return this.get<{ msg: string, roles: Rol[] }>('/roles')
    .pipe(
      map(res => res.roles)
    );
}

  getRolById(id: number): Observable<Rol> {
    return this.get<{ success: boolean, data: Rol }>(`/roles/${id}`)
      .pipe(map(res => res.data));
  }

  createRol(data: any): Observable<any> {
    return this.post('/roles/create', data);
  }

  updateRol(id: number, data: any): Observable<any> {
    return this.put(`/roles/update/${id}`, data);
  }

  deleteRol(id: number): Observable<any> {
    return this.delete(`/roles/delete/${id}`);
  }
}
