import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserLoginFormComponent } from './user-login-form/user-login-form.component';
import { ClubLoginFormComponent } from './club-login-form/club-login-form.component';
import { RecoverPasswordFormComponent } from './recover-password-form/recover-password-form.component';
import { UserLoginData, ClubLoginData, RecoverPasswordData } from './login.model';
import { AuthService } from '../../../app/services/auth.service'; // Ajusta la ruta según tu estructura
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [
    CommonModule,
    UserLoginFormComponent,
    ClubLoginFormComponent,
    RecoverPasswordFormComponent,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  standalone: true
})
export class LoginComponent {
  isClub: boolean = false;
  isRecoverPassword: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private authService: AuthService, private router: Router) { }

  onUserLoginSubmit(loginData: UserLoginData): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(loginData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);

        console.log('Login exitoso:', response);
    
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error en login:', error);

        if (error.message === 'Credenciales incorrectas') {
          this.errorMessage = 'Credenciales incorrectas. Por favor, verifica tus datos.';
        } else if (error.message.includes('Attempt to read property')) {
          this.errorMessage = 'Error interno del servidor. Por favor, contacte al administrador.';
        } else if (error.status === 0) {
          this.errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
        } else {
          this.errorMessage = error.message || 'Error desconocido. Por favor, intenta más tarde.';
        }
      }
    });
  }

  onClubLoginSubmit(loginData: ClubLoginData): void {
    console.log('Club login:', loginData);
    // Implementar lógica similar para el login de club si es necesario
  }

  onRecoverPasswordSubmit(recoverData: RecoverPasswordData): void {
    console.log('Recover password:', recoverData);
    // Implementar lógica de recuperación de contraseña
  }

  setClubMode(isClub: boolean): void {
    this.isClub = isClub;
    this.isRecoverPassword = false;
    this.errorMessage = ''; // Limpiar mensajes de error al cambiar de modo
  }

  setRecoverPasswordMode(isRecoverPassword: boolean): void {
    this.isRecoverPassword = isRecoverPassword;
    this.isClub = false;
    this.errorMessage = ''; // Limpiar mensajes de error al cambiar de modo
  }
}