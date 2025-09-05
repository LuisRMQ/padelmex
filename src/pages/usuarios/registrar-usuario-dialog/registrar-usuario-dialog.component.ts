import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

// Angular Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';

import { UsersService } from '../../../app/services/users.service';

@Component({
  selector: 'app-RegistrarUsuario',
  templateUrl: './registrar-usuario-dialog.component.html',
  styleUrls: ['./registrar-usuario-dialog.component.css'],
  standalone: true,
  imports: [
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCardModule,
    ReactiveFormsModule
  ],
})
export class RegistrarUsuarioDialogComponent {
  userForm!: FormGroup;
  logoPreview: string = '../../assets/images/placeholder.png';

  constructor(private fb: FormBuilder, private usersService: UsersService) {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      lastname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      gender: ['', Validators.required],
      club_id: ['', Validators.required],
      profile_photo: [null, Validators.required],
      rol_id: ['', Validators.required],
      category_id: ['', Validators.required]
    });
  }

  onFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) { // 5MB
    alert('El archivo supera los 5MB');
    return;
  }

  this.logoPreview = URL.createObjectURL(file); 
  this.userForm.patchValue({ profile_photo: file }); 
}


  guardarUsuario() {
  if (this.userForm.valid) {
    const formData = new FormData();

    Object.keys(this.userForm.value).forEach(key => {
      const value = this.userForm.value[key];
      if (value !== null) {
        formData.append(key, value);
      }
    });

    this.usersService.createUser(formData).subscribe({
      next: (res) => {
        alert('✅ Usuario registrado correctamente');
        this.userForm.reset();
        this.logoPreview = '../../assets/images/placeholder.png';
      },
      error: (err) => {
        console.error('Error al crear usuario:', err);
        alert('❌ Error al registrar usuario');
      }
    });
  } else {
    alert('⚠️ Completa todos los campos obligatorios');
  }
}

}
