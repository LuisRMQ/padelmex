import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-config-categorias-roles',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.css']
})
export class ConfigCategoriasRolesComponent {
  categories: string[] = ['General', 'Noticias'];
  roles: string[] = ['Admin', 'Editor'];

  newCategory = '';
  newRole = '';

  addCategory() {
    if (this.newCategory.trim()) {
      this.categories.push(this.newCategory.trim());
      this.newCategory = '';
    }
  }

  removeCategory(cat: string) {
    this.categories = this.categories.filter(c => c !== cat);
  }

  addRole() {
    if (this.newRole.trim()) {
      this.roles.push(this.newRole.trim());
      this.newRole = '';
    }
  }

  removeRole(role: string) {
    this.roles = this.roles.filter(r => r !== role);
  }
}
