import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

import { UsersService, User } from '../../app/services/users.service';
import { CourtService } from '../../app/services/court.service';

import { RegistrarUsuarioDialogComponent } from './registrar-usuario-dialog/registrar-usuario-dialog.component';
import { EditarUsuarioDialogComponent } from './editar-usuario-dialog/editar-usuario-dialog.component';
import { ReservacionesUsuarioDialogComponent } from './reservaciones-usuario-dialog/reservaciones-usuario-dialog.component';
import { TournamentsCardsComponent } from './historial-usuario-dialog/historial-usuario-dialog.component';


export interface UsuarioTabla {
  id?: number;
  nombre: string;
  apellidos: string;
  correo: string;
  genero: string;
  rol: string;
  rol_id: number;
  club: string;
  club_id: number;
  categoria: string;
  point: number;
  fotoPerfil: string;
  telefono: string;
  area_code: string;
  level: string;
}


@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinner,
    MatTableModule,
    MatPaginatorModule,
  ]
})
export class UsuariosComponent implements OnInit {
  selectedUsuario: any = null;
  displayedColumns: string[] = [
    'nombre',
    'telefono',
    'rol',
    'club',
    'nivel',
    'categoria',
    'acciones'
  ];
  usuariosAll: UsuarioTabla[] = [];
  usuariosFiltrados: UsuarioTabla[] = [];
  clubs: any[] = [];
  roles: any[] = [];

  // filtros
  filtros = {
    gender: "",
    rol_id: "",
    category: "",
    club_id: "",
    level: "",
  };

  searchText: string = "";
  loading: boolean = false;

  dataSource = new MatTableDataSource<UsuarioTabla>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private usersService: UsersService,
    private courtService: CourtService,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
    this.loadRoles();

    this.cargarClubs();
    this.cargarTodasLasPaginasUsuarios();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }


  loadRoles() {
    this.usersService.getRoles().subscribe({
      next: (res) => {
        this.roles = res;
      },
      error: (err) => console.error("Error cargando roles:", err)
    });
  }

  cargarTodasLasPaginasUsuarios(page: number = 1) {

    if (page === 1) this.loading = true;

    this.usersService.getUserss(page).subscribe({
      next: (res: { data: User[], current_page: number, last_page: number }) => {

        const usuariosPage = res.data.map(u => ({
          id: u.id!,
          nombre: u.name,
          apellidos: u.lastname,
          correo: u.email,
          genero: u.gender,
          rol: u.rol || "-",
          rol_id: u.rol_id ?? 0,
          club: this.clubs.find(c => c.id === u.club_id)?.name || "-",
          club_id: u.club_id ?? 0,
          categoria: u.category || "-",
          point: u.point ?? 0,
          fotoPerfil: u.profile_photo || "../../../assets/images/iconuser.png",
          telefono: u.phone || "-",
          area_code: u.area_code || "-",
          level: u.level || "-"
        }));

        this.usuariosAll.push(...usuariosPage);

        if (page < res.last_page) {
          this.cargarTodasLasPaginasUsuarios(page + 1);
        } else {
          this.loading = false;
          this.aplicarFiltros();
        }
      },
      error: () => this.loading = false
    });
  }

aplicarFiltros() {
  let filtrados = [...this.usuariosAll];

  if (this.searchText.trim() !== "") {
    const search = this.searchText.toLowerCase();

    filtrados = filtrados.filter(u =>
      (u.nombre + " " + u.apellidos).toLowerCase().includes(search) ||
      u.correo.toLowerCase().includes(search) ||
      u.club.toLowerCase().includes(search) ||
      u.rol.toLowerCase().includes(search) ||
      u.categoria.toLowerCase().includes(search) ||
      u.level.toLowerCase().includes(search)
    );
  }

  if (this.filtros.gender) {
    filtrados = filtrados.filter(u => u.genero === this.filtros.gender);
  }

  // if (this.filtros.rol_id) {
  //   console.log(this.filtros.rol_id);
  //   filtrados = filtrados.filter(u => u.rol_id == Number(this.filtros.rol_id));
  // }

  if (this.filtros.club_id) {
    filtrados = filtrados.filter(u => u.club_id == Number(this.filtros.club_id));
  }

  if (this.filtros.level) {
    filtrados = filtrados.filter(u => u.level == String(this.filtros.level));
  }

  this.usuariosFiltrados = filtrados;
  this.dataSource.data = filtrados;
  if (this.paginator) {
    this.paginator.firstPage();
  }
}


  resetearUsuariosYRecargar() {
  this.usuariosAll = [];
  this.usuariosFiltrados = [];
  this.dataSource.data = [];
  this.loading = true;

  this.cargarTodasLasPaginasUsuarios(1);
}

  applyFilter(event: Event) {
    this.searchText = (event.target as HTMLInputElement).value;
    this.aplicarFiltros();
  }

    abrirModalRegistrarUsuario() {
    const dialogRef = this.dialog.open(RegistrarUsuarioDialogComponent, {
      width: '60vw',
      maxWidth: '80vw',
      maxHeight: '90vh',
      panelClass: 'custom-dialog'
    });

    dialogRef.afterClosed().subscribe(() => {
      this.resetearUsuariosYRecargar();
    });
  }


  abrirModalEditarUsuario(usuario: UsuarioTabla) {
    const dialogRef = this.dialog.open(EditarUsuarioDialogComponent, {
      width: '60vw',
      maxWidth: '80vw',
      maxHeight: '90vh',
      data: { userId: usuario.id },
      panelClass: 'custom-dialog'
    });

    dialogRef.afterClosed().subscribe(() => {
      this.resetearUsuariosYRecargar();
    });
  }

  VerReservaciones(usuario: UsuarioTabla) {
    this.dialog.open(ReservacionesUsuarioDialogComponent, {
      width: 'auto',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { userId: usuario.id!, nombre: usuario.nombre }
    })
  }

    abrirHistorialTorneo(usuario: UsuarioTabla) {

    this.dialog.open(TournamentsCardsComponent, {
      width: 'auto',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { userId: usuario.id!, nombre: usuario.nombre }
    })
    console.log(usuario)
  }


  cargarClubs() {
    this.courtService.getClubs().subscribe({
      next: clubs => this.clubs = clubs
    });
  }


  eliminarUsuario(usuario: UsuarioTabla) {
    if (!usuario.id) return;

    this.usersService.desactivarUser(usuario.id).subscribe({
      next: () => this.cargarTodasLasPaginasUsuarios()
    });
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = '../../../assets/images/iconuser.png';
  }


  getTotalUsuarios(): number { return this.usuariosAll.length; }
  getTotalUsuariosByRol(rol: string): number { return this.usuariosAll.filter(u => u.rol.toLowerCase() === rol.toLowerCase()).length; }
  getCategoriaConMasUsuarios(): string { const categoriaCount: { [key: string]: number } = {}; this.usuariosAll.forEach(u => { const categoria = u.categoria.toLowerCase(); categoriaCount[categoria] = (categoriaCount[categoria] || 0) + 1; }); const maxCategoria = Object.keys(categoriaCount).reduce((a, b) => categoriaCount[a] > categoriaCount[b] ? a : b, ''); return maxCategoria.charAt(0).toUpperCase() + maxCategoria.slice(1); }
}
