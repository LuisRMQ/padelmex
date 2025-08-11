import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { UserLoginData } from '../login.model';

@Component({
  selector: 'app-user-login-form',
  templateUrl: './user-login-form.component.html',
  styleUrls: ['../shared/login-form.styles.css'],
  imports: [
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    CommonModule,
    ReactiveFormsModule
  ],
  standalone: true
})
export class UserLoginFormComponent {
  @Output() loginSubmit = new EventEmitter<UserLoginData>();
  
  userLoginForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.userLoginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.userLoginForm.valid) {
      const loginData: UserLoginData = this.userLoginForm.value;
      this.loginSubmit.emit(loginData);
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.userLoginForm.controls).forEach(key => {
      const control = this.userLoginForm.get(key);
      control?.markAsTouched();
    });
  }
}
