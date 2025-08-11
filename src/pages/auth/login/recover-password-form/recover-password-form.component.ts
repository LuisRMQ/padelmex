import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { RecoverPasswordData } from '../login.model';

@Component({
  selector: 'app-recover-password-form',
  templateUrl: './recover-password-form.component.html',
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
export class RecoverPasswordFormComponent {
  @Output() recoverSubmit = new EventEmitter<RecoverPasswordData>();
  
  recoverForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.recoverForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.recoverForm.valid) {
      const loginData: RecoverPasswordData = this.recoverForm.value;
      this.recoverSubmit.emit(loginData);
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.recoverForm.controls).forEach(key => {
      const control = this.recoverForm.get(key);
      control?.markAsTouched();
    });
  }
}
