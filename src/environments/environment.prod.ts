

export const environment = {
  production: false,
  // apiUrl: 'https://www.padelmex.app/api',
      apiUrl: 'http://127.0.0.1:8000/api',

  openpay: {
    merchantId: 'mje9bkrakxc4ryenazgs', // Merchant ID de desarrollo
    publicKey: 'pk_d80cd4d1c62744278bbf9e2f0c6aefc8', // Clave pública de desarrollo
    sandbox: true                 // true para desarrollo, false para producción
  },
  features: {
    splitPayments: true,          // Habilitar pagos divididos
    multipleCards: true,          // Habilitar múltiples tarjetas
    bankTransfers: true,          // Habilitar transferencias
    adminPayments: true           // Habilitar pagos administrativos
  }

};