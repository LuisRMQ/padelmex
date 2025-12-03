import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserLoginFormComponent } from './user-login-form/user-login-form.component';
import { ClubLoginFormComponent } from './club-login-form/club-login-form.component';
import { RecoverPasswordFormComponent } from './recover-password-form/recover-password-form.component';
import { UserLoginData, ClubLoginData, RecoverPasswordData } from './login.model';
import { AuthService } from '../../../app/services/auth.service';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AlertService } from '../../../app/services/alert.service';

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
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  standalone: true
})
export class LoginComponent {
  isClub: boolean = false;
  isRecoverPassword: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private authService: AuthService, private router: Router, private snackBar: MatSnackBar, private alertService: AlertService) { }

  onUserLoginSubmit(loginData: UserLoginData): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(loginData).subscribe({
      next: async (response) => {
        this.isLoading = false;

        await this.alertService.success(
          'Bienvenido 🎉',
          `Hola ${response.user.name}, acceso concedido.`
        );

        this.router.navigate(['/dashboard']);
      },

      error: async (error) => {
        this.isLoading = false;
        console.error('Error en login:', error);

        let mensaje = '';

        if (error.message === 'Credenciales incorrectas') {
          mensaje = '❌ Credenciales incorrectas. Verifica tus datos.';
        } else if (error.message?.includes('Attempt to read property')) {
          mensaje = '❌ Credenciales incorrectas. Verifica tus datos.';
        } else if (error.status === 0) {
          mensaje = '⚠️ Error de conexión. Revisa tu internet.';
        } else {
          mensaje = error.message || '⚠️ Error desconocido, intenta más tarde.';
        }

        await this.alertService.error('Error al iniciar sesión', mensaje);
      }
    });
  }

  onClubLoginSubmit(loginData: ClubLoginData): void {
    console.log('Club login:', loginData);
  }

  onRecoverPasswordSubmit(recoverData: RecoverPasswordData): void {
    console.log('Recover password:', recoverData);
  }

  setClubMode(isClub: boolean): void {
    this.isClub = isClub;
    this.isRecoverPassword = false;
    this.errorMessage = '';
  }

  setRecoverPasswordMode(isRecoverPassword: boolean): void {
    this.isRecoverPassword = isRecoverPassword;
    this.isClub = false;
    this.errorMessage = '';
  }
}
