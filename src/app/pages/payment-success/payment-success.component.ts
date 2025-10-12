import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="success-container">
      <mat-card class="success-card">
        <div class="success-icon">
          <mat-icon>check_circle</mat-icon>
        </div>
        <h2>¡Pago Exitoso!</h2>
        <p>Tu transacción ha sido procesada correctamente.</p>
        <button mat-raised-button color="primary" (click)="closeWindow()">
          Continuar
        </button>
      </mat-card>
    </div>
  `,
  styles: [`
    .success-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      padding: 20px;
    }

    .success-card {
      text-align: center;
      padding: 40px;
      border-radius: 16px;
      max-width: 320px;
      width: 100%;
    }

    .success-icon mat-icon {
      font-size: 72px;
      height: 72px;
      width: 72px;
      color: #4CAF50;
      margin-bottom: 20px;
    }

    h2 {
      color: #333;
      margin-bottom: 16px;
    }

    p {
      color: #666;
      margin-bottom: 32px;
    }

    button {
      width: 100%;
      height: 48px;
      border-radius: 24px;
      font-weight: 600;
    }
  `]
})
export class PaymentSuccessComponent implements OnInit {

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    // Auto-close after 3 seconds
    setTimeout(() => {
      this.closeWindow();
    }, 3000);
  }

  closeWindow(): void {
    if (isPlatformBrowser(this.platformId) && window.parent) {
      window.parent.postMessage({
        type: 'PAYMENT_COMPLETE',
        status: 'success'
      }, '*');
    }
  }
}