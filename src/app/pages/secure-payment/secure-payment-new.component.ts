import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OpenpayService } from '../../services/openpay.service';
import { environment } from '../../../environments/environment';

declare var OpenPay: any;

interface SavedCard {
  id: string; // OpenPay card ID
  alias: string;
  cardNumber: string; // Últimos 4 dígitos
  holderName: string;
  brand: string;
  type: string;
  isDefault: boolean;
  status: string;
}

@Component({
  selector: 'app-secure-payment-new',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="secure-payment-container" [class.loading]="isLoading">

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-section">
        <div class="spinner"></div>
        <p>Inicializando pasarela segura...</p>
        <div class="loading-steps">
          <div class="step" [class.active]="currentStep >= 1">🔒 Verificando seguridad</div>
          <div class="step" [class.active]="currentStep >= 2">👤 Obteniendo customer OpenPay</div>
          <div class="step" [class.active]="currentStep >= 3">🃏 Cargando tarjetas guardadas</div>
          <div class="step" [class.active]="currentStep >= 4">✅ Listo para pagar</div>
        </div>
      </div>

      <!-- Success State -->
      <div *ngIf="paymentStatus === 'success'" class="success-section">
        <div class="success-icon">✅</div>
        <h2>¡Pago Exitoso!</h2>
        <div class="success-amount">{{ paymentData.amount | currency:'MXN':'symbol':'1.2-2' }}</div>
        <p>Tu pago ha sido procesado correctamente</p>
        <button class="btn-primary" (click)="closePayment()">Continuar</button>
      </div>

      <!-- Main Payment Interface -->
      <div *ngIf="!isLoading && paymentStatus === 'pending'" class="payment-section">

        <!-- Header -->
        <div class="payment-header">
          <button class="back-btn" (click)="closePayment()">←</button>
          <div class="payment-info">
            <h2>Confirmar Pago</h2>
            <div class="amount">{{ paymentData.amount | currency:'MXN':'symbol':'1.2-2' }}</div>
            <div class="description">{{ paymentData.description }}</div>
          </div>
          <div class="security-badge">🔒</div>
        </div>

        <!-- Saved Cards -->
        <div *ngIf="currentView === 'cards'" class="cards-view">
          <h3>Método de Pago</h3>

          <!-- Loading cards -->
          <div *ngIf="loadingCards" class="loading-cards">
            <div class="spinner-small"></div>
            <span>Cargando tarjetas...</span>
          </div>

          <!-- Cards list -->
          <div *ngIf="!loadingCards && savedCards.length > 0" class="cards-list">
            <div *ngFor="let card of savedCards"
                 class="card-item"
                 [class.selected]="selectedCard?.id === card.id"
                 (click)="selectCard(card)">
              <div class="card-info">
                <div class="card-brand">{{ card.brand.toUpperCase() }}</div>
                <div class="card-number">•••• {{ card.cardNumber }}</div>
                <div class="card-holder">{{ card.holderName }}</div>
              </div>
              <div class="card-radio">
                <input type="radio" [checked]="selectedCard?.id === card.id" readonly>
              </div>
            </div>
          </div>

          <!-- Add new card option -->
          <div class="add-card-option" (click)="showNewCardForm()">
            <div class="add-icon">+</div>
            <div class="add-text">
              <div>Agregar nueva tarjeta</div>
              <small>Visa, Mastercard, American Express</small>
            </div>
          </div>

          <!-- CVV for selected card -->
          <div *ngIf="selectedCard" class="cvv-section">
            <label>Código de Seguridad (CVV)</label>
            <input
              type="text"
              [(ngModel)]="cvv"
              placeholder="123"
              maxlength="4"
              (input)="sanitizeCVV($event)"
              class="cvv-input">
          </div>

          <!-- Pay button for saved card -->
          <button *ngIf="selectedCard && cvv.length >= 3"
                  class="btn-pay"
                  [disabled]="isProcessing"
                  (click)="processPaymentWithSavedCard()">
            <span *ngIf="!isProcessing">Pagar {{ paymentData.amount | currency:'MXN':'symbol':'1.2-2' }}</span>
            <span *ngIf="isProcessing">Procesando...</span>
          </button>
        </div>

        <!-- New Card Form -->
        <div *ngIf="currentView === 'newCard'" class="new-card-view">
          <div class="form-header">
            <button class="back-btn" (click)="showSavedCards()">← Volver</button>
            <h3>Nueva Tarjeta</h3>
          </div>

          <form class="card-form" (ngSubmit)="processPaymentWithNewCard()" #cardForm="ngForm">
            <div class="form-group">
              <label>Número de Tarjeta</label>
              <input
                type="text"
                [(ngModel)]="newCard.number"
                name="cardNumber"
                placeholder="4111 1111 1111 1111"
                maxlength="19"
                (input)="formatCardNumber($event)"
                required>
            </div>

            <div class="form-group">
              <label>Nombre del Titular</label>
              <input
                type="text"
                [(ngModel)]="newCard.holderName"
                name="holderName"
                placeholder="Como aparece en la tarjeta"
                required>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Expiración</label>
                <div class="expiry-inputs">
                  <select [(ngModel)]="newCard.expiryMonth" name="month" required>
                    <option value="">MM</option>
                    <option *ngFor="let month of months" [value]="month">{{ month }}</option>
                  </select>
                  <select [(ngModel)]="newCard.expiryYear" name="year" required>
                    <option value="">AAAA</option>
                    <option *ngFor="let year of years" [value]="year">{{ year }}</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>CVV</label>
                <input
                  type="text"
                  [(ngModel)]="newCard.cvv"
                  name="cvv"
                  placeholder="123"
                  maxlength="4"
                  (input)="sanitizeCVV($event)"
                  required>
              </div>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="newCard.saveCard" name="saveCard">
                <span class="checkmark"></span>
                Guardar esta tarjeta para futuros pagos
              </label>
            </div>

            <div *ngIf="validationErrors.length > 0" class="errors">
              <div *ngFor="let error of validationErrors" class="error">{{ error }}</div>
            </div>

            <button type="submit"
                    class="btn-pay"
                    [disabled]="isProcessing || !cardForm.valid">
              <span *ngIf="!isProcessing">Pagar {{ paymentData.amount | currency:'MXN':'symbol':'1.2-2' }}</span>
              <span *ngIf="isProcessing">Procesando...</span>
            </button>
          </form>
        </div>

      </div>

      <!-- Debug Panel -->
      <div *ngIf="showDebugPanel" class="debug-panel">
        <h4>🔍 Debug Info</h4>
        <div class="debug-content">
          <p><strong>Customer ID:</strong> {{ customerData?.customer_id || 'N/A' }}</p>
          <p><strong>Cards Count:</strong> {{ savedCards.length }}</p>
          <p><strong>Current View:</strong> {{ currentView }}</p>
          <p><strong>Selected Card:</strong> {{ selectedCard?.id || 'None' }}</p>
          <p><strong>Payment Status:</strong> {{ paymentStatus }}</p>

          <h5>Logs:</h5>
          <div class="debug-logs">
            <div *ngFor="let log of debugLogs" class="log-entry">
              <span class="log-time">{{ log.time }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Debug Toggle -->
      <button class="debug-toggle" (click)="toggleDebug()">
        {{ showDebugPanel ? '✕' : '🐛' }}
      </button>

    </div>
  `,
  styles: [`
    .secure-payment-container {
      min-height: 100vh;
      background: #f8f9fa;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .loading-section {
      text-align: center;
      padding: 60px 20px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e3e3e3;
      border-top: 3px solid #007AFF;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    .loading-steps {
      margin-top: 30px;
    }

    .step {
      padding: 8px;
      margin: 5px 0;
      opacity: 0.5;
      transition: opacity 0.3s;
    }

    .step.active {
      opacity: 1;
      color: #007AFF;
    }

    .success-section {
      text-align: center;
      padding: 60px 20px;
    }

    .success-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }

    .success-amount {
      font-size: 32px;
      font-weight: bold;
      color: #007AFF;
      margin: 20px 0;
    }

    .payment-header {
      display: flex;
      align-items: center;
      margin-bottom: 30px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .back-btn {
      background: none;
      border: none;
      font-size: 24px;
      margin-right: 15px;
      cursor: pointer;
    }

    .payment-info {
      flex: 1;
    }

    .amount {
      font-size: 24px;
      font-weight: bold;
      color: #007AFF;
    }

    .description {
      color: #666;
      margin-top: 5px;
    }

    .security-badge {
      font-size: 20px;
    }

    .cards-view h3 {
      margin-bottom: 20px;
    }

    .loading-cards {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px;
      text-align: center;
    }

    .spinner-small {
      width: 20px;
      height: 20px;
      border: 2px solid #e3e3e3;
      border-top: 2px solid #007AFF;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .cards-list {
      margin-bottom: 20px;
    }

    .card-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 15px;
      background: white;
      border-radius: 8px;
      margin-bottom: 10px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.2s;
    }

    .card-item:hover {
      border-color: #007AFF;
    }

    .card-item.selected {
      border-color: #007AFF;
      background: #f0f8ff;
    }

    .card-brand {
      font-weight: bold;
      color: #007AFF;
    }

    .card-number {
      font-size: 18px;
      margin: 5px 0;
    }

    .card-holder {
      color: #666;
      font-size: 14px;
    }

    .add-card-option {
      display: flex;
      align-items: center;
      padding: 15px;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      border: 2px dashed #ddd;
      margin-bottom: 20px;
    }

    .add-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #007AFF;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      margin-right: 15px;
    }

    .cvv-section {
      margin-bottom: 20px;
    }

    .cvv-section label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .cvv-input {
      width: 100px;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 16px;
    }

    .form-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
    }

    .card-form {
      background: white;
      padding: 20px;
      border-radius: 12px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .form-group input, .form-group select {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 16px;
    }

    .form-row {
      display: flex;
      gap: 15px;
    }

    .form-row .form-group {
      flex: 1;
    }

    .expiry-inputs {
      display: flex;
      gap: 10px;
    }

    .expiry-inputs select {
      flex: 1;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      cursor: pointer;
    }

    .checkmark {
      width: 20px;
      height: 20px;
      border: 2px solid #ddd;
      border-radius: 4px;
      margin-right: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-pay, .btn-primary {
      width: 100%;
      padding: 15px;
      background: #007AFF;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-pay:hover, .btn-primary:hover {
      background: #0056b3;
    }

    .btn-pay:disabled, .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .errors {
      margin-bottom: 15px;
    }

    .error {
      color: #dc3545;
      font-size: 14px;
      margin-bottom: 5px;
    }

    .debug-panel {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #1a1a1a;
      color: #00ff00;
      padding: 15px;
      border-radius: 8px;
      max-width: 300px;
      max-height: 400px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 12px;
    }

    .debug-toggle {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #007AFF;
      color: white;
      border: none;
      font-size: 18px;
      cursor: pointer;
    }

    .debug-logs {
      max-height: 200px;
      overflow-y: auto;
    }

    .log-entry {
      display: flex;
      margin-bottom: 5px;
      font-size: 10px;
    }

    .log-time {
      color: #888;
      margin-right: 10px;
      min-width: 60px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class SecurePaymentNewComponent implements OnInit, OnDestroy {
  // Estado general
  isLoading = true;
  isProcessing = false;
  currentStep = 0;
  paymentStatus: 'pending' | 'success' | 'error' = 'pending';
  currentView: 'cards' | 'newCard' = 'cards';

  // Datos del pago
  paymentData: any = {};
  authToken = '';
  customerData: any = {};

  // Tarjetas
  savedCards: SavedCard[] = [];
  selectedCard: SavedCard | null = null;
  loadingCards = false;
  cvv = '';

  // Nueva tarjeta
  newCard = {
    number: '',
    holderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    saveCard: false
  };

  // Validación
  validationErrors: string[] = [];

  // Device session
  deviceSessionId = '';

  // Debug
  showDebugPanel = false;
  debugLogs: Array<{time: string, message: string}> = [];

  // Helper arrays
  months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  years: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private openpayService: OpenpayService,
    private ngZone: NgZone
  ) {
    // Generate years array
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 15; i++) {
      this.years.push((currentYear + i).toString());
    }
  }

  async ngOnInit() {
    try {
      this.addDebugLog('Iniciando pasarela de pagos...');
      await this.initializePaymentGateway();
    } catch (error) {
      console.error('Error initializing payment gateway:', error);
      this.addDebugLog('Error: ' + (error as Error).message);
    }
  }

  ngOnDestroy() {
    // Cleanup
  }

  private async initializePaymentGateway() {
    this.currentStep = 1;
    this.addDebugLog('Paso 1: Verificando seguridad...');

    // Obtener parámetros
    this.route.queryParams.subscribe(async params => {
      this.authToken = params['auth_token'];

      if (!this.authToken) {
        throw new Error('Token de autenticación requerido');
      }

      this.addDebugLog('Token obtenido: ' + this.authToken.substring(0, 10) + '...');

      // Validar token y obtener datos del pago
      await this.validateTokenAndGetPaymentData();

      this.currentStep = 2;
      this.addDebugLog('Paso 2: Obteniendo customer OpenPay...');

      // Obtener customer OpenPay
      await this.getOpenPayCustomer();

      this.currentStep = 3;
      this.addDebugLog('Paso 3: Cargando tarjetas guardadas...');

      // Cargar tarjetas guardadas
      await this.loadSavedCards();

      this.currentStep = 4;
      this.addDebugLog('Paso 4: Inicializando OpenPay.js...');

      // Inicializar OpenPay.js
      await this.initializeOpenPayJS();

      this.isLoading = false;
      this.addDebugLog('✅ Pasarela lista para usar');
    });
  }

  private async validateTokenAndGetPaymentData() {
    const response = await fetch('http://172.18.1.65:8000/api/payment/validate-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        auth_token: this.authToken
      })
    });

    if (!response.ok) {
      throw new Error('Token inválido o expirado');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Error validando token');
    }

    this.paymentData = {
      userId: data.user.id,
      amount: data.payment_data.amount,
      description: this.generatePaymentDescription(data.payment_data),
      currency: 'MXN',
      type: data.payment_data.type,
      relatedId: data.payment_data.related_id
    };

    this.addDebugLog('Datos de pago obtenidos: $' + this.paymentData.amount);
  }

  private async getOpenPayCustomer() {
    this.addDebugLog('🔄 Forzando creación de customer real de OpenPay...');
    this.addDebugLog('🔑 Token: ' + (this.authToken ? this.authToken.substring(0, 20) + '...' : 'NO TOKEN'));

    try {
      const response = await fetch('http://172.18.1.65:8000/api/openpay-force-real-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payment_token: this.authToken
        })
      });

      this.addDebugLog('📡 Response status: ' + response.status);

      if (!response.ok) {
        const errorText = await response.text();
        this.addDebugLog('❌ Error response: ' + errorText);
        throw new Error('Error creando customer OpenPay real: ' + errorText);
      }

      const data = await response.json();
      this.addDebugLog('📦 Response data: ' + JSON.stringify(data));

      if (!data.success) {
        throw new Error(data.error || 'Error creando customer real');
      }

      this.customerData = data;
      this.addDebugLog('✅ Customer OpenPay REAL creado: ' + data.customer_id);
      this.addDebugLog('📧 Email: ' + data.user.email);
    } catch (error) {
      this.addDebugLog('💥 Exception: ' + error);
      throw error;
    }
  }

  private async loadSavedCards() {
    this.loadingCards = true;

    try {
      const response = await fetch('http://172.18.1.65:8000/api/openpay-get-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payment_token: this.authToken
        })
      });

      if (!response.ok) {
        throw new Error('Error cargando tarjetas');
      }

      const data = await response.json();

      if (data.success) {
        this.savedCards = data.cards || [];
        this.addDebugLog('Tarjetas cargadas: ' + this.savedCards.length);
      } else {
        this.addDebugLog('Sin tarjetas guardadas');
        this.savedCards = [];
      }
    } catch (error) {
      console.error('Error loading cards:', error);
      this.addDebugLog('Error cargando tarjetas: ' + (error as Error).message);
      this.savedCards = [];
    } finally {
      this.loadingCards = false;
    }
  }

  private async initializeOpenPayJS() {
    return new Promise<void>((resolve, reject) => {
      if (typeof OpenPay === 'undefined') {
        reject(new Error('OpenPay.js no está cargado'));
        return;
      }

      try {
        OpenPay.setId(environment.openpay.merchantId);
        OpenPay.setApiKey(environment.openpay.publicKey);
        OpenPay.setSandboxMode(environment.openpay.sandbox);

        // Generar device session ID
        if (OpenPay.deviceData) {
          this.deviceSessionId = OpenPay.deviceData.setup();
          this.addDebugLog('Device session ID generado');
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  selectCard(card: SavedCard) {
    this.selectedCard = card;
    this.cvv = '';
    this.addDebugLog('Tarjeta seleccionada: ' + card.brand + ' ***' + card.cardNumber);
  }

  showNewCardForm() {
    this.currentView = 'newCard';
    this.selectedCard = null;
    this.addDebugLog('Mostrando formulario nueva tarjeta');
  }

  showSavedCards() {
    this.currentView = 'cards';
    this.addDebugLog('Mostrando tarjetas guardadas');
  }

  async processPaymentWithSavedCard() {
    if (!this.selectedCard || !this.cvv) {
      return;
    }

    this.isProcessing = true;
    this.addDebugLog('Procesando pago con tarjeta guardada...');

    try {
      // Usar el ID de la tarjeta guardada directamente como source_id
      const payloadData = {
        payment_token: this.authToken,
        source_id: this.selectedCard.id, // ID de tarjeta guardada
        device_session_id: this.deviceSessionId,
        amount: this.paymentData.amount
      };

      this.addDebugLog('🔍 Datos enviados al backend: ' + JSON.stringify(payloadData));
      this.addDebugLog('📋 Tarjeta seleccionada: ' + JSON.stringify(this.selectedCard));

      const response = await fetch('http://172.18.1.65:8000/api/openpay-create-charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payloadData)
      });

      const result = await response.json();
      this.addDebugLog('📡 Respuesta del servidor: ' + JSON.stringify(result));

      if (result.success) {
        // Verificar si es respuesta de 3D Secure con redirección
        if (result.charge.payment_method && result.charge.payment_method.url) {
          this.addDebugLog('🔐 Redirigiendo a 3D Secure: ' + result.charge.payment_method.url);
          // Redirigir a la URL de 3D Secure en la misma ventana
          window.location.href = result.charge.payment_method.url;
          return;
        }

        this.addDebugLog('✅ Pago exitoso: ' + result.charge.id);
        this.paymentStatus = 'success';

        // Notificar a la app padre
        this.notifyPaymentSuccess(result.charge);
      } else {
        const errorMessage = result.error || result.message || 'Error desconocido';
        this.addDebugLog('❌ Pago falló: ' + errorMessage);
        this.addDebugLog('📋 Respuesta completa: ' + JSON.stringify(result));
        this.validationErrors = [errorMessage];
      }
    } catch (error) {
      console.error('Payment error:', error);
      this.addDebugLog('❌ Error: ' + (error as Error).message);
      this.validationErrors = ['Error procesando el pago: ' + (error as Error).message];
    } finally {
      this.isProcessing = false;
    }
  }

  async processPaymentWithNewCard() {
    if (!this.validateNewCardForm()) {
      return;
    }

    this.isProcessing = true;
    this.addDebugLog('Procesando pago con nueva tarjeta...');

    try {
      // Crear token de tarjeta con OpenPay.js
      const token = await this.createCardToken();
      this.addDebugLog('Token creado: ' + token.id);

      let sourceId = token.id;

      // Si se debe guardar la tarjeta, primero agregarla al customer
      if (this.newCard.saveCard) {
        this.addDebugLog('Guardando tarjeta...');
        const cardResponse = await fetch('http://172.18.1.65:8000/api/openpay-add-card', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            payment_token: this.authToken,
            token_id: token.id,
            device_session_id: this.deviceSessionId
          })
        });

        const cardResult = await cardResponse.json();

        if (cardResult.success) {
          sourceId = cardResult.card.id; // Usar el ID de la tarjeta guardada
          this.addDebugLog('Tarjeta guardada: ' + cardResult.card.id);
        } else {
          this.addDebugLog('Error guardando tarjeta: ' + cardResult.error);
          // Continuar con el token original si no se pudo guardar
        }
      }

      // Crear cargo
      const response = await fetch('http://172.18.1.65:8000/api/openpay-create-charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payment_token: this.authToken,
          source_id: sourceId,
          device_session_id: this.deviceSessionId,
          amount: this.paymentData.amount
        })
      });

      const result = await response.json();
      this.addDebugLog('📡 Respuesta del servidor: ' + JSON.stringify(result));

      if (result.success) {
        // Verificar si es respuesta de 3D Secure con redirección
        if (result.charge.payment_method && result.charge.payment_method.url) {
          this.addDebugLog('🔐 Redirigiendo a 3D Secure: ' + result.charge.payment_method.url);
          // Redirigir a la URL de 3D Secure en la misma ventana
          window.location.href = result.charge.payment_method.url;
          return;
        }

        this.addDebugLog('✅ Pago exitoso: ' + result.charge.id);
        this.paymentStatus = 'success';

        // Si se guardó la tarjeta, recargar la lista
        if (this.newCard.saveCard) {
          await this.loadSavedCards();
        }

        // Notificar a la app padre
        this.notifyPaymentSuccess(result.charge);
      } else {
        const errorMessage = result.error || result.message || 'Error desconocido';
        this.addDebugLog('❌ Pago falló: ' + errorMessage);
        this.addDebugLog('📋 Respuesta completa: ' + JSON.stringify(result));
        this.validationErrors = [errorMessage];
      }
    } catch (error) {
      console.error('Payment error:', error);
      this.addDebugLog('❌ Error: ' + (error as Error).message);
      this.validationErrors = ['Error procesando el pago: ' + (error as Error).message];
    } finally {
      this.isProcessing = false;
    }
  }

  private async createCardToken(): Promise<any> {
    return new Promise((resolve, reject) => {
      const cardData = {
        card_number: this.newCard.number.replace(/\s/g, ''),
        holder_name: this.newCard.holderName,
        expiration_year: this.newCard.expiryYear.slice(-2),
        expiration_month: this.newCard.expiryMonth,
        cvv2: this.newCard.cvv
      };

      OpenPay.token.create(cardData,
        (response: any) => {
          // OpenPay devuelve el token en response.data.id
          const token = {
            id: response.data?.id || response.id,
            brand: response.data?.card?.brand,
            card_number: response.data?.card?.card_number
          };
          resolve(token);
        },
        (error: any) => {
          reject(new Error(error.description || 'Error creando token de tarjeta'));
        }
      );
    });
  }

  private validateNewCardForm(): boolean {
    this.validationErrors = [];

    const cardNumber = this.newCard.number.replace(/\s/g, '');

    if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
      this.validationErrors.push('Número de tarjeta inválido');
    }

    if (!this.newCard.holderName.trim()) {
      this.validationErrors.push('Nombre del titular requerido');
    }

    if (!this.newCard.expiryMonth || !this.newCard.expiryYear) {
      this.validationErrors.push('Fecha de expiración requerida');
    }

    if (!this.newCard.cvv || this.newCard.cvv.length < 3) {
      this.validationErrors.push('CVV requerido');
    }

    return this.validationErrors.length === 0;
  }

  private notifyPaymentSuccess(charge: any) {
    const message = {
      type: 'PAYMENT_SUCCESS',
      source: 'mex-padel-payment-gateway',
      data: {
        id: charge.id,
        amount: charge.amount,
        currency: charge.currency,
        status: charge.status,
        authorization: charge.authorization,
        order_id: charge.order_id
      },
      timestamp: new Date().toISOString()
    };

    // Enviar mensaje a la app padre
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, '*');
    }

    if (window.top && window.top !== window) {
      window.top.postMessage(message, '*');
    }

    this.addDebugLog('Mensaje enviado a app padre');
  }

  closePayment() {
    const message = {
      type: 'PAYMENT_CLOSED',
      source: 'mex-padel-payment-gateway',
      data: { status: this.paymentStatus },
      timestamp: new Date().toISOString()
    };

    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, '*');
    }

    if (window.top && window.top !== window) {
      window.top.postMessage(message, '*');
    }
  }

  // Utility methods
  formatCardNumber(event: any) {
    const input = event.target;
    let value = input.value.replace(/\D/g, '');
    value = value.substring(0, 16);
    const formattedValue = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    this.newCard.number = formattedValue;
    input.value = formattedValue;
  }

  sanitizeCVV(event: any) {
    const input = event.target;
    let value = input.value.replace(/\D/g, '');
    value = value.substring(0, 4);

    if (event.target === event.target.closest('.cvv-section')?.querySelector('input')) {
      this.cvv = value;
    } else {
      this.newCard.cvv = value;
    }

    input.value = value;
  }

  private generatePaymentDescription(paymentData: any): string {
    switch (paymentData.type) {
      case 'reservation':
        return `Reserva de cancha #${paymentData.related_id}`;
      case 'tournament':
        return `Inscripción a torneo #${paymentData.related_id}`;
      case 'shop':
        return `Compra en tienda #${paymentData.related_id}`;
      default:
        return `Pago MEX PADEL #${paymentData.related_id}`;
    }
  }

  toggleDebug() {
    this.showDebugPanel = !this.showDebugPanel;
  }

  private addDebugLog(message: string) {
    const time = new Date().toLocaleTimeString();
    this.debugLogs.unshift({ time, message });

    // Mantener solo los últimos 50 logs
    if (this.debugLogs.length > 50) {
      this.debugLogs = this.debugLogs.slice(0, 50);
    }

    console.log(`[${time}] ${message}`);
  }
}