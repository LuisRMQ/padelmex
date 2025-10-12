import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OpenpayService } from '../../services/openpay.service';
import { OpenPayCard, PaymentRequest, PaymentResponse, SavedCard } from '../../models/payment.model';
import { environment } from '../../../environments/environment';

declare var OpenPay: any;

@Component({
  selector: 'app-secure-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './secure-payment.component.html',
  styleUrls: ['./secure-payment.component.css']
})
export class SecurePaymentComponent implements OnInit, OnDestroy {
  // Estado del componente
  isLoading = true;
  isProcessing = false;
  securityChecksComplete = false;
  fraudDetected = false;

  // Estados de vista
  currentView: 'cards' | 'newCard' = 'cards';
  showCardForm = false;

  // Modo del componente
  operationMode: 'payment' | 'add_card' = 'payment'; // Nuevo: modo de operación

  // Datos del pago
  paymentData: any = {};
  deviceSessionId = '';
  deviceFingerprint = '';
  authToken = ''; // Token de autenticación del iframe

  // Tarjetas guardadas
  savedCards: SavedCard[] = [];
  selectedCard: SavedCard | null = null;
  loadingCards = false;
  cardDebugLogs: Array<{time: string, level: string, message: string}> = [];
  apiDebugLogs: Array<{time: string, type: string, url: string, method: string, headers?: any, body?: any, response?: any, status?: number, expanded?: boolean}> = [];

  // Formulario de tarjeta
  cardForm = {
    number: '',
    holderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    saveCard: false,
    cardAlias: '' // Alias para guardar la tarjeta
  };

  // Validaciones y errores
  errors: any = {};
  validationErrors: string[] = [];

  // Debug panel
  showDebugPanel = false;
  debugInfo = {
    requestData: null as any,
    response: null as any,
    errors: [] as string[],
    eventLog: [] as { time: string, message: string }[]
  };

  // Configuración de seguridad
  securityConfig = {
    maxInputLength: 19, // Número de tarjeta
    allowedCardTypes: ['visa', 'mastercard', 'amex'],
    maxAttempts: 3,
    sessionTimeout: 900000 // 15 minutos
  };

  attempts = 0;
  private sessionStartTime = Date.now();
  private securityTimer: any;

  constructor(
    private route: ActivatedRoute,
    private openpayService: OpenpayService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.initializeSecurePayment();
    this.initializeDebugPanel();
    this.loadSavedCards();
  }

  ngOnDestroy(): void {
    if (this.securityTimer) {
      clearInterval(this.securityTimer);
    }
  }

  /**
   * Inicializar pago seguro
   */
  private async initializeSecurePayment(): Promise<void> {
    try {
      console.log('Starting secure payment initialization...');

      // 1. Verificar contexto de seguridad
      if (!this.verifySecurityContext()) {
        this.handleSecurityViolation('Invalid security context');
        return;
      }
      console.log('Security context verified');

      // 2. Obtener parámetros seguros y autenticar si es necesario
      await this.extractSecureParameters();
      console.log('Parameters extracted and authenticated');

      // 3. Inicializar OpenPay
      await this.initializeOpenPay();
      console.log('OpenPay initialized');

      // 4. Generar device fingerprint
      this.deviceFingerprint = await this.openpayService.generateDeviceFingerprint();
      this.deviceSessionId = this.openpayService.getDeviceSessionId();
      console.log('Device fingerprint generated');

      // 5. Verificar fraude
      await this.performFraudDetection();
      console.log('Fraud detection completed');

      // 6. Inicializar comunicación con parent
      this.openpayService.initializeSecurePostMessage();
      console.log('PostMessage initialized');

      // 7. Cargar tarjetas guardadas del usuario
      await this.loadSavedCards();
      console.log('Saved cards loaded');

      // 8. Configurar monitoreo de seguridad
      this.setupSecurityMonitoring();
      console.log('Security monitoring setup');

      this.securityChecksComplete = true;
      this.isLoading = false;
      console.log('Secure payment initialization completed successfully');

    } catch (error) {
      console.error('Failed to initialize secure payment:', error);
      this.handleSecurityViolation('Initialization failed');
    }
  }

  /**
   * Verificar contexto de seguridad
   */
  private verifySecurityContext(): boolean {
    // Detectar si estamos en entorno de desarrollo o simulador
    const isDevelopment = !environment.production;
    const isSimulator = /simulator|ios simulator/i.test(navigator.userAgent) ||
                       window.location.hostname === 'localhost' ||
                       window.location.hostname.includes('127.0.0.1');

    // En desarrollo o simulador, ser más permisivo
    if (isDevelopment || isSimulator) {
      console.log('Development/Simulator mode - security checks relaxed');

      // Solo verificaciones básicas en desarrollo
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        console.warn('Non-HTTPS in development, but allowing');
      }

      return true; // Permitir en desarrollo/simulador
    }

    // Solo en producción aplicar verificaciones estrictas
    // 1. Verificar HTTPS
    if (!this.openpayService.checkSecurityHeaders()) {
      console.error('Insecure context detected');
      return false;
    }

    // 2. Verificar que estamos en iframe
    if (window.parent === window) {
      console.error('Not running in iframe context');
      return false;
    }

    // 3. Verificar headers de seguridad
    try {
      // Intentar acceso a parent para verificar same-origin o configuración correcta
      const parentOrigin = document.referrer;
      if (!parentOrigin && window.parent !== window) {
        console.warn('No referrer detected, proceeding with caution');
      }
    } catch (e) {
      // Es normal que falle por CORS si está bien configurado
    }

    return true;
  }

  /**
   * Extraer parámetros seguros de la URL y autenticar automáticamente
   */
  private async extractSecureParameters(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.route.queryParams.subscribe(async params => {
        try {
          console.log('Extracting parameters:', params);

          // Detectar modo de operación
          const mode = params['mode'];
          if (mode === 'add_card') {
            this.operationMode = 'add_card';
            console.log('🃏 Operating in ADD CARD mode');
            // En modo agregar tarjeta, forzar vista de nueva tarjeta
            this.currentView = 'newCard';
            this.showCardForm = true;
          } else {
            this.operationMode = 'payment';
            console.log('💳 Operating in PAYMENT mode');
          }

          // Verificar si hay token de autenticación automática
          const authToken = params['auth_token'];

          if (authToken) {
            console.log('Found auth token, attempting auto-authentication...');
            this.authToken = authToken; // Guardar el token para uso posterior
            try {
              // Validar token y obtener datos de usuario automáticamente
              await this.authenticateWithToken(authToken);
              console.log('Auto-authentication successful');
              resolve();
              return;
            } catch (error) {
              console.error('Auto-authentication failed:', error);
              reject(new Error('Authentication token validation failed'));
              return;
            }
          }

          // Flujo normal para casos sin autenticación automática
          console.log('No auth token found, using manual parameters');
          this.paymentData = {
            userId: this.sanitizeInput(params['userId']),
            amount: this.sanitizeAmount(params['amount']),
            description: this.sanitizeInput(params['description']),
            currency: params['currency'] || 'MXN'
          };

          // Validar parámetros obligatorios solo si no hay autenticación automática
          if (!this.paymentData.userId || !this.paymentData.amount) {
            console.error('Missing required payment parameters:', this.paymentData);
            reject(new Error('Missing required payment parameters'));
            return;
          }

          resolve();
        } catch (error) {
          console.error('Error in extractSecureParameters:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Inicializar OpenPay con configuración segura
   */
  private async initializeOpenPay(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof OpenPay === 'undefined') {
        reject(new Error('OpenPay SDK not loaded'));
        return;
      }

      try {
        OpenPay.setId(environment.openpay.merchantId);
        OpenPay.setApiKey(environment.openpay.publicKey);
        OpenPay.setSandboxMode(environment.openpay.sandbox);

        // Configurar device data de OpenPay
        if (OpenPay.deviceData) {
          this.deviceSessionId = OpenPay.deviceData.setup();
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Realizar detección de fraude
   */
  private async performFraudDetection(): Promise<void> {
    const suspiciousActivity = this.openpayService.detectSuspiciousBehavior();

    if (suspiciousActivity.isSuspicious) {
      console.warn('Suspicious activity detected:', suspiciousActivity.reasons);

      // En producción, enviar alertas pero permitir continuar con precaución
      if (environment.production) {
        this.logSecurityEvent('suspicious_activity', {
          reasons: suspiciousActivity.reasons,
          deviceFingerprint: this.deviceFingerprint
        });
      } else {
        // En desarrollo, solo advertir
        console.warn('Suspicious activity (dev mode):', suspiciousActivity.reasons);
      }
    }
  }

  /**
   * Configurar monitoreo de seguridad continuo
   */
  private setupSecurityMonitoring(): void {
    // Verificar integridad cada 30 segundos
    this.securityTimer = setInterval(() => {
      // 1. Verificar timeout de sesión
      const sessionAge = Date.now() - this.sessionStartTime;
      if (sessionAge > this.securityConfig.sessionTimeout) {
        this.handleSecurityViolation('Session timeout');
        return;
      }

      // 2. Verificar manipulación del DOM
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        if (form.hasAttribute('data-modified')) {
          this.handleSecurityViolation('DOM manipulation detected');
        }
      });

      // 3. Verificar herramientas de desarrollo
      if (this.isDevToolsOpen()) {
        this.logSecurityEvent('dev_tools_open', {});
      }

    }, 30000);
  }

  /**
   * Procesar pago de forma segura
   */
  async processSecurePaymentOLD(): Promise<void> {
    if (this.isProcessing || !this.securityChecksComplete) {
      return;
    }

    // Verificar límite de intentos
    if (this.attempts >= this.securityConfig.maxAttempts) {
      this.handleSecurityViolation('Too many payment attempts');
      return;
    }

    this.attempts++;
    this.isProcessing = true;
    this.errors = {};

    try {
      // 1. Validar formulario
      if (!this.validatePaymentForm()) {
        this.isProcessing = false;
        return;
      }

      // 2. Verificar seguridad antes del procesamiento
      const finalSecurityCheck = this.openpayService.detectSuspiciousBehavior();
      if (finalSecurityCheck.isSuspicious) {
        this.logSecurityEvent('pre_payment_security_check_failed', {
          reasons: finalSecurityCheck.reasons
        });
      }

      // 3. Crear token de tarjeta
      const cardData: OpenPayCard = {
        card_number: this.sanitizeCardNumber(this.cardForm.number),
        holder_name: this.sanitizeInput(this.cardForm.holderName).toUpperCase(),
        expiration_year: this.cardForm.expiryYear.toString().slice(-2),
        expiration_month: this.cardForm.expiryMonth.padStart(2, '0'),
        cvv2: this.cardForm.cvv
      };

      // const token = await this.openpayService.createToken(cardData);

      // 4. Procesar pago
      const paymentRequest: PaymentRequest = {
        userId: this.paymentData.userId,
        amount: this.paymentData.amount,
        description: this.paymentData.description,
        paymentMethod: 'card',
        // tokenId: token.id,
        deviceSessionId: this.deviceSessionId
      };

      // const result = await this.openpayService.processPayment(paymentRequest, token.id).toPromise();

      // 5. Manejar resultado
      // if (result && result.status === 'completed') {
      //   this.handlePaymentSuccessOLD(result);
      // } else if (result) {
      //   this.handlePaymentPendingOLD(result);
      // } else {
      //   throw new Error('No payment result received');
      // }

    } catch (error) {
      console.error('Payment processing error:', error);
      this.handlePaymentError(error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Validar formulario de pago
   */
  private validatePaymentForm(): boolean {
    this.validationErrors = [];
    console.log('Validating payment form...', { selectedCard: this.selectedCard, cardForm: this.cardForm });

    if (this.selectedCard) {
      // Solo validar CVV para tarjeta guardada
      const cleanCVV = this.cardForm.cvv.replace(/\D/g, '');
      if (!cleanCVV || cleanCVV.length < 3 || cleanCVV.length > 4) {
        this.validationErrors.push('CVV requerido (3 o 4 dígitos)');
      } else {
        // Actualizar el CVV limpio en el formulario
        this.cardForm.cvv = cleanCVV;
      }
    } else {
      // Validar nueva tarjeta completa
      const cardNumber = this.cardForm.number.replace(/\s/g, '');

      // Validar longitud básica
      if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
        this.validationErrors.push('Número de tarjeta inválido');
      } else if (!/^\d+$/.test(cardNumber)) {
        this.validationErrors.push('El número de tarjeta solo debe contener dígitos');
      } else if (!this.isValidCardNumber(cardNumber)) {
        this.validationErrors.push('El número de tarjeta no es válido');
      }

      if (!this.cardForm.holderName || this.cardForm.holderName.trim().length < 3) {
        this.validationErrors.push('Nombre del titular requerido');
      }

      // Validar mes de expiración
      const month = parseInt(this.cardForm.expiryMonth);
      if (!this.cardForm.expiryMonth || month < 1 || month > 12) {
        this.validationErrors.push('Mes de expiración inválido');
      }

      // Validar año de expiración
      const year = parseInt(this.cardForm.expiryYear);
      const currentYear = new Date().getFullYear();
      if (!this.cardForm.expiryYear || year < currentYear || year > currentYear + 20) {
        this.validationErrors.push('Año de expiración inválido');
      }

      // Validar que la tarjeta no esté expirada
      if (this.cardForm.expiryMonth && this.cardForm.expiryYear) {
        const expiryDate = new Date(year, month - 1);
        const currentDate = new Date();
        currentDate.setDate(1); // Primer día del mes actual
        if (expiryDate < currentDate) {
          this.validationErrors.push('La tarjeta ha expirado');
        }
      }

      // Limpiar y validar CVV
      const cleanCVV = this.cardForm.cvv.replace(/\D/g, '');
      if (!cleanCVV || cleanCVV.length < 3 || cleanCVV.length > 4) {
        this.validationErrors.push('CVV debe tener 3 o 4 dígitos');
      } else {
        // Actualizar el CVV limpio en el formulario
        this.cardForm.cvv = cleanCVV;
      }
    }

    console.log('Validation result:', { errors: this.validationErrors, isValid: this.validationErrors.length === 0 });
    return this.validationErrors.length === 0;
  }

  /**
   * Manejar éxito de pago
   */
  private handlePaymentSuccessOLD(result: PaymentResponse): void {
    this.logSecurityEvent('payment_success', {
      paymentId: result.id,
      amount: result.amount
    });

    this.openpayService.notifyPaymentSuccess(result);
  }

  /**
   * Manejar pago pendiente
   */
  private handlePaymentPendingOLD(result: PaymentResponse): void {
    this.logSecurityEvent('payment_pending', {
      paymentId: result.id,
      status: result.status
    });

    // Mostrar información de pago pendiente
    // TODO: Implementar UI para pago pendiente
  }

  /**
   * Manejar error de pago
   */
  private handlePaymentError(error: any): void {
    const errorMessage: string = error?.message || 'Error procesando el pago';

    this.logSecurityEvent('payment_error', {
      error: errorMessage,
      attempt: this.attempts
    });

    this.openpayService.notifyPaymentError(errorMessage);
  }

  /**
   * Manejar violación de seguridad
   */
  private handleSecurityViolation(reason: string): void {
    console.error('Security violation:', reason);

    this.logSecurityEvent('security_violation', {
      reason,
      deviceFingerprint: this.deviceFingerprint
    });

    this.fraudDetected = true;
    this.openpayService.notifyPaymentError('Security violation detected');
  }

  /**
   * Cancelar pago
   */
  public cancelPayment(): void {
    this.logSecurityEvent('payment_cancelled', {});
    this.openpayService.notifyPaymentCancelled();
  }

  // === UTILIDADES DE VALIDACIÓN ===

  private sanitizeInput(input: string): string {
    if (!input) return '';
    return input.replace(/[<>\"'\x00-\x1f\x7f-\x9f]/g, '').trim();
  }

  private sanitizeAmount(amount: string): number {
    if (!amount) return 0;
    const cleaned = amount.replace(/[^0-9.]/g, '');
    return Math.round(parseFloat(cleaned) * 100) / 100;
  }

  private sanitizeCardNumber(cardNumber: string): string {
    return cardNumber.replace(/\D/g, '');
  }

  // Formatear número de tarjeta en tiempo real
  formatCardNumber(event: any): void {
    const input = event.target;
    let value = input.value.replace(/\D/g, ''); // Solo números

    // Limitar a 16 dígitos máximo
    value = value.substring(0, 16);

    // Agregar espacios cada 4 dígitos
    const formattedValue = value.replace(/(\d{4})(?=\d)/g, '$1 ');

    // Actualizar el modelo y el input
    this.cardForm.number = formattedValue;
    input.value = formattedValue;
  }

  // Sanitizar CVV para solo números
  sanitizeCVV(event: any): void {
    const input = event.target;
    let value = input.value.replace(/\D/g, ''); // Solo números

    // Limitar a 4 dígitos máximo
    value = value.substring(0, 4);

    // Actualizar el modelo y el input
    this.cardForm.cvv = value;
    input.value = value;

    // Limpiar errores de validación cuando el usuario corrige el CVV
    if (value.length >= 3) {
      this.validationErrors = this.validationErrors.filter(error =>
        !error.includes('CVV') && !error.includes('caracteres no válidos')
      );
    }

    console.log('CVV sanitized:', { original: event.target.value, sanitized: value });
  }

  // Validar entrada solo números (prevenir caracteres no numéricos)
  onNumberInput(event: KeyboardEvent): void {
    const pattern = /[0-9]/;
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];

    if (!pattern.test(event.key) && !allowedKeys.includes(event.key)) {
      event.preventDefault();
      console.log('Invalid key blocked:', event.key);
    }
  }

  // === DEBUG PANEL FUNCTIONS ===

  initializeDebugPanel(): void {
    this.addDebugLog('Debug panel initialized');
    this.showDebugPanel = true; // Empezar visible para testing
  }

  toggleDebugPanel(): void {
    this.showDebugPanel = !this.showDebugPanel;
    this.addDebugLog(this.showDebugPanel ? 'Debug panel opened' : 'Debug panel closed');
  }

  addDebugLog(message: string): void {
    const time = new Date().toLocaleTimeString();
    this.debugInfo.eventLog.unshift({ time, message });
    // Mantener solo los últimos 50 logs
    if (this.debugInfo.eventLog.length > 50) {
      this.debugInfo.eventLog = this.debugInfo.eventLog.slice(0, 50);
    }
  }

  updateDebugInfo(data: any): void {
    this.debugInfo.requestData = data;
    this.debugInfo.errors = [...this.validationErrors];
    this.addDebugLog('Debug info updated');
  }

  private isValidCardNumber(cardNumber: string): boolean {
    // Algoritmo de Luhn
    const digits = cardNumber.split('').map(Number);
    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i];

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0 && cardNumber.length >= 13 && cardNumber.length <= 19;
  }

  private isValidExpiryDate(month: string, year: string): boolean {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const expYear = parseInt(year);
    const expMonth = parseInt(month);

    if (expYear < currentYear) return false;
    if (expYear === currentYear && expMonth < currentMonth) return false;
    if (expMonth < 1 || expMonth > 12) return false;

    return true;
  }

  private isValidCVV(cvv: string): boolean {
    return /^[0-9]{3,4}$/.test(cvv);
  }

  private isDevToolsOpen(): boolean {
    const threshold = 160;
    return window.outerHeight - window.innerHeight > threshold ||
           window.outerWidth - window.innerWidth > threshold;
  }

  private logSecurityEvent(event: string, data: any): void {
    console.log(`Security Event: ${event}`, data);

    // En producción, enviar a sistema de monitoreo
    if (environment.production) {
      // TODO: Enviar a servicio de logs de seguridad
    }
  }

  /**
   * Autenticar automáticamente usando token de la app
   */
  private async authenticateWithToken(authToken: string): Promise<void> {
    try {
      console.log('Validating auth token:', authToken.substring(0, 8) + '...');

      const url = 'http://172.18.1.65:8000/api/payment/validate-token';
      const headers = {
        'Content-Type': 'application/json',
      };
      const body = JSON.stringify({
        auth_token: authToken
      });

      // Log API request
      this.logApiRequest('Validate Token', url, 'POST', headers, body);

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body
      });

      console.log('Token validation response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token validation failed:', errorText);
        this.logApiResponse(url, response.status, { error: errorText });
        throw new Error(`Token validation failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Token validation response:', data);

      // Log API response
      this.logApiResponse(url, response.status, data);

      if (!data.success) {
        throw new Error(data.message || 'Authentication failed');
      }

      // Configurar datos del usuario autenticado
      this.paymentData = {
        userId: data.user.id,
        amount: data.payment_data.amount,
        description: this.generatePaymentDescription(data.payment_data),
        currency: 'MXN',
        // Datos adicionales del token
        type: data.payment_data.type,
        relatedId: data.payment_data.related_id,
        returnUrl: data.payment_data.return_url,
        userName: data.user.name + ' ' + data.user.lastname,
        userEmail: data.user.email
      };

      // Guardar token de sesión web para mantener la autenticación
      sessionStorage.setItem('web_session_token', data.web_session_token);
      sessionStorage.setItem('authenticated_user', JSON.stringify(data.user));

      console.log('Auto-authentication successful for user:', data.user.email);
      console.log('Payment data configured:', this.paymentData);

    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  /**
   * Generar descripción del pago basada en el tipo
   */
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

  /**
   * Get array of available years for card expiry
   */
  getYearOptions(): string[] {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];
    for (let i = 0; i < 15; i++) {
      years.push((currentYear + i).toString());
    }
    return years;
  }

  // === GESTIÓN DE TARJETAS ===

  /**
   * Cargar tarjetas guardadas del usuario
   */
  private async loadSavedCards(): Promise<void> {
    try {
      this.loadingCards = true;
      this.logCardDebug('info', '🃏 Starting to load saved cards...');
      console.log('🃏 Loading saved cards...');

      if (!this.authToken) {
        this.logCardDebug('error', '❌ No auth token available for loading cards');
        console.log('❌ No auth token available for loading cards');
        this.savedCards = [];
        return;
      }

      this.logCardDebug('info', `📤 Sending request to: http://172.18.1.65:8000/api/iframe-user-cards`);
      this.logCardDebug('info', `Auth token: ${this.authToken.substring(0, 20)}...`);

      const url = 'http://172.18.1.65:8000/api/iframe-user-cards';
      const headers = {
        'Content-Type': 'application/json'
      };
      const body = JSON.stringify({
        payment_token: this.authToken
      });

      // Log de la petición
      this.logApiRequest('Load Saved Cards', url, 'POST', headers, body);

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body
      });

      this.logCardDebug('info', `📥 Response status: ${response.status}`);
      console.log('🃏 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();

        // Log de la respuesta
        this.logApiResponse(url, response.status, data);

        this.logCardDebug('info', `📥 Response data received: ${JSON.stringify(data).substring(0, 100)}...`);
        console.log('🃏 Response data:', data);

        if (data.success) {
          this.savedCards = data.cards || [];
          this.logCardDebug('info', `✅ Loaded ${this.savedCards.length} saved cards`);
          console.log('✅ Loaded saved cards:', this.savedCards.length);

          // Si hay tarjetas guardadas, mostrar la vista de tarjetas
          if (this.savedCards.length > 0) {
            this.currentView = 'cards';
            this.savedCards.forEach((card, index) => {
              this.logCardDebug('info', `Card ${index + 1}: ${card.brand} ****${card.cardNumber} - ${card.holderName}`);
            });
          } else {
            this.logCardDebug('warn', '⚠️ No saved cards found for this user');
          }
        } else {
          this.logCardDebug('error', `❌ API returned error: ${data.error || 'Unknown error'}`);
          console.log('❌ Error in response:', data.error);
          this.savedCards = [];
        }
      } else {
        const errorText = await response.text();
        this.logCardDebug('error', `❌ HTTP Error ${response.status}: ${errorText.substring(0, 100)}...`);
        console.log('❌ HTTP error loading cards:', response.status);
        this.savedCards = [];
      }
    } catch (error) {
      this.logCardDebug('error', `❌ Exception loading cards: ${error}`);
      console.error('❌ Error loading saved cards:', error);
      this.savedCards = [];
    } finally {
      this.loadingCards = false;
      this.logCardDebug('info', '✔️ Finished loading cards process');
    }
  }

  /**
   * Seleccionar una tarjeta guardada
   */
  selectSavedCard(card: SavedCard): void {
    this.selectedCard = card;
    this.currentView = 'cards';

    // Limpiar formulario de nueva tarjeta
    this.cardForm = {
      number: '',
      holderName: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      saveCard: false,
      cardAlias: ''
    };
  }

  /**
   * Mostrar formulario para agregar nueva tarjeta
   */
  showNewCardForm(): void {
    this.currentView = 'newCard';
    this.selectedCard = null;
  }

  /**
   * Volver a la vista de tarjetas guardadas
   */
  showSavedCards(): void {
    this.currentView = 'cards';
    this.selectedCard = null;
  }

  /**
   * Procesar pago con tarjeta seleccionada o nueva
   */
  processSecurePayment(): void {
    console.log('🚀 processSecurePayment called!');

    if (this.isProcessing) {
      console.log('❌ Already processing, returning');
      return;
    }

    console.log('✅ Starting payment process');
    this.isProcessing = true;
    this.validationErrors = [];

    // Validar antes de procesar
    if (!this.validatePaymentForm()) {
      console.log('❌ Validation failed, stopping process');
      this.isProcessing = false;
      return;
    }

    console.log('✅ Validation passed, proceeding with payment');
    console.log('Payment data:', {
      selectedCard: this.selectedCard,
      cardForm: this.cardForm,
      paymentData: this.paymentData
    });

    try {
      let paymentRequest: PaymentRequest;
      let tokenId: string;

      if (this.selectedCard) {
        // Pago con tarjeta guardada - usar el ID de la tarjeta directamente
        tokenId = this.selectedCard.id.toString();
        paymentRequest = {
          userId: this.paymentData.userId,
          amount: this.paymentData.amount,
          description: this.paymentData.description,
          deviceSessionId: this.deviceSessionId
        };
      } else {
        // Pago con nueva tarjeta - crear token primero
        const cardData: OpenPayCard = {
          card_number: this.cardForm.number.replace(/\s/g, ''),
          holder_name: this.cardForm.holderName,
          expiration_year: this.cardForm.expiryYear.toString().slice(-2),
          expiration_month: this.cardForm.expiryMonth,
          cvv2: this.cardForm.cvv
        };

        console.log('Creating token for new card...');
        // const token = await this.openpayService.createToken(cardData);
        // console.log('Token created successfully:', token.id);

        tokenId = 'temp_token_' + Date.now();
        paymentRequest = {
          userId: this.paymentData.userId,
          amount: this.paymentData.amount,
          description: this.paymentData.description,
          deviceSessionId: this.deviceSessionId
        };
      }

      // Procesar el pago
      console.log('Processing payment request...');
      this.openpayService.processPayment(paymentRequest, tokenId).subscribe({
        next: (result) => {
          console.log('Payment processed successfully:', result);
          this.handlePaymentSuccessOLD(result);
        },
        error: (error) => {
          console.error('Payment processing error:', error);
          this.attempts++;
          this.handlePaymentError(error);
        },
        complete: () => {
          this.isProcessing = false;
        }
      });

    } catch (error) {
      console.error('Payment setup error:', error);
      this.attempts++;
      this.handlePaymentError(error);
      this.isProcessing = false;
    }
  }

  /**
   * Procesar pago real con backend
   */
  async processPaymentSimple(): Promise<void> {
    console.log('🚀🚀🚀 PAYMENT BUTTON CLICKED - REAL PROCESSING STARTING 🚀🚀🚀');
    console.log('Current state:', {
      isProcessing: this.isProcessing,
      paymentData: this.paymentData,
      selectedCard: this.selectedCard,
      cardForm: this.cardForm
    });

    if (this.isProcessing) {
      console.log('❌ Already processing, returning');
      return;
    }

    this.isProcessing = true;
    this.validationErrors = [];

    // Reset debug info
    this.debugInfo.requestData = null;
    this.debugInfo.response = null;
    this.debugInfo.errors = [];
    this.addDebugLog('Payment process started');

    try {
      // Validar antes de procesar
      if (!this.validatePaymentForm()) {
        console.log('❌ Validation failed, stopping process');
        this.isProcessing = false;
        return;
      }

      console.log('✅ Form validation passed');

      const webSessionToken = sessionStorage.getItem('web_session_token');
      console.log('🔑 Authentication token check:', {
        hasToken: !!webSessionToken,
        tokenLength: webSessionToken?.length || 0,
        tokenPreview: webSessionToken?.substring(0, 10) + '...'
      });

      if (!webSessionToken) {
        console.error('❌ NO AUTHENTICATION TOKEN FOUND');
        throw new Error('No authentication token available');
      }

      // Preparar datos de pago
      let paymentData: any = {
        payment_method: 'openpay',
        amount: this.paymentData.amount,
        currency: 'MXN',
        description: this.paymentData.description,
        customer: {
          phone: '5512345678'
        },
        device_session_id: this.deviceSessionId
      };

      // Update debug panel with initial request data
      this.updateDebugInfo({
        initialData: paymentData,
        selectedCard: this.selectedCard,
        formData: this.selectedCard ? { cvv: this.cardForm.cvv } : this.cardForm
      });
      this.addDebugLog('Initial payment data prepared');

      if (this.selectedCard) {
        // Pago con tarjeta guardada
        paymentData.saved_card_id = this.selectedCard.id;
        console.log('🔗 Using saved card:', this.selectedCard.id);
      } else {
        // Pago con nueva tarjeta - necesitamos tokenizar primero
        console.log('💳 Processing new card payment');

        // Crear token de tarjeta con OpenPay.js REAL
        const cardNumber = this.cardForm.number.replace(/\s/g, '');
        const cardData = {
          card_number: cardNumber,
          holder_name: this.cardForm.holderName.trim(),
          expiration_year: this.cardForm.expiryYear.toString().slice(-2),
          expiration_month: this.cardForm.expiryMonth.padStart(2, '0'),
          cvv2: this.cardForm.cvv
        };

        // Validaciones adicionales específicas para OpenPay
        if (!/^\d{13,19}$/.test(cardNumber)) {
          throw new Error('Número de tarjeta debe tener entre 13 y 19 dígitos');
        }

        if (!this.cardForm.holderName.trim()) {
          throw new Error('Nombre del titular es requerido');
        }

        if (!/^\d{2}$/.test(this.cardForm.expiryMonth.padStart(2, '0'))) {
          throw new Error('Mes de expiración inválido');
        }

        if (!/^\d{2}$/.test(this.cardForm.expiryYear.toString().slice(-2))) {
          throw new Error('Año de expiración inválido');
        }

        // Limpiar y validar CVV
        const cleanCVV = this.cardForm.cvv.replace(/\D/g, ''); // Eliminar cualquier carácter no numérico
        if (!cleanCVV || cleanCVV.length < 3 || cleanCVV.length > 4) {
          throw new Error('CVV debe tener 3 o 4 dígitos numéricos');
        }

        // Actualizar CVV limpio en el formulario
        this.cardForm.cvv = cleanCVV;

        // Actualizar cardData con CVV limpio
        cardData.cvv2 = cleanCVV;

        console.log('🔍 Card data validation before OpenPay:', {
          cardNumberLength: cardNumber.length,
          cardNumberValid: this.isValidCardNumber(cardNumber),
          cardNumberPattern: /^\d{13,19}$/.test(cardNumber),
          holderNameLength: this.cardForm.holderName.trim().length,
          expiryMonth: this.cardForm.expiryMonth,
          expiryYear: this.cardForm.expiryYear,
          cvvLength: cleanCVV.length,
          cvvPattern: /^\d{3,4}$/.test(cleanCVV),
          cvvOriginal: this.cardForm.cvv,
          cvvCleaned: cleanCVV,
          sanitizedData: cardData
        });

        console.log('🔐 Creating real OpenPay token...');

        // Validación específica para números de tarjeta de prueba
        const testCardNumbers = [
          '4111111111111111', // Visa
          '5105105105105100', // MasterCard
          '4242424242424242', // Visa (Stripe)
          '5555555555554444'  // MasterCard
        ];

        const cleanCardNumber = cardNumber.replace(/\s/g, '');
        if (testCardNumbers.includes(cleanCardNumber)) {
          console.log('✅ Using valid test card number:', cleanCardNumber);
        } else {
          console.warn('⚠️ Non-standard test card number:', cleanCardNumber);
        }

        // CVV ya fue validado y limpiado anteriormente

        console.log('🔍 Final card data check:', {
          cardNumber: cleanCardNumber,
          cardNumberLength: cleanCardNumber.length,
          holderName: cardData.holder_name,
          expirationMonth: cardData.expiration_month,
          expirationYear: cardData.expiration_year,
          cvv: cardData.cvv2,
          cvvLength: cardData.cvv2?.length
        });

        try {
          this.addDebugLog('Creating OpenPay token...');

          // Update debug with card data (masked)
          this.updateDebugInfo({
            ...this.debugInfo.requestData,
            cardData: {
              card_number: cardData.card_number.replace(/\d(?=\d{4})/g, '*'),
              holder_name: cardData.holder_name,
              expiration_month: cardData.expiration_month,
              expiration_year: cardData.expiration_year,
              cvv_length: cardData.cvv2?.length
            }
          });

          // Tokenizar con OpenPay.js
          const tokenData = await this.createOpenPayToken(cardData);

          // Update debug with token response
          this.debugInfo.response = {
            tokenResponse: tokenData,
            timestamp: new Date().toISOString()
          };
          this.addDebugLog(`OpenPay token created: ${tokenData?.id || 'NO_ID'}`);

          // Extraer token ID de manera robusta
          const tokenId = tokenData?.id || tokenData?.token_id;
          console.log('✅ OpenPay token created:', tokenId);
          console.log('🔍 Token data structure:', tokenData);

          if (!tokenId) {
            throw new Error('Token ID no encontrado en la respuesta de OpenPay');
          }

          paymentData.card = {
            token_id: tokenId,
            device_session_id: this.deviceSessionId
          };

          if (this.cardForm.saveCard) {
            // Incluir datos para guardar la tarjeta
            paymentData.save_card = true;

            // Extraer información de la tarjeta de manera robusta
            const brand = tokenData?.brand || 'Tarjeta';
            const lastFour = tokenData?.card_number?.slice(-4) || '****';
            paymentData.card_alias = `${brand} ****${lastFour}`;
          }

        } catch (tokenError) {
          console.error('❌ Error creating OpenPay token:', tokenError);
          this.debugInfo.errors.push('Token creation failed: ' + (tokenError instanceof Error ? tokenError.message : 'Unknown error'));
          this.addDebugLog('Token creation failed');
          const errorMessage = tokenError instanceof Error ? tokenError.message : 'Error desconocido';
          throw new Error('Error al procesar la tarjeta: ' + errorMessage);
        }
      }

      console.log('📤 Sending payment request to backend...', {
        type: this.paymentData.type,
        amount: this.paymentData.amount,
        hasCard: !!this.selectedCard,
        hasNewCard: !this.selectedCard
      });

      // Debug: Ver estructura completa de paymentData
      console.log('🔧 PaymentData structure:', JSON.stringify(paymentData, null, 2));

      // FLUJO UNIFICADO: Siempre usar endpoint de cargo directo
      let requestBody: any;
      let endpointUrl: string;

      // Determinar qué token usar: ID de tarjeta guardada o token de nueva tarjeta
      let sourceId: string;
      if (this.selectedCard) {
        // Usar tarjeta guardada: usar su ID como source_id
        sourceId = this.selectedCard.id;
        console.log('🃏 Using saved card ID as source:', sourceId);
      } else {
        // Usar nueva tarjeta: usar el token de OpenPay
        sourceId = paymentData.card?.token_id || paymentData.token || paymentData.id;
        console.log('💳 Using new card token as source:', sourceId);
      }

      if (this.operationMode === 'add_card') {
        // Modo agregar tarjeta: NO hacer cargo, solo guardar
        endpointUrl = 'http://172.18.1.65:8000/api/iframe-payment-charge';
        requestBody = {
          payment_token: this.authToken, // Token de autenticación del iframe
          openpay_token: sourceId, // ID de tarjeta guardada o token de nueva tarjeta
          device_session_id: paymentData.device_session_id || this.deviceSessionId,
          save_card: true, // En modo add_card siempre guardar
          card_alias: this.cardForm.cardAlias || null,
          amount: 0 // Monto 0 para solo guardar tarjeta sin cargo
        };

        console.log('🃏 ADD CARD MODE: Preparing request for card save only (amount 0)');
      } else {
        // Modo pago: cargo con opción de guardar tarjeta
        endpointUrl = 'http://172.18.1.65:8000/api/iframe-payment-charge';
        requestBody = {
          payment_token: this.authToken, // Token de autenticación del iframe
          openpay_token: sourceId, // ID de tarjeta guardada o token de nueva tarjeta
          device_session_id: paymentData.device_session_id || this.deviceSessionId,
          save_card: this.selectedCard ? false : this.cardForm.saveCard, // No guardar si ya es guardada
          card_alias: this.selectedCard ? null : (this.cardForm.saveCard ? (this.cardForm.cardAlias || null) : null)
        };

        console.log('💳 UNIFIED PAYMENT MODE: Preparing request for direct charge');
        console.log('💾 Save card:', requestBody.save_card);
        console.log('🏷️ Card alias:', requestBody.card_alias);
        console.log('🃏 Using saved card:', !!this.selectedCard);
      }

      // Update debug with final request data
      this.updateDebugInfo({
        ...this.debugInfo.requestData,
        finalRequest: {
          url: endpointUrl,
          method: 'POST',
          mode: this.operationMode,
          headers: {
            'Authorization': webSessionToken ? 'Bearer [TOKEN]' : 'None',
            'Content-Type': 'application/json'
          },
          body: {
            ...requestBody,
            // Mask sensitive data for debug
            openpay_token: requestBody.openpay_token ? requestBody.openpay_token.substring(0, 8) + '...' : 'Missing',
            device_session_id: requestBody.device_session_id ? 'Present' : 'Missing'
          }
        }
      });
      this.addDebugLog(`Sending ${this.operationMode} request to backend...`);

      console.log('📋 Full request details:', {
        url: endpointUrl,
        method: 'POST',
        mode: this.operationMode,
        hasAuthHeader: false, // No authentication needed, uses token in body
        bodyData: requestBody
      });

      // Log detailed request body structure
      console.log('🔍 Detailed request body:', JSON.stringify(requestBody, null, 2));

      // Log de la petición completa
      const headers = {
        'Content-Type': 'application/json'
      };
      const body = JSON.stringify(requestBody);

      this.logApiRequest('Payment Charge', endpointUrl, 'POST', headers, body);

      // Hacer la llamada al endpoint correcto
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: headers,
        body: body
      });

      console.log('📨 Raw response status:', response.status);
      console.log('📨 Response ok:', response.ok);

      // Log raw response text first to see what we're getting
      const responseText = await response.text();
      console.log('📃 Raw response text:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
        console.log('📥 Backend response (parsed):', result);
      } catch (parseError) {
        console.log('❌ JSON parse error:', parseError);
        console.log('📃 Response was not JSON:', responseText.substring(0, 200));
        throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 100)}`);
      }

      // Update debug with backend response
      this.debugInfo.response = {
        ...this.debugInfo.response,
        backendResponse: {
          status: response.status,
          ok: response.ok,
          data: result,
          timestamp: new Date().toISOString(),
          debugSteps: result.debug_steps || [],
          errorLocation: result.error_location || null
        }
      };

      if (response.ok && result.success) {
        if (this.operationMode === 'add_card') {
          // Modo agregar tarjeta
          console.log('🃏 Card added successfully!');
          this.addDebugLog('Card added successfully!');

          // Add backend debug steps to our log
          if (result.debug_steps) {
            result.debug_steps.forEach((step: string) => {
              this.addDebugLog(`Backend: ${step}`);
            });
          }

          // Enviar mensaje a Flutter sobre tarjeta agregada
          this.sendMessageToFlutter('CARD_ADDED_SUCCESS', {
            cardId: result.card?.id,
            last4: result.card?.last4,
            brand: result.card?.brand,
            holderName: result.card?.holder_name,
            alias: result.card?.alias,
            message: result.message || 'Card added successfully',
            date: new Date().toISOString()
          });

          // Mostrar éxito por 3 segundos antes de notificar
          setTimeout(() => {
            this.openpayService.notifyPaymentSuccess({
              paymentId: 'card_added',
              status: 'card_added',
              cardInfo: result.card,
              message: result.message
            });
          }, 3000);

        } else {
          // Modo pago con cargo directo
          console.log('🎉 Payment charged successfully!');
          this.addDebugLog('Payment charged successfully!');

          // Add backend debug steps to our log
          if (result.debug_steps) {
            result.debug_steps.forEach((step: string) => {
              this.addDebugLog(`Backend: ${step}`);
            });
          }

          this.paymentData.status = 'success';
          this.paymentData.transactionId = result.charge?.id || result.charge?.order_id;

          // Enviar mensaje a Flutter sobre pago exitoso
          this.sendMessageToFlutter('PAYMENT_SUCCESS', {
            id: result.charge?.id,
            transactionId: this.paymentData.transactionId,
            amount: result.charge?.amount || this.paymentData.amount,
            status: 'success',
            paymentMethod: 'card',
            authorization: result.charge?.authorization,
            date: new Date().toISOString(),
            // Si se guardó una tarjeta, incluir información
            ...(result.card && {
              cardSaved: true,
              cardInfo: {
                id: result.card.id,
                last4: result.card.last4,
                brand: result.card.brand,
                alias: result.card.alias
              }
            })
          });

          // Si se guardó una nueva tarjeta, recargar la lista
          if (this.cardForm.saveCard && this.currentView === 'newCard') {
            await this.loadSavedCards();
          }

          // Mostrar éxito por 3 segundos antes de notificar
          setTimeout(() => {
            this.openpayService.notifyPaymentSuccess({
              paymentId: result.charge?.id || 'completed',
              status: 'completed',
              amount: result.charge?.amount || this.paymentData.amount,
              transactionId: this.paymentData.transactionId,
              authorization: result.charge?.authorization
            });
          }, 3000);
        }

      } else {
        console.error('❌ Payment failed:', result);
        this.addDebugLog('Payment failed: ' + (result.message || 'Unknown error'));
        this.debugInfo.errors.push('Backend error: ' + (result.message || 'Payment processing failed'));

        // Add backend debug steps even on error
        if (result.debug_steps) {
          result.debug_steps.forEach((step: string) => {
            this.addDebugLog(`Backend: ${step}`);
          });
        }

        if (result.error_location) {
          this.addDebugLog(`Error location: ${result.error_location}`);
        }

        throw new Error(result.message || 'Payment processing failed');
      }

    } catch (error) {
      console.error('❌ Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error procesando el pago';
      this.validationErrors = [errorMessage];
      this.debugInfo.errors.push('Payment process error: ' + errorMessage);
      this.addDebugLog('Payment failed with error: ' + errorMessage);

      // Mostrar error en UI
      alert('Error: ' + errorMessage);
    } finally {
      this.isProcessing = false;
      this.addDebugLog('Payment process completed');
    }
  }

  // === FUNCIONES DE DEBUG ===

  testOpenPayJS(): void {
    console.log('🧪 TESTING OPENPAY.JS DIRECTLY');

    // Verificar si OpenPay está disponible
    console.log('OpenPay availability:', {
      openPayDefined: typeof OpenPay !== 'undefined',
      windowOpenPay: !!(window as any).OpenPay,
      hasSetId: typeof (window as any).OpenPay?.setId === 'function',
      hasToken: typeof (window as any).OpenPay?.token === 'object'
    });

    if (typeof OpenPay === 'undefined') {
      alert('❌ OpenPay.js NOT LOADED');
      return;
    }

    alert('✅ OpenPay.js is loaded! Check console for configuration test.');

    // Probar configuración básica
    try {
      console.log('Testing OpenPay configuration...');
      console.log('🔧 OpenPay current configuration:', {
        merchantId: OpenPay.getId ? OpenPay.getId() : 'No getId method',
        apiKey: OpenPay.getApiKey ? OpenPay.getApiKey() : 'No getApiKey method',
        sandboxMode: OpenPay.getSandboxMode ? OpenPay.getSandboxMode() : 'No getSandboxMode method'
      });
      console.log('Environment config:', {
        merchantId: this.paymentData.merchantId,
        publicKey: this.paymentData.publicKey,
        envVars: this.paymentData
      });

      // Intentar crear un token con datos de prueba
      const testCardData = {
        card_number: '4111111111111111',
        holder_name: 'Test User',
        expiration_year: '26',
        expiration_month: '12',
        cvv2: '123'
      };

      console.log('🔐 Creating test token with OpenPay...');

      OpenPay.token.create(testCardData,
        (response: any) => {
          console.log('✅ OpenPay test token created successfully:', response);
          console.log('🔍 Full response object:', JSON.stringify(response, null, 2));
          console.log('🔍 Response type:', typeof response);
          console.log('🔍 Response constructor:', response?.constructor?.name);
          console.log('🔍 Is array:', Array.isArray(response));

          // Intentar diferentes propiedades que OpenPay podría usar
          const possibleIds = [
            response?.id,
            response?.token_id,
            response?.token,
            response?.data?.id,
            response?.data?.token_id,
            response?.data?.token,
            response[0]?.id, // Si es un array
            response.id, // Sin optional chaining
          ];

          console.log('🔍 Possible token IDs:', possibleIds);
          console.log('🔍 All response properties:', Object.keys(response || {}));
          console.log('🔍 All nested properties:');

          // Log todas las propiedades y sus valores
          for (const [key, value] of Object.entries(response || {})) {
            console.log(`  - ${key}:`, value, `(${typeof value})`);
          }

          // El token está en response.data.id según los logs
          const tokenId = response?.data?.id || 'NO_ID_FOUND';
          const tokenFound = tokenId !== 'NO_ID_FOUND';

          alert('✅ OpenPay tokenization works! Token: ' + tokenId +
                '\nToken found: ' + tokenFound +
                '\nStructure: response.data.id' +
                '\nCheck console for full details.');
        },
        (error: any) => {
          console.error('❌ OpenPay test tokenization failed:', error);
          console.log('🔍 Full error object:', JSON.stringify(error, null, 2));
          alert('❌ OpenPay error: ' + (error.description || error.message || JSON.stringify(error)));
        }
      );

    } catch (error) {
      console.error('❌ OpenPay configuration error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert('❌ OpenPay configuration error: ' + errorMessage);
    }
  }

  async testPaymentButton(): Promise<void> {
    console.log('🧪🧪🧪 TEST PAYMENT BUTTON CLICKED FROM IFRAME 🧪🧪🧪');

    // Test básico para verificar que el método se ejecuta
    alert('✅ IFRAME BUTTON WORKS! You should see this alert from the iframe. Check console for logs.');

    console.log('🔍 Debug Info from iframe:', {
      timestamp: new Date().toISOString(),
      isProcessing: this.isProcessing,
      currentView: this.currentView,
      hasSelectedCard: !!this.selectedCard,
      hasPaymentData: !!this.paymentData,
      paymentAmount: this.paymentData?.amount,
      userAgent: navigator.userAgent
    });

    // Verificar si podemos hacer requests básicas
    console.log('🌐 Testing basic connectivity...');

    const testUrl = 'http://172.18.1.65:8000/api/test-payment-iframe';
    const testHeaders = {
      'Content-Type': 'application/json'
    };
    const testBody = JSON.stringify({
      test: 'iframe_connectivity_test',
      timestamp: Date.now()
    });

    // Log API request
    this.logApiRequest('Test Backend Connection', testUrl, 'POST', testHeaders, testBody);

    fetch(testUrl, {
      method: 'POST',
      headers: testHeaders,
      body: testBody
    })
    .then(response => {
      console.log('✅ Basic connectivity test response:', response.status);
      return response.json().then(data => ({ response, data }));
    })
    .then(({ response, data }) => {
      console.log('✅ Basic connectivity test data:', data);
      this.logApiResponse(testUrl, response.status, data);
    })
    .catch(error => {
      console.error('❌ Basic connectivity test failed:', error);
      this.logApiResponse(testUrl, 0, { error: error.message });
    });

    // Simular pago exitoso directamente
    this.isProcessing = true;
    console.log('Setting isProcessing = true');

    setTimeout(() => {
      console.log('Showing success view...');
      this.paymentData.status = 'success';
      this.isProcessing = false;
      console.log('Payment simulation completed');
    }, 2000);
  }

  showSuccessView(): void {
    console.log('SHOWING SUCCESS VIEW');
    this.paymentData.status = 'success';
    this.isProcessing = false;
  }

  /**
   * Test simple communication with backend
   */
  async testBackendConnection(): Promise<void> {
    console.log('🌐 Testing backend connection...');
    this.addDebugLog('Testing backend connection...');

    try {
      const webSessionToken = sessionStorage.getItem('web_session_token');

      if (!webSessionToken) {
        throw new Error('No authentication token available');
      }

      const url = 'http://172.18.1.65:8000/api/simple-test';
      const headers = {
        'Authorization': `Bearer ${webSessionToken}`,
        'Content-Type': 'application/json'
      };
      const body = JSON.stringify({
        test: 'backend_connection',
        timestamp: Date.now()
      });

      // Log API request
      this.logApiRequest('Test Backend Connection Debug', url, 'POST', headers, body);

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body
      });

      const result = await response.json();

      // Log API response
      this.logApiResponse(url, response.status, result);

      if (response.ok && result.success) {
        console.log('✅ Backend connection successful:', result);
        this.addDebugLog('✅ Backend connection successful');
        this.addDebugLog(`User: ${result.user.email} (ID: ${result.user.id})`);
        alert('✅ Backend connection working! Check debug panel for details.');
      } else {
        console.error('❌ Backend connection failed:', result);
        this.addDebugLog('❌ Backend connection failed: ' + (result.message || 'Unknown error'));
        alert('❌ Backend connection failed: ' + (result.message || 'Unknown error'));
      }

    } catch (error) {
      console.error('❌ Backend connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.addDebugLog('❌ Backend connection error: ' + errorMessage);
      alert('❌ Backend connection error: ' + errorMessage);
    }
  }

  /**
   * Manejar pago exitoso
   */
  private handlePaymentSuccess(result: PaymentResponse): void {
    console.log('Payment successful, notifying parent...');

    // Notificar éxito al parent (aplicación móvil)
    this.openpayService.notifyPaymentSuccess({
      paymentId: result.id,
      status: result.status,
      amount: result.amount,
      transactionId: result.transactionId
    });

    // Si se guardó una nueva tarjeta, recargar la lista
    if (this.cardForm.saveCard && this.currentView === 'newCard') {
      this.loadSavedCards();
    }

    // Mostrar mensaje de éxito por 3 segundos antes de cerrar
    this.showSuccessMessage();
  }

  /**
   * Manejar pago pendiente
   */
  private handlePaymentPending(result: PaymentResponse): void {
    console.log('Payment pending, awaiting confirmation...');

    // Notificar estado pendiente
    this.openpayService.notifyPaymentSuccess({
      paymentId: result.id,
      status: 'pending',
      amount: result.amount,
      transactionId: result.transactionId
    });

    this.showPendingMessage();
  }

  /**
   * Mostrar mensaje de éxito
   */
  private showSuccessMessage(): void {
    // Cambiar la vista para mostrar éxito
    this.paymentData.status = 'success';

    // Auto-cerrar después de 3 segundos
    setTimeout(() => {
      this.openpayService.notifyPaymentSuccess({
        paymentId: this.paymentData.transactionId || 'completed',
        status: 'completed',
        amount: this.paymentData.amount
      });
    }, 3000);
  }

  /**
   * Mostrar mensaje de pendiente
   */
  private showPendingMessage(): void {
    this.paymentData.status = 'pending';

    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
      this.openpayService.notifyPaymentSuccess({
        paymentId: this.paymentData.transactionId || 'pending',
        status: 'pending',
        amount: this.paymentData.amount
      });
    }, 5000);
  }

  // === TOKENIZACIÓN REAL CON OPENPAY.JS ===

  /**
   * Crear token real de tarjeta con OpenPay.js
   */
  private async createOpenPayToken(cardData: any): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log('🔍 OpenPay availability check:', {
        openPayDefined: typeof OpenPay !== 'undefined',
        windowOpenPay: !!(window as any).OpenPay,
        globalOpenPay: typeof (globalThis as any).OpenPay !== 'undefined'
      });

      if (typeof OpenPay === 'undefined') {
        console.error('❌ OpenPay.js not loaded');
        this.addDebugLog('OpenPay.js not available');
        reject(new Error('OpenPay.js no está disponible'));
        return;
      }

      console.log('✅ OpenPay is available');
      console.log('🔐 Initiating OpenPay tokenization...');
      console.log('Card data:', {
        cardNumber: cardData.card_number.replace(/\d(?=\d{4})/g, '*'),
        holderName: cardData.holder_name,
        expiryMonth: cardData.expiration_month,
        expiryYear: cardData.expiration_year,
        hasCvv: !!cardData.cvv2
      });

      this.addDebugLog('OpenPay tokenization started');

      // Verificar que OpenPay esté configurado
      console.log('🔧 OpenPay configuration check:', {
        hasSetId: typeof OpenPay.setId === 'function',
        hasToken: typeof OpenPay.token === 'object',
        hasTokenCreate: typeof OpenPay.token?.create === 'function',
        merchantId: environment.openpay.merchantId,
        publicKey: environment.openpay.publicKey,
        sandbox: environment.openpay.sandbox
      });

      console.log('🔍 OpenPay global object check:', {
        hasOpenPay: typeof OpenPay !== 'undefined',
        openPayKeys: Object.keys(OpenPay || {})
      });

      // Usar OpenPay.js para crear el token
      OpenPay.token.create(cardData,
        (response: any) => {
          console.log('✅ OpenPay token response:', response);
          console.log('🔍 Full token response:', JSON.stringify(response, null, 2));
          console.log('Token details:', {
            id: response?.id,
            token_id: response?.token_id,
            brand: response?.brand,
            cardNumber: response?.card_number,
            type: response?.type,
            allKeys: Object.keys(response || {})
          });

          this.addDebugLog('OpenPay token created successfully');

          // Verificar que tenemos un token válido - OpenPay usa response.data.id
          const tokenId = response?.data?.id || response?.id || response?.token_id;
          if (!tokenId) {
            console.error('❌ No token ID found in response');
            reject(new Error('Token inválido recibido de OpenPay'));
            return;
          }

          // Normalizar la respuesta para que el resto del código funcione
          const normalizedResponse = {
            id: tokenId,
            brand: response?.data?.card?.brand,
            card_number: response?.data?.card?.card_number,
            type: response?.data?.card?.type,
            ...response?.data // Incluir todos los datos originales
          };

          resolve(normalizedResponse);
        },
        (error: any) => {
          console.error('❌ OpenPay tokenization error:', error);
          console.error('🔍 Error type:', typeof error);
          console.error('🔍 Error keys:', Object.keys(error || {}));
          console.error('🔍 Error stringified:', JSON.stringify(error, null, 2));

          this.addDebugLog('OpenPay tokenization failed: ' + (error.description || error.message || 'Unknown error'));

          let errorMessage = 'Error al procesar la tarjeta';

          if (error.error_code) {
            switch (error.error_code) {
              case 3001:
                errorMessage = 'La tarjeta fue declinada';
                break;
              case 3002:
                errorMessage = 'La tarjeta ha expirado';
                break;
              case 3003:
                errorMessage = 'La tarjeta no tiene fondos suficientes';
                break;
              case 3004:
                errorMessage = 'La tarjeta ha sido identificada como una tarjeta robada';
                break;
              case 3005:
                errorMessage = 'La tarjeta ha sido identificada como una tarjeta fraudulenta';
                break;
              case 3006:
                errorMessage = 'La operación no esta permitida para este cliente o esta transacción';
                break;
              case 3009:
                errorMessage = 'La tarjeta fue reportada como perdida';
                break;
              case 3010:
                errorMessage = 'El banco ha restringido la tarjeta';
                break;
              case 3011:
                errorMessage = 'El banco ha solicitado que la tarjeta sea retenida';
                break;
              case 3012:
                errorMessage = 'Se requiere solicitar al banco autorización para realizar este pago';
                break;
              default:
                errorMessage = error.description || errorMessage;
            }
          }

          reject(new Error(errorMessage));
        }
      );
    });
  }

  /**
   * Registrar log de tarjetas para debug
   */
  private logCardDebug(level: 'info' | 'warn' | 'error', message: string): void {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds()}`;

    this.cardDebugLogs.push({
      time: time,
      level: level,
      message: message
    });

    // Mantener solo los últimos 50 logs
    if (this.cardDebugLogs.length > 50) {
      this.cardDebugLogs.shift();
    }

    // También log a consola
    console.log(`[${level.toUpperCase()}] ${time} - ${message}`);
  }

  /**
   * Registrar petición HTTP completa para debug
   */
  private logApiRequest(type: string, url: string, method: string, headers?: any, body?: any): void {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds()}`;

    this.apiDebugLogs.push({
      time: time,
      type: type,
      url: url,
      method: method,
      headers: headers ? JSON.parse(JSON.stringify(headers)) : null,
      body: body ? (typeof body === 'string' ? JSON.parse(body) : body) : null
    });

    // Mantener solo los últimos 30 logs
    if (this.apiDebugLogs.length > 30) {
      this.apiDebugLogs.shift();
    }

    console.log(`[API REQUEST] ${time} - ${type}: ${method} ${url}`);
    if (headers) console.log(`[API HEADERS] ${time}:`, headers);
    if (body) console.log(`[API BODY] ${time}:`, body);
  }

  /**
   * Registrar respuesta HTTP completa para debug
   */
  private logApiResponse(url: string, status: number, response: any): void {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds()}`;

    // Encontrar la petición correspondiente y agregar la respuesta
    const lastRequest = this.apiDebugLogs[this.apiDebugLogs.length - 1];
    if (lastRequest && lastRequest.url === url) {
      lastRequest.status = status;
      lastRequest.response = response ? JSON.parse(JSON.stringify(response)) : null;
    }

    console.log(`[API RESPONSE] ${time} - ${status} ${url}:`, response);
  }

  /**
   * Alternar la expansión de un log de API
   */
  toggleApiLogExpand(index: number): void {
    if (this.apiDebugLogs[index]) {
      this.apiDebugLogs[index].expanded = !this.apiDebugLogs[index].expanded;
    }
  }

  /**
   * Limpiar todos los logs de API
   */
  clearApiLogs(): void {
    this.apiDebugLogs = [];
    console.log('🗑️ API logs cleared');
  }

  /**
   * Enviar mensaje a Flutter a través de PostMessage
   */
  private sendMessageToFlutter(type: string, data: any): void {
    try {
      const message = {
        type: type,
        source: 'mex-padel-payment-gateway',
        data: data,
        timestamp: new Date().toISOString()
      };

      console.log('📤 Enviando mensaje a Flutter:', message);

      // Enviar mensaje al parent window (Flutter WebView)
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(message, '*');
      }

      // También enviar a window.top por si hay múltiples niveles de iframe
      if (window.top && window.top !== window) {
        window.top.postMessage(message, '*');
      }

      // Registrar el mensaje enviado
      this.addDebugLog(`Mensaje enviado a Flutter: ${type}`);
      this.addDebugLog(`📤 PostMessage sent: ${type} - ${JSON.stringify(data)}`);

    } catch (error) {
      console.error('❌ Error enviando mensaje a Flutter:', error);
      this.addDebugLog(`❌ Error sending PostMessage: ${error}`);
    }
  }
}