import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { UsersService, Club } from '../../../app/services/users.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';

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
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    CommonModule,
    MatDividerModule
  ],
})
export class RegistrarUsuarioDialogComponent {
  userForm!: FormGroup;
  logoPreview: string = '../../assets/images/placeholder.png';
  clubs: Club[] = [];
  hidePassword = true;
  categories: any[] = [];

  constructor(private fb: FormBuilder, private usersService: UsersService, private snackBar: MatSnackBar, private dialogRef: MatDialogRef<RegistrarUsuarioDialogComponent>
  ) {

    this.userForm = this.fb.group({
      name: ['', Validators.required],
      lastname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      gender: ['', Validators.required],
      phone: ['', Validators.required],
      area_code: ['', Validators.required],
      club_id: ['', Validators.required],
      profile_photo: [null, Validators.required],
      rol_id: ['', Validators.required],
      category_id: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadClubs();
    this.loadCategories();

  }



loadCategories() {
  this.usersService.getCategories().subscribe({
    next: (res) => {
      this.categories = res;
    },
    error: (err) => {
      console.error("Error loading categories:", err);
    }
  });
}



  onCancel(): void {
    this.dialogRef.close();
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.snackBar.open('⚠️ El archivo supera los 5MB', 'Cerrar', {
        duration: 4000,
        panelClass: ['snackbar-warning']
      });
      return;
    }

    this.logoPreview = URL.createObjectURL(file);
    this.userForm.patchValue({ profile_photo: file });
  }

  loadClubs() {
    this.usersService.getClubs().subscribe({
      next: (clubs) => {
        this.clubs = clubs;
      },
      error: (error) => {
        console.error('Error loading clubs:', error);
      }
    });
  }


  guardarUsuario() {
    if (this.userForm.invalid) {
      Object.keys(this.userForm.controls).forEach(key => {
        this.userForm.get(key)?.markAsTouched();
      });

      this.snackBar.open('⚠️ Completa todos los campos obligatorios', 'Cerrar', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['snackbar-warning']
      });
      return;
    }

    const formData = new FormData();
    Object.keys(this.userForm.value).forEach(key => {
      const value = this.userForm.value[key];
      if (value !== null) {
        formData.append(key, value);
      }
    });

    this.usersService.createUser(formData).subscribe({
      next: (res) => {
        this.snackBar.open('✅ Usuario registrado correctamente', 'Cerrar', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['snackbar-success']
        });
        this.userForm.reset();
        this.logoPreview = '../../assets/images/placeholder.png';
      },
      error: (err) => {
        console.error('Error al crear usuario:', err);
        this.snackBar.open('❌ Error al registrar usuario', 'Cerrar', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['snackbar-error']
        });
      }
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;

    const passwordField = document.querySelector('input[formControlName="password"]') as HTMLInputElement;
    if (passwordField) {
      passwordField.type = this.hidePassword ? 'password' : 'text';
    }
  }

  removePhoto(): void {
    this.logoPreview = '../../assets/images/placeholder.png';
  }

}
