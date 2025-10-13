export const environment = {
  production: false,
  apiUrl: 'https://www.padelmex.app/api',
    // apiUrl: 'http://127.0.0.1:8000/api',

  openpay: {
    merchantId: 'mje9bkrakxc4ryenazgs',
    publicKey: 'pk_d80cd4d1c62744278bbf9e2f0c6aefc8',
    sandbox: true
  },
  features: {
    splitPayments: true,
    multipleCards: true,
    bankTransfers: false,
    adminPayments: true
  }
};