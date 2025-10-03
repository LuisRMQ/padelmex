import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog'; 

import { IntegrantesService, Integrante } from '../../app/services/integrantes.service';
import { ClubsService, Club } from '../../app/services/clubs.service';
import { AuthService, User } from '../../app/services/auth.service';
import { HorariosService, HorarioClub } from '../../app/services/horarios-clubes.service';
import { CourtService, Court } from '../../app/services/court.service';

import { EditarConfiguracionClubDialogComponent } from '../configuracion/editar-configuracion-club-dialog/editar-configuracion-club-dialog.component';
import { MatDividerModule } from "@angular/material/divider"; 
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.css'],
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatMenuModule
]
})
export class ConfiguracionComponent implements OnInit {
  dataSource!: MatTableDataSource<Integrante>;
  selectedUsuario: Integrante | null = null;

  club: Partial<Club> = {};
  horarios: HorarioClub[] = [];
  canchas: Court[] = [];

  clubId!: number;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private integrantesService: IntegrantesService,
    private clubsService: ClubsService,
    private authService: AuthService,
    private horariosService: HorariosService,
    private courtService: CourtService,
    private dialog: MatDialog 
  ) {}

  ngOnInit() {
    this.integrantesService.getIntegrantes().subscribe({
      next: (res: any) => {
        const integrantesArray: Integrante[] = res.data ?? [];
        this.dataSource = new MatTableDataSource(integrantesArray);
        this.dataSource.paginator = this.paginator;
      },
      error: (err) => console.error('Error al obtener integrantes:', err)
    });

    const user: User | null = this.authService.getUserData();
    if (user && user.club_id) {
      this.clubId = user.club_id;
      this.cargarClub(this.clubId);
      this.cargarHorarios();
      this.cargarCanchas();
    } else {
      console.warn('No se encontró user o club_id');
    }
  }

  cargarClub(clubId: number) {
    this.clubsService.getClubById(clubId).subscribe({
      next: (res) => {
        this.club = res;
      },
      error: (err) => console.error('Error al obtener club:', err)
    });
  }

  cargarHorarios(): void {
    this.horariosService.getHorariosByClub(this.clubId).subscribe({
      next: (data) => {
        this.horarios = data;
        console.log('Horarios cargados:', this.horarios);
      },
      error: (err) => console.error('Error al cargar horarios:', err)
    });
  }

  cargarCanchas(): void {
    this.courtService.getCourtsByClub(this.clubId, 10).subscribe({
      next: (res) => {
        this.canchas = res.data;
        console.log('Canchas cargadas:', this.canchas);
      },
      error: (err) => console.error('Error al cargar canchas:', err)
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    if (this.dataSource) {
      this.dataSource.filter = filterValue.trim().toLowerCase();
    }
  }

  verDetalle(usuario: Integrante) {
    this.selectedUsuario = usuario;
  }

  volverLista() {
    this.selectedUsuario = null;
  }

  /** ---- ACCIONES ---- */
  abrirModalRegistrarUsuario() {
    console.log('Abrir modal de registro');
  }

  eliminarUsuario(usuario: Integrante) {
    console.log('Eliminar', usuario);
  }

  onImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = '../../../assets/images/logoclub.jpg';
  }

  editarClub() {
    const dialogRef = this.dialog.open(EditarConfiguracionClubDialogComponent, {
              maxWidth: '80vw',
              maxHeight: '80vh',
      data: {
        id: this.club.id,
        name: this.club.name,
        address: this.club.address,
        phone: this.club.phone,
        email: this.club.email,
        rfc: this.club.rfc,

        logo: this.club.logo
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.cargarClub(this.clubId); 
      }
    });
  }

  editarHorario(horario: HorarioClub) {
    console.log('Editar horario', horario);
  }

  editarCancha(cancha: any) {
    console.log('Editar cancha', cancha);
  }

  getHorarioByDay(day: string): any {
  if (!this.horarios || !Array.isArray(this.horarios)) {
    return null;
  }
  return this.horarios.find(horario => horario.day === day);
}
}
