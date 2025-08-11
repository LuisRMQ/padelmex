import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserLoginFormComponent } from './user-login-form/user-login-form.component';
import { ClubLoginFormComponent } from './club-login-form/club-login-form.component';
import { RecoverPasswordFormComponent } from './recover-password-form/recover-password-form.component';
import { UserLoginData, ClubLoginData, RecoverPasswordData } from './login.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [
    CommonModule,
    UserLoginFormComponent,
    ClubLoginFormComponent,
    RecoverPasswordFormComponent
  ],
  standalone: true
})
export class LoginComponent {
  isClub: boolean = false;
  isRecoverPassword: boolean = false;

  onUserLoginSubmit(loginData: UserLoginData): void {
    console.log('User login:', loginData);
    // Aquí puedes llamar a un servicio para autenticar usuario
  }

  onClubLoginSubmit(loginData: ClubLoginData): void {
    console.log('Club login:', loginData);
    // Aquí puedes llamar a un servicio para autenticar club
  }

  onRecoverPasswordSubmit(recoverData: RecoverPasswordData): void {
    console.log('Recover password:', recoverData);
    // Aquí puedes llamar a un servicio para recuperar contraseña
  }

  setClubMode(isClub: boolean): void {
    this.isClub = isClub;
    this.isRecoverPassword = false;
  }

  setRecoverPasswordMode(isRecoverPassword: boolean): void {
    this.isRecoverPassword = isRecoverPassword;
    this.isClub = false;
  }
}
