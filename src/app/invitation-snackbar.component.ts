import { Component, Inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-invitation-snackbar',
  template: `
    <div class="snackbar-content">
      <div class="message">{{ data.message }}</div>
      <div class="actions">
        <button mat-flat-button color="primary" (click)="accept()">Aceptar</button>
        <button mat-stroked-button color="warn" (click)="reject()">Rechazar</button>
      </div>
    </div>
  `,
  styles: [`
    .snackbar-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .message {
      font-weight: 500;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `],
  standalone: true,
    imports: [CommonModule, MatButtonModule]
})
export class InvitationSnackbarComponent {
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: any,
    private snackBarRef: MatSnackBarRef<InvitationSnackbarComponent>
  ) {}

  accept() {
    this.snackBarRef.dismissWithAction(); 
    this.data.onAccept?.();
  }

  reject() {
    this.snackBarRef.dismiss();
    this.data.onReject?.();
  }
}
