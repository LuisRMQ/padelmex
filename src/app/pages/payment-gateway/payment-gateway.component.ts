import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

import { OpenpayService } from '../../services/openpay.service';
import { PaymentRequest, OpenPayCard } from '../../models/payment.model';

@Component({
  selector: 'app-payment-gateway',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './payment-gateway.component.html',
  styleUrls: ['./payment-gateway.component.css']
})
export class PaymentGatewayComponent implements OnInit, OnDestroy {
  paymentForm: FormGroup;
  isProcessing = false;
  paymentStatus = 'idle';
  paymentData: PaymentRequest | null = null;

  private subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private openpayService: OpenpayService,
    private snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.paymentForm = this.createForm();
  }

  ngOnInit(): void {
    this.validateAccess();
    this.subscribeToPaymentStatus();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{13,19}$/)]],
      holderName: ['', [Validators.required, Validators.minLength(2)]],
      expirationMonth: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]],
      expirationYear: ['', [Validators.required, Validators.pattern(/^\d{2}$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]]
    });
  }

  private validateAccess(): void {
    // Obtener parámetros de la URL
    const userId = this.route.snapshot.queryParams['userId'];
    const amount = this.route.snapshot.queryParams['amount'];
    const description = this.route.snapshot.queryParams['description'] || 'Pago de servicio';

    // Validar parámetros requeridos
    if (!userId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      this.showError('Parámetros de pago inválidos');
      this.redirectToError();
      return;
    }

    // Validar que viene de origen autorizado (para iframe)
    if (isPlatformBrowser(this.platformId)) {
      const referrer = document.referrer;
      if (!referrer || !this.isAuthorizedOrigin(referrer)) {
        console.warn('Acceso desde origen no autorizado');
      }
    }

    this.paymentData = {
      userId: this.openpayService.sanitizeUserId(userId),
      amount: this.openpayService.sanitizeAmount(Number(amount)),
      description: description
    };
  }

  private isAuthorizedOrigin(origin: string): boolean {
    const authorizedOrigins = [
      'localhost',
      '127.0.0.1',
      'your-mobile-app-domain.com'
    ];

    return authorizedOrigins.some(authorized => origin.includes(authorized));
  }

  private subscribeToPaymentStatus(): void {
    this.subscription.add(
      this.openpayService.paymentStatus$.subscribe(status => {
        this.paymentStatus = status;
        this.isProcessing = status === 'processing';
      })
    );
  }

  onSubmit(): void {
    if (!this.paymentForm.valid || !this.paymentData) {
      this.markFormGroupTouched();
      return;
    }

    this.isProcessing = true;
    this.processPayment();
  }

  private async processPayment(): Promise<void> {
    try {
      const formValue = this.paymentForm.value;

      // Crear objeto de tarjeta para OpenPay
      const card: OpenPayCard = {
        card_number: formValue.cardNumber.replace(/\s/g, ''),
        holder_name: formValue.holderName.trim(),
        expiration_year: formValue.expirationYear,
        expiration_month: formValue.expirationMonth,
        cvv2: formValue.cvv
      };

      // Crear token seguro
      const token = await this.openpayService.createToken(card);

      // Procesar pago
      this.subscription.add(
        this.openpayService.processPayment(this.paymentData!, token.id).subscribe({
          next: (response) => {
            this.handlePaymentSuccess(response);
          },
          error: (error) => {
            this.handlePaymentError(error);
          }
        })
      );

    } catch (error: any) {
      this.handlePaymentError(error);
    }
  }

  private handlePaymentSuccess(response: any): void {
    this.openpayService.updatePaymentStatus('completed');
    this.showSuccess('Pago procesado exitosamente');

    // Enviar mensaje al parent (app móvil)
    if (isPlatformBrowser(this.platformId) && window.parent) {
      window.parent.postMessage({
        type: 'PAYMENT_SUCCESS',
        data: response
      }, '*');
    }

    setTimeout(() => {
      this.router.navigate(['/payment-success']);
    }, 2000);
  }

  private handlePaymentError(error: any): void {
    this.isProcessing = false;
    this.openpayService.updatePaymentStatus('failed');

    const errorMessage = error.message || 'Error al procesar el pago';
    this.showError(errorMessage);

    // Enviar mensaje al parent (app móvil)
    if (isPlatformBrowser(this.platformId) && window.parent) {
      window.parent.postMessage({
        type: 'PAYMENT_ERROR',
        error: errorMessage
      }, '*');
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.paymentForm.controls).forEach(key => {
      this.paymentForm.get(key)?.markAsTouched();
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  private redirectToError(): void {
    setTimeout(() => {
      this.router.navigate(['/payment-error']);
    }, 1000);
  }

  // Formateo de número de tarjeta
  onCardNumberInput(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    value = value.substring(0, 19);
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    this.paymentForm.patchValue({ cardNumber: value });
  }

  // Validar entrada solo números
  onNumberInput(event: KeyboardEvent): void {
    const pattern = /[0-9]/;
    if (!pattern.test(event.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
    }
  }

  getFieldErrorMessage(fieldName: string): string {
    const field = this.paymentForm.get(fieldName);
    if (field?.hasError('required')) return `${fieldName} es requerido`;
    if (field?.hasError('pattern')) return `${fieldName} tiene formato inválido`;
    if (field?.hasError('minlength')) return `${fieldName} es muy corto`;
    return '';
  }
}