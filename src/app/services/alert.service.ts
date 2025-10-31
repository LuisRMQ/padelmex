import { Injectable } from '@angular/core';
import Swal, { SweetAlertResult } from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class AlertService {
  async success(title: string, text?: string) {
    return Swal.fire({ icon: 'success', title, text, confirmButtonText: 'OK' });
  }

  async error(title: string, text?: string) {
    return Swal.fire({ icon: 'error', title, text, confirmButtonText: 'Cerrar' });
  }

  async info(title: string, text?: string) {
    return Swal.fire({ icon: 'info', title, text, confirmButtonText: 'OK' });
  }

  async confirm(title: string, text?: string, confirmText = 'Sí', cancelText = 'Cancelar'): Promise<SweetAlertResult> {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true
    });
  }

  toast(message: string, icon: 'success' | 'error' | 'info' = 'success', timer = 3000) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer,
      timerProgressBar: true
    });

    return Toast.fire({ icon, title: message });
  }
}
