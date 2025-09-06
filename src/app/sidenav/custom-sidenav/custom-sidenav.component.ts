import { Component, computed, signal, OnInit, Input } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { AuthService, User } from '../../../app/services/auth.service';

export type MenuItem = {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-custom-sidenav',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatListModule, RouterLink, RouterModule],
  templateUrl: './custom-sidenav.component.html',
  styleUrls: ['./custom-sidenav.component.css']
})
export class CustomSidenavComponent implements OnInit {

  sideNavCollapsed = signal(false);
  @Input() set collapsed(value: boolean) {
    this.sideNavCollapsed.set(value);
  }

  menuItems = signal<MenuItem[]>([
    { label: 'Inicio', icon: 'dashboard', route: '/dashboard' },
    { label: 'Clubs', icon: 'sports_tennis', route: '/clubs' },
    { label: 'Canchas', icon: 'view_column', route: '/canchas' },
    { label: 'Calendario', icon: 'calendar_today', route: '/calendario' },
    { label: 'Clientes', icon: 'sports_handball', route: '/clientes' },
    { label: 'Usuarios', icon: 'people', route: '/usuarios' },
  ]);

  // Signals para usuario
  currentUser = signal<User | null>(null);

  userName = computed(() =>
    this.currentUser() ? `${this.currentUser()?.name} ${this.currentUser()?.lastname}` : 'Usuario'
  );

  userRole = computed(() =>
    this.currentUser()?.rol ? this.currentUser()?.rol : 'Invitado'
  );

  userPhoto = computed(() =>
    this.currentUser()?.profile_photo
      ? this.currentUser()!.profile_photo
      : '../../../assets/images/iconuser.png'
  );

  profilePicSize = computed(() => this.sideNavCollapsed() ? '32' : '100');

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    const userData = this.authService.getUserData();
    if (userData) this.currentUser.set(userData);

    this.authService.getCurrentUser().subscribe(user => {
      this.currentUser.set(user);
    });
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigateByUrl('/login', { replaceUrl: true });
      },
      error: (error) => {
        console.warn('Logout falló en backend (probablemente token expirado)', error);
        this.router.navigateByUrl('/login', { replaceUrl: true });
      }
    });
  }
}
