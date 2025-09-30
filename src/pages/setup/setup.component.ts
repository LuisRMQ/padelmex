import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ConfigService, Category, Rol, Comidad } from '../../app/services/config.service';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBar } from '@angular/material/snack-bar';

export interface User {
  id: number;
  name: string;
  email: string;
  role_id: number;
  role_name?: string;
}

interface EditableCategory extends Category { editing?: boolean }
interface EditableRol extends Rol { editing?: boolean }
interface EditableComidad extends Comidad { editing?: boolean }

@Component({
  selector: 'app-config-categorias-roles-comidades',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatCardModule,
    MatChipsModule,
    MatExpansionModule,
    MatTabsModule,
    MatTooltipModule,
    MatSelectModule
  ],
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.css']
})
export class ConfigCategoriasRolesComponent implements OnInit {
  categories: EditableCategory[] = [];
  roles: EditableRol[] = [];
  comidades: EditableComidad[] = [];

  loading = false;
  errorMessage = '';

  newCategory = '';
  gender = 'varonil';
  level = '';


  newRole = '';
  newComidad = '';

  categoriesCollapsed = false;
  rolesCollapsed = false;
  comidadesCollapsed = false;

  constructor(
    private configService: ConfigService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.errorMessage = '';
    Promise.all([
      this.configService.getCategories().toPromise(),
      this.configService.getRoles().toPromise(),
      this.configService.getComidades().toPromise()
    ]).then(([categories, roles, comidades]) => {
      this.categories = (categories || []).map(cat => ({ ...cat, editing: false }));
      this.roles = (roles || []).map(role => ({ ...role, editing: false }));
      this.comidades = (comidades || []).map(c => ({ ...c, editing: false }));
      this.loading = false;
    }).catch(error => {
      this.errorMessage = 'Error al cargar los datos: ' + (error.message || 'Error desconocido');
      this.loading = false;
    });
  }

  // ========================
  // Categorías
  // ========================
  addCategory() {
    if (!this.newCategory || !this.newCategory.trim() || !this.gender || !this.level) {
      this.snackBar.open('Completa todos los campos para agregar una categoría', 'Cerrar', { duration: 3000, panelClass: ['snackbar-error'] });
      return;
    }
    this.loading = true;
    const categoryData = { category: this.newCategory.trim(), gender: this.gender, level: this.level };
    this.configService.createCategory(categoryData).subscribe({
      next: () => { this.loadData(); this.newCategory = ''; this.gender = 'varonil'; this.level = ''; },
      error: () => { this.errorMessage = 'Error al crear categoría'; this.loading = false; },
      complete: () => { this.snackBar.open('Categoría agregada con éxito', 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] }); }
    });
  }

  removeCategory(category: EditableCategory) {
    if (!category.id) return;
    this.loading = true;
    this.configService.deleteCategory(category.id).subscribe({
      next: () => this.loadData(),
      error: () => { this.errorMessage = 'Error al eliminar categoría'; this.loading = false; },
      complete: () => { this.snackBar.open('Categoría eliminada con éxito', 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] }); }
    });
  }

  toggleEditCategory(cat: EditableCategory) {
    if (cat.editing) {
      this.configService.updateCategory(cat.id!, { category: cat.category }).subscribe({
        next: () => cat.editing = false,
        error: () => { this.errorMessage = 'Error al actualizar categoría'; },
        complete: () => { this.snackBar.open('Categoría actualizada con éxito', 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] }); }
      });
    } else {
      cat.editing = true;
    }
  }

  // ========================
  // Roles
  // ========================
  addRole() {
    if (!this.newRole.trim()) return;
    this.loading = true;
    const roleData = { rol: this.newRole.trim() };
    this.configService.createRol(roleData).subscribe({
      next: () => { this.loadData(); this.newRole = ''; },
      error: () => { this.errorMessage = 'Error al crear rol'; this.loading = false; },
      complete: () => { this.snackBar.open('Rol creado con éxito', 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] }); }
    });
  }

  removeRole(role: EditableRol) {
    if (!role.id) return;
    this.loading = true;
    this.configService.deleteRol(role.id).subscribe({
      next: () => this.loadData(),
      error: () => { this.errorMessage = 'Error al eliminar rol'; this.loading = false; },
      complete: () => { this.snackBar.open('Rol eliminado con éxito', 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] }); }
    });
  }

  toggleEditRole(role: EditableRol) {
    if (role.editing) {
      this.configService.updateRol(role.id!, { rol: role.rol }).subscribe({
        next: () => role.editing = false,
        error: () => { this.errorMessage = 'Error al actualizar rol'; },
        complete: () => { this.snackBar.open('Rol actualizado con éxito', 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] }); }
      });
    } else {
      role.editing = true;
    }
  }

  // ========================
  // Comidades
  // ========================
  addComidad() {
    if (!this.newComidad.trim()) return;
    this.loading = true;
    const comidadData = { name: this.newComidad.trim() };
    this.configService.createComidad(comidadData).subscribe({
      next: () => { this.loadData(); this.newComidad = ''; },
      error: () => { this.errorMessage = 'Error al crear comidad'; this.loading = false; },
      complete: () => { this.snackBar.open('Comidad creada con éxito', 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] }); }
    });
  }

  removeComidad(comidad: EditableComidad) {
    if (!comidad.id) return;
    this.loading = true;
    this.configService.deleteComidad(comidad.id).subscribe({
      next: () => this.loadData(),
      error: () => { this.errorMessage = 'Error al eliminar comidad'; this.loading = false; },
      complete: () => { this.snackBar.open('Comidad eliminada con éxito', 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] }); }
    });
  }

  toggleEditComidad(com: EditableComidad) {
    if (com.editing) {
      this.configService.updateComidad(com.id!, { name: com.name }).subscribe({
        next: () => com.editing = false,
        error: () => { this.errorMessage = 'Error al actualizar comidad'; },
        complete: () => { this.snackBar.open('Comidad actualizada con éxito', 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] }); }
      });
    } else {
      com.editing = true;
    }
  }
}
