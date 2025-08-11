import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { ClubLoginData } from '../login.model';

@Component({
  selector: 'app-club-login-form',
  templateUrl: './club-login-form.component.html',
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
export class ClubLoginFormComponent {
  @Output() loginSubmit = new EventEmitter<ClubLoginData>();
  
  clubLoginForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.clubLoginForm = this.fb.group({
      rfc: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(13)]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.clubLoginForm.valid) {
      const loginData: ClubLoginData = this.clubLoginForm.value;
      this.loginSubmit.emit(loginData);
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.clubLoginForm.controls).forEach(key => {
      const control = this.clubLoginForm.get(key);
      control?.markAsTouched();
    });
  }
}
