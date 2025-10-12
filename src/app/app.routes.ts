import { Routes } from '@angular/router';
import { LoginComponent } from '../pages/auth/login/login.component';
import { DashboardComponent } from '../pages/dashboard/dashboard.component';
import { ClubsComponent } from '../pages/clubs/clubs.component';
import { CanchasComponent } from '../pages/canchas/canchas.component';
import { UsuariosComponent } from '../pages/usuarios/usuarios.component';
import { CalendarioComponent } from '../pages/calendario/calendario.component';
import { ClientesComponent } from '../pages/clientes/clientes.component';
import { ReservacionesComponent } from '../pages/reservaciones/reservaciones.component';
import { IntegrantesComponent } from '../pages/integrantes/integrantes.component';
import { EstadisticasComponent } from '../pages/estadisticas/estadisticas.component';
import { ConfiguracionComponent } from '../pages/configuracion/configuracion.component';
import { TorneosComponent } from '../pages/torneos/torneos.component';
import { ConfigCategoriasRolesComponent } from '../pages/setup/setup.component';
import { PruebasSocketComponent } from '../pages/pruebas-socket/pruebas-socket.component';
import { PaymentGatewayComponent } from './pages/payment-gateway/payment-gateway.component';
import { PaymentSuccessComponent } from './pages/payment-success/payment-success.component';
import { PaymentErrorComponent } from './pages/payment-error/payment-error.component';
import { SecurePaymentComponent } from './pages/secure-payment/secure-payment.component';
import { SecurePaymentNewComponent } from './pages/secure-payment/secure-payment-new.component';
import { AuthGuard } from '../../src/app/services/auth.guard';
import { NoAuthGuard } from '../../src/app/services/unauth.guard';
import { AppComponent } from './app.component';
import { MainLayoutComponent } from './pages/main-layout/main-layout.component';
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [NoAuthGuard] },
  { path: 'payment', component: PaymentGatewayComponent },
  { path: 'secure-payment', component: SecurePaymentNewComponent }, // Nueva versión con lógica correcta
  { path: 'secure-payment-old', component: SecurePaymentComponent }, // Versión anterior para referencia
  { path: 'payment-success', component: PaymentSuccessComponent },
  { path: 'payment-error', component: PaymentErrorComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'clubs', component: ClubsComponent },
      { path: 'canchas', component: CanchasComponent },
      { path: 'usuarios', component: UsuariosComponent },
      { path: 'calendario', component: CalendarioComponent },
      { path: 'clientes', component: ClientesComponent },
      { path: 'reservaciones', component: ReservacionesComponent },
      { path: 'integrantes', component: IntegrantesComponent },
      { path: 'estadisticas', component: EstadisticasComponent },
      { path: 'configuracion', component: ConfiguracionComponent },
      { path: 'torneos', component: TorneosComponent },
      { path: 'configadmin', component: ConfigCategoriasRolesComponent },
      { path: 'pruebasocket', component: PruebasSocketComponent },

      

      

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];