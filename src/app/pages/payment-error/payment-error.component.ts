import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-payment-error',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="error-container">
      <mat-card class="error-card">
        <div class="error-icon">
          <mat-icon>error</mat-icon>
        </div>
        <h2>Error en el Pago</h2>
        <p>{{ errorMessage || 'Hubo un problema procesando tu pago. Por favor intenta nuevamente.' }}</p>
        <div class="button-group">
          <button mat-raised-button color="primary" (click)="retry()">
            Reintentar
          </button>
          <button mat-button (click)="closeWindow()">
            Cancelar
          </button>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .error-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #F44336 0%, #D32F2F 100%);
      padding: 20px;
    }

    .error-card {
      text-align: center;
      padding: 40px;
      border-radius: 16px;
      max-width: 320px;
      width: 100%;
    }

    .error-icon mat-icon {
      font-size: 72px;
      height: 72px;
      width: 72px;
      color: #F44336;
      margin-bottom: 20px;
    }

    h2 {
      color: #333;
      margin-bottom: 16px;
    }

    p {
      color: #666;
      margin-bottom: 32px;
      line-height: 1.5;
    }

    .button-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    button {
      width: 100%;
      height: 48px;
      border-radius: 24px;
      font-weight: 600;
    }
  `]
})
export class PaymentErrorComponent implements OnInit {
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.errorMessage = this.route.snapshot.queryParams['message'] || null;
  }

  retry(): void {
    this.router.navigate(['/payment'], {
      queryParams: this.route.snapshot.queryParams
    });
  }

  closeWindow(): void {
    if (isPlatformBrowser(this.platformId) && window.parent) {
      window.parent.postMessage({
        type: 'PAYMENT_COMPLETE',
        status: 'cancelled'
      }, '*');
    }
  }
}