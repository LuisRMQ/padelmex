import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { UsersService, Club, User } from '../../../app/services/users.service';

@Component({
  selector: 'app-EditarUsuario',
  templateUrl: './editar-usuario-dialog.component.html',
  styleUrls: ['./editar-usuario-dialog.component.css'],
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
export class EditarUsuarioDialogComponent {
  userForm!: FormGroup;
  logoPreview: string = '../../assets/images/placeholder.png';
  clubs: Club[] = [];
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private usersService: UsersService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<EditarUsuarioDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { userId: number } 
  ) {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      lastname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [''], 
      gender: ['', Validators.required],
      phone: ['', Validators.required],
      area_code: ['', Validators.required],
      club_id: ['', Validators.required],
      profile_photo: [null],
      rol_id: ['', Validators.required],
      category_id: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadClubs();
    this.loadUserData(this.data.userId);
  }

  loadClubs() {
    this.usersService.getClubs().subscribe({
      next: (clubs) => this.clubs = clubs,
      error: (err) => console.error('Error loading clubs:', err)
    });
  }

  loadUserData(userId: number) {
    this.usersService.getUsers().subscribe({
      next: (users: User[]) => {
        const user = users.find(u => u.id === userId);
        if (!user) {
          this.snackBar.open('❌ Usuario no encontrado', 'Cerrar', { duration: 4000, panelClass: ['snackbar-error'] });
          return;
        }

        this.userForm.patchValue({
          name: user.name,
          lastname: user.lastname,
          email: user.email,
          gender: user.gender,
          phone: user.phone,
          area_code: user.area_code,
          club_id: user.club_id,
          rol_id: user.rol_id,
          category_id: user.category_id
        });

        if (user.profile_photo) {
          this.logoPreview = user.profile_photo;
        }
      },
      error: (err) => {
        console.error('Error cargando usuario:', err);
        this.snackBar.open('❌ Error al cargar datos del usuario', 'Cerrar', { duration: 4000, panelClass: ['snackbar-error'] });
      }
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
    const passwordField = document.querySelector('input[formControlName="password"]') as HTMLInputElement;
    if (passwordField) passwordField.type = this.hidePassword ? 'password' : 'text';
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.snackBar.open('⚠️ El archivo supera los 5MB', 'Cerrar', { duration: 4000, panelClass: ['snackbar-warning'] });
      return;
    }
    this.logoPreview = URL.createObjectURL(file);
    this.userForm.patchValue({ profile_photo: file });
  }

  removePhoto(): void {
    this.logoPreview = '../../assets/images/placeholder.png';
    this.userForm.patchValue({ profile_photo: null });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  guardarUsuario() {
  if (!this.userForm.valid) {
    this.snackBar.open('⚠️ Completa todos los campos obligatorios', 'Cerrar', {
      duration: 4000,
      panelClass: ['snackbar-warning']
    });
    return;
  }

  const formData = new FormData();

  const userValue = this.userForm.value;
  formData.append('name', userValue.name);
  formData.append('lastname', userValue.lastname);
  formData.append('email', userValue.email);
  formData.append('gender', userValue.gender);
  formData.append('phone', userValue.phone);
  formData.append('area_code', userValue.area_code);
  formData.append('club_id', userValue.club_id.toString());
  formData.append('rol_id', userValue.rol_id.toString());
  formData.append('category_id', userValue.category_id.toString());

  if (userValue.password) {
    formData.append('password', userValue.password);
  }

  if (userValue.profile_photo) {
    formData.append('profile_photo', userValue.profile_photo);
  }

  this.usersService.updateUserById(this.data.userId, formData).subscribe({
    next: () => {
      this.snackBar.open('✅ Usuario actualizado correctamente', 'Cerrar', {
        duration: 4000,
        panelClass: ['snackbar-success']
      });
      this.dialogRef.close(true);
    },
    error: (err) => {
      console.error('Error al actualizar usuario:', err);
      this.snackBar.open('❌ Error al actualizar usuario', 'Cerrar', {
        duration: 4000,
        panelClass: ['snackbar-error']
      });
    }
  });
}

}
