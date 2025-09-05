import { Routes } from '@angular/router';
import { LoginComponent } from '../pages/auth/login/login.component';
import { DashboardComponent } from '../pages/dashboard/dashboard.component';
import { ClubsComponent } from '../pages/clubs/clubs.component';
import { CanchasComponent } from '../pages/canchas/canchas.component';
import { UsuariosComponent } from '../pages/usuarios/usuarios.component';
import { CalendarioComponent } from '../pages/calendario/calendario.component';
import { ClientesComponent } from '../pages/clientes/clientes.component';
import { ReservacionesComponent } from '../pages/reservaciones/reservaciones.component';
import { AuthGuard } from '../../src/app/services/auth.guard';
import { NoAuthGuard } from '../../src/app/services/unauth.guard';
import { AppComponent } from './app.component';
import { MainLayoutComponent } from './pages/main-layout/main-layout.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [NoAuthGuard] },
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
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];