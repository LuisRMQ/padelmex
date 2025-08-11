import { Routes } from '@angular/router';
import { LoginComponent } from '../pages/auth/login/login.component';
import { AppComponent } from './app.component';
import { DashboardComponent } from '../pages/dashboard/dashboard.component';
import { MainLayoutComponent } from './pages/main-layout/main-layout.component';

export const routes: Routes = [

  { path: '', redirectTo: 'login', pathMatch: 'full' },


  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];
