import { Routes } from '@angular/router';
import { LoginComponent } from '../pages/auth/login/login.component';
import { DashboardComponent } from '../pages/dashboard/dashboard.component';
import { MainLayoutComponent } from './pages/main-layout/main-layout.component';
import { ClubsComponent } from '../pages/clubs/clubs.component';
import { CanchasComponent } from '../pages/canchas/canchas.component';
import { UsuariosComponent } from '../pages/usuarios/usuarios.component';
import { CalendarioComponent } from '../pages/calendario/calendario.component';
import { ClientesComponent } from '../pages/clientes/clientes.component';
import { ReservacionesComponent } from '../pages/reservaciones/reservaciones.component';
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
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