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
import { EditarClubDialogComponent } from '../clubs/editar-club-dialog/editar-club-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';

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

  club: any;
  horarios: HorarioClub[] = [];
  canchas: Court[] = [];

  clubId!: number;
  editandoClubId: number | null = null;
  logoFile: File | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;


  constructor(
    private integrantesService: IntegrantesService,
    private clubsService: ClubsService,
    private authService: AuthService,
    private horariosService: HorariosService,
    private courtService: CourtService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

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

  abrirEditarClubDialog(club: Club) {
    const dialogRef = this.dialog.open(EditarClubDialogComponent, {
      minWidth: '60vw',
      minHeight: '80vh',
      maxHeight: '80vh',
      data: { club }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.guardarClubEditado(result);
      }
    });
  }

  guardarClubEditado(clubOrForm: Club | FormData) {
    let values: any = {};
    if (clubOrForm instanceof FormData) {
      clubOrForm.forEach((value, key) => {
        values[key] = value;
      });
    } else {
      values = { ...clubOrForm };

      if (typeof values.logo === 'string') {
        delete values.logo;
      }
    }

    if (!values.name || !values.email || !values.phone || !values.rfc || !values.address || !values.type) {
      this.snackBar.open('Completa todos los campos obligatorios', 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-error']
      });
      return;
    }

    if (clubOrForm instanceof FormData) {
      this.clubsService.updateClub(values.id, clubOrForm).subscribe({
        next: (res) => {
          this.cargarClub(this.clubId);
          this.editandoClubId = null;
          this.logoFile = null;
          this.snackBar.open('Club actualizado correctamente', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-success']
          });
        },
        error: (err) => {
          this.snackBar.open('Error al actualizar el club', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-error']
          });
        }
      });
    } else {
      this.clubsService.updateClub(values.id, values).subscribe({
        next: (res) => {
          this.editandoClubId = null;
          this.snackBar.open('Club actualizado correctamente', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-success']
          });
          this.cargarClub(this.clubId);
        },
        error: (err) => {
          console.error("🔥 Error al actualizar (Objeto Club):", err);
          this.snackBar.open('Error al actualizar el club', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-error']
          });
        }
      });
    }
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
