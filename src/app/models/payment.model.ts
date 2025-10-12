export interface PaymentRequest {
  userId: string;
  amount: number;
  description: string;
  customerEmail?: string;
  customerName?: string;
  paymentMethod?: 'card' | 'bank_transfer';
  cardId?: number;
  tokenId?: string;
  deviceSessionId?: string;
}

export interface PaymentResponse {
  id: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  transactionId?: string;
  errorMessage?: string;
  paymentMethod?: string;
}

export interface SplitPaymentRequest {
  reservationId: number;
  description?: string;
  splits: PaymentSplit[];
}

export interface PaymentSplit {
  userId: number;
  amount: number;
  percentage?: number;
}

export interface SplitPaymentResponse {
  id: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  amount: number;
  percentage?: number;
  userName: string;
  paymentMethod?: string;
  paidAt?: string;
  notes?: string;
}

export interface SavedCard {
  id: string; // OpenPay usa string IDs
  alias: string;
  cardNumber: string; // últimos 4 dígitos
  holderName: string;
  brand: string;
  type: 'credit' | 'debit';
  isDefault: boolean;
  status: 'active' | 'inactive';
}

export interface OpenPayCard {
  card_number: string;
  holder_name: string;
  expiration_year: string;
  expiration_month: string;
  cvv2: string;
}

export interface OpenPayToken {
  id: string;
  card: {
    type: string;
    brand: string;
    card_number: string;
    holder_name: string;
    expiration_year: string;
    expiration_month: string;
  };
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  paymentCards: SavedCard[];
}