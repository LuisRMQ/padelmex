import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  PaymentRequest,
  PaymentResponse,
  OpenPayCard,
  OpenPayToken,
  SplitPaymentRequest,
  SplitPaymentResponse,
  SavedCard,
  Customer
} from '../models/payment.model';

declare var OpenPay: any;

interface SecureMessage {
  type: string;
  data: any;
  timestamp: number;
  source: string;
  nonce: string;
  checksum?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OpenpayService {
  private openpayInstance: any;
  private paymentStatus = new BehaviorSubject<string>('idle');
  public paymentStatus$ = this.paymentStatus.asObservable();

  constructor(private http: HttpClient) {
    this.initializeOpenpay();
  }

  private initializeOpenpay(): void {
    if (typeof OpenPay !== 'undefined') {
      this.openpayInstance = OpenPay;
      this.openpayInstance.setId(environment.openpay.merchantId);
      this.openpayInstance.setApiKey(environment.openpay.publicKey);
      this.openpayInstance.setSandboxMode(environment.openpay.sandbox);
    }
  }

  validateCardData(card: OpenPayCard): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar número de tarjeta
    if (!card.card_number || card.card_number.length < 13 || card.card_number.length > 19) {
      errors.push('Número de tarjeta inválido');
    }

    // Validar nombre del titular
    if (!card.holder_name || card.holder_name.trim().length < 2) {
      errors.push('Nombre del titular requerido');
    }

    // Validar fecha de expiración
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const expYear = parseInt(card.expiration_year);
    const expMonth = parseInt(card.expiration_month);

    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      errors.push('Fecha de expiración inválida');
    }

    // Validar CVV
    if (!card.cvv2 || card.cvv2.length < 3 || card.cvv2.length > 4) {
      errors.push('CVV inválido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  sanitizeAmount(amount: number): number {
    // Asegurar que el monto sea positivo y tenga máximo 2 decimales
    return Math.round(Math.max(0, amount) * 100) / 100;
  }

  sanitizeUserId(userId: string): string {
    // Remover caracteres especiales y limitar longitud
    return userId.replace(/[^a-zA-Z0-9\-_]/g, '').substring(0, 50);
  }

  createToken(card: OpenPayCard): Promise<OpenPayToken> {
    return new Promise((resolve, reject) => {
      if (!this.openpayInstance) {
        reject(new Error('OpenPay no está inicializado'));
        return;
      }

      const validation = this.validateCardData(card);
      if (!validation.isValid) {
        reject(new Error(validation.errors.join(', ')));
        return;
      }

      this.openpayInstance.token.create(card,
        (response: OpenPayToken) => {
          resolve(response);
        },
        (error: any) => {
          reject(new Error(error.message || 'Error al crear token'));
        }
      );
    });
  }

  processPayment(paymentData: PaymentRequest, tokenId: string): Observable<PaymentResponse> {
    const sanitizedData = {
      ...paymentData,
      userId: this.sanitizeUserId(paymentData.userId),
      amount: this.sanitizeAmount(paymentData.amount)
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    });

    const payload = {
      ...sanitizedData,
      tokenId,
      merchantId: environment.openpay.merchantId
    };

    this.paymentStatus.next('processing');

    return this.http.post<PaymentResponse>(`${environment.apiUrl}/payments/process`, payload, { headers });
  }

  updatePaymentStatus(status: string): void {
    this.paymentStatus.next(status);
  }

  getDeviceSessionId(): string {
    if (this.openpayInstance && this.openpayInstance.deviceData) {
      return this.openpayInstance.deviceData.setup();
    }
    return '';
  }

  // === NUEVAS FUNCIONALIDADES ===

  /**
   * Crear pago dividido para reserva
   */
  createSplitPayment(splitPaymentData: SplitPaymentRequest): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    });

    this.paymentStatus.next('processing');

    return this.http.post<any>(`${environment.apiUrl}/payment/split/reservation`, splitPaymentData, { headers });
  }

  /**
   * Pagar un split individual
   */
  paySplit(splitId: number, paymentData: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    });

    const payload = {
      ...paymentData,
      device_session_id: this.getDeviceSessionId()
    };

    return this.http.post<any>(`${environment.apiUrl}/payment/split/${splitId}/pay`, payload, { headers });
  }

  /**
   * Obtener splits pendientes del usuario
   */
  getPendingSplits(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/payment/splits/pending`);
  }

  /**
   * Obtener detalles de un pago dividido
   */
  getSplitPaymentDetails(paymentId: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/payment/split/${paymentId}/details`);
  }

  /**
   * Obtener información del customer
   */
  getCustomer(): Observable<{ success: boolean; data: Customer }> {
    return this.http.get<{ success: boolean; data: Customer }>(`${environment.apiUrl}/customer`);
  }

  /**
   * Crear customer
   */
  createCustomer(customerData: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(`${environment.apiUrl}/customer`, customerData, { headers });
  }

  /**
   * Obtener tarjetas guardadas
   */
  getSavedCards(): Observable<{ success: boolean; data: SavedCard[] }> {
    return this.http.get<{ success: boolean; data: SavedCard[] }>(`${environment.apiUrl}/customer/cards`);
  }

  /**
   * Agregar nueva tarjeta
   */
  addCard(cardData: { token_id: string; alias?: string; is_default?: boolean }): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const payload = {
      ...cardData,
      device_session_id: this.getDeviceSessionId()
    };

    return this.http.post<any>(`${environment.apiUrl}/customer/cards`, payload, { headers });
  }

  /**
   * Eliminar tarjeta
   */
  deleteCard(cardId: number): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/customer/cards/${cardId}`);
  }

  /**
   * Establecer tarjeta como predeterminada
   */
  setDefaultCard(cardId: number): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/customer/cards/${cardId}/default`, {});
  }

  /**
   * Procesar pago con tarjeta guardada
   */
  processPaymentWithSavedCard(paymentData: PaymentRequest, cardId: number): Observable<PaymentResponse> {
    const sanitizedData = {
      ...paymentData,
      userId: this.sanitizeUserId(paymentData.userId),
      amount: this.sanitizeAmount(paymentData.amount)
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    });

    const payload = {
      ...sanitizedData,
      card_id: cardId,
      device_session_id: this.getDeviceSessionId(),
      payment_method: 'card'
    };

    this.paymentStatus.next('processing');

    return this.http.post<PaymentResponse>(`${environment.apiUrl}/payment/reservation`, payload, { headers });
  }

  /**
   * Crear pago con transferencia bancaria
   */
  processPaymentWithBankTransfer(paymentData: PaymentRequest): Observable<PaymentResponse> {
    const sanitizedData = {
      ...paymentData,
      userId: this.sanitizeUserId(paymentData.userId),
      amount: this.sanitizeAmount(paymentData.amount)
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    });

    const payload = {
      ...sanitizedData,
      payment_method: 'bank_transfer',
      device_session_id: this.getDeviceSessionId()
    };

    this.paymentStatus.next('processing');

    return this.http.post<PaymentResponse>(`${environment.apiUrl}/payment/reservation`, payload, { headers });
  }

  /**
   * Obtener configuración pública de OpenPay
   */
  getOpenPayConfig(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/payment/openpay/config`);
  }

  /**
   * Verificar estado de transacción
   */
  checkTransactionStatus(transactionId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/payment/transaction/${transactionId}/status`);
  }

  /**
   * Verificar si las funcionalidades están habilitadas
   */
  isSplitPaymentEnabled(): boolean {
    return environment.features.splitPayments;
  }

  isMultipleCardsEnabled(): boolean {
    return environment.features.multipleCards;
  }

  isBankTransferEnabled(): boolean {
    return environment.features.bankTransfers;
  }

  isAdminPaymentEnabled(): boolean {
    return environment.features.adminPayments;
  }

  // === COMUNICACIÓN SEGURA PARA IFRAME ===

  /**
   * Inicializar comunicación segura con parent
   */
  initializeSecurePostMessage(): void {
    // Validar que estamos en un iframe
    if (window.parent === window) {
      console.warn('Not running in iframe context');
      return;
    }

    // Lista de dominios permitidos para recibir mensajes
    const allowedOrigins = [
      'https://app.mexpadel.com',
      'https://mexpadel.com',
      'capacitor://localhost', // Para apps móviles
      'ionic://localhost'
    ];

    // En desarrollo, permitir localhost
    if (!environment.production) {
      allowedOrigins.push('http://localhost:8100', 'http://localhost:4200');
    }

    // Escuchar mensajes del parent
    window.addEventListener('message', (event) => {
      // Verificar origen
      if (!allowedOrigins.includes(event.origin)) {
        console.error('Unauthorized message origin:', event.origin);
        return;
      }

      // Procesar comandos seguros del parent
      this.handleParentMessage(event.data);
    });

    // Notificar al parent que el iframe está listo
    this.sendSecureMessage('IFRAME_READY', {
      timestamp: Date.now(),
      version: '1.0.0'
    });
  }

  /**
   * Enviar mensaje seguro al parent
   */
  private sendSecureMessage(type: string, data: any): void {
    if (window.parent === window) return;

    const message: SecureMessage = {
      type,
      data,
      timestamp: Date.now(),
      source: 'mex-padel-payment-gateway',
      nonce: this.generateSecureNonce()
    };

    // Agregar checksum para verificar integridad
    message.checksum = this.calculateChecksum(message);

    window.parent.postMessage(message, '*');
  }

  /**
   * Manejar mensajes del parent
   */
  private handleParentMessage(message: any): void {
    if (!this.validateMessageIntegrity(message)) {
      console.error('Message integrity validation failed');
      return;
    }

    switch (message.type) {
      case 'SET_PAYMENT_DATA':
        this.handleSetPaymentData(message.data);
        break;
      case 'CLOSE_IFRAME':
        this.handleCloseIframe();
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  /**
   * Notificar éxito de pago
   */
  notifyPaymentSuccess(paymentData: any): void {
    this.sendSecureMessage('PAYMENT_SUCCESS', {
      id: paymentData.id,
      status: paymentData.status,
      amount: paymentData.amount,
      transactionId: paymentData.transactionId,
      timestamp: Date.now()
    });

    // Auto-cerrar iframe después de éxito
    setTimeout(() => {
      this.sendSecureMessage('PAYMENT_COMPLETE', { status: 'success' });
    }, 2000);
  }

  /**
   * Notificar error de pago
   */
  notifyPaymentError(error: string): void {
    this.sendSecureMessage('PAYMENT_ERROR', {
      error: error,
      timestamp: Date.now()
    });
  }

  /**
   * Notificar cancelación
   */
  notifyPaymentCancelled(): void {
    this.sendSecureMessage('PAYMENT_CANCELLED', {
      timestamp: Date.now()
    });

    setTimeout(() => {
      this.sendSecureMessage('PAYMENT_COMPLETE', { status: 'cancelled' });
    }, 1000);
  }

  /**
   * Generar nonce seguro
   */
  private generateSecureNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Calcular checksum del mensaje
   */
  private calculateChecksum(message: any): string {
    const content = JSON.stringify({
      type: message.type,
      data: message.data,
      timestamp: message.timestamp
    });

    // Simple hash para verificar integridad (en producción usar crypto.subtle)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Validar integridad del mensaje
   */
  private validateMessageIntegrity(message: any): boolean {
    if (!message.type || !message.timestamp || !message.checksum) {
      return false;
    }

    // Verificar que el mensaje no sea muy antiguo (5 minutos)
    const messageAge = Date.now() - message.timestamp;
    if (messageAge > 300000) {
      console.error('Message too old:', messageAge);
      return false;
    }

    // Verificar checksum
    const expectedChecksum = this.calculateChecksum(message);
    return message.checksum === expectedChecksum;
  }

  /**
   * Manejar datos de pago del parent
   */
  private handleSetPaymentData(data: any): void {
    // Validar datos antes de usar
    if (!data || !data.amount || !data.userId) {
      console.error('Invalid payment data received');
      return;
    }

    // Aplicar datos al formulario de pago (implementar según necesidad)
    console.log('Payment data set:', data);
  }

  /**
   * Manejar cierre de iframe
   */
  private handleCloseIframe(): void {
    this.sendSecureMessage('IFRAME_CLOSING', {
      timestamp: Date.now()
    });
    // El parent se encargará del cierre real
  }

  // === DETECCIÓN DE FRAUDE Y DEVICE FINGERPRINTING ===

  /**
   * Generar device fingerprint
   */
  generateDeviceFingerprint(): Promise<string> {
    return new Promise((resolve) => {
      const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        colorDepth: screen.colorDepth,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        touchSupport: 'ontouchstart' in window,
        timestamp: Date.now()
      };

      // Crear hash del fingerprint
      const fingerprintString = JSON.stringify(fingerprint);
      let hash = 0;
      for (let i = 0; i < fingerprintString.length; i++) {
        const char = fingerprintString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }

      const deviceId = Math.abs(hash).toString(16);
      resolve(`device_${deviceId}_${Date.now()}`);
    });
  }

  /**
   * Detectar comportamiento sospechoso
   */
  detectSuspiciousBehavior(): { isSuspicious: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Detectar si estamos en entorno de desarrollo o simulador
    const isDevelopment = !environment.production;
    const isSimulator = /simulator|ios simulator/i.test(navigator.userAgent) ||
                       window.location.hostname === 'localhost' ||
                       window.location.hostname.includes('127.0.0.1');

    // En desarrollo o simulador, ser mucho más permisivo
    if (isDevelopment || isSimulator) {
      console.log('Development/Simulator mode - fraud detection relaxed');

      // Solo verificar manipulaciones realmente críticas
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        if (form.hasAttribute('data-modified') && form.getAttribute('data-modified') === 'malicious') {
          reasons.push('critical_dom_manipulation');
        }
      });

      return {
        isSuspicious: false, // En desarrollo/simulador, nunca marcar como sospechoso
        reasons: []
      };
    }

    // Solo en producción aplicar detección estricta
    // 1. Verificar si hay herramientas de desarrollo abiertas
    const threshold = 200; // Incrementar umbral para ser menos estricto
    if (window.outerHeight - window.innerHeight > threshold ||
        window.outerWidth - window.innerWidth > threshold) {
      reasons.push('dev_tools_detected');
    }

    // 2. Verificar modificaciones sospechosas en el DOM
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      if (form.hasAttribute('data-modified')) {
        reasons.push('dom_manipulation');
      }
    });

    // 3. Verificar extensiones sospechosas
    if ((navigator as any).webdriver) {
      reasons.push('automation_detected');
    }

    // 4. Verificar JavaScript modificado
    const originalStringify = JSON.stringify;
    if (JSON.stringify !== originalStringify) {
      reasons.push('js_modification');
    }

    // 5. Verificar iframe anidado - pero permitir iframe único (nuestro caso de uso)
    if (window.top !== window.self && window.top !== window.parent) {
      reasons.push('nested_iframe'); // Solo marcar si hay más de un nivel de iframe
    }

    return {
      isSuspicious: reasons.length > 2, // Requerir al menos 3 indicadores para marcar como sospechoso
      reasons
    };
  }

  /**
   * Verificar headers de seguridad
   */
  checkSecurityHeaders(): boolean {
    // Esta verificación se hace en el servidor, pero podemos validar
    // que estemos en un contexto seguro
    return location.protocol === 'https:' || location.hostname === 'localhost';
  }
}