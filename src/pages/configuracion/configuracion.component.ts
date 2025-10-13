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
import { CourtService, Court, CourtsResponse } from '../../app/services/court.service';

import { MatDividerModule } from "@angular/material/divider";
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RegistrarHorarioDialogComponent } from '../clubs/registrar-horario-dialog/registrar-horario-dialog.component';
import { EditarCanchaDialogComponent } from '../canchas/editar-cancha-dialog/editar-cancha-dialog.component';
import { ConfirmDialogComponent } from '../../app/commonComponents/confirmDialog.component';
import { RegistrarCanchaDialogComponent } from './registrar-cancha-dialog/registrar-cancha-dialog.component';
import { RegistrarClubDialogComponent } from '../clubs/registrar-club-dialog/registrar-club-dialog.component';

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
  clubs: Club[] = [];
  horarios: HorarioClub[] = [];
  canchas: Court[] = [];

  clubId!: number;
  editandoClubId: number | null = null;
  logoFile: File | null = null;

  currentPage = 1;
  lastPage = 1;

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
      this.loadCourts();
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

    this.clubsService.getClubs().subscribe({
      next: (res) => {
        this.clubs = res;
      },
      error: (err) => console.error('Error al obtener clubes:', err)
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

  abrirEditarClubDialog(clubs: Club[], club: Club | null = null) {
    const dialogRef = this.dialog.open(RegistrarClubDialogComponent, {
      minWidth: '60vw',
      minHeight: '80vh',
      maxHeight: '80vh',
      data: { club, clubs }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.editandoClubId = null;
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

  abrirModalRegistrarHorario(club: Club) {
    this.horariosService.getHorariosByClub(club.id).subscribe({
      next: (horarios) => {
        const dialogRef = this.dialog.open(RegistrarHorarioDialogComponent, {
          maxWidth: '80vw',
          maxHeight: '80vh',
          data: {
            clubId: club.id,
            name: club.name,
            horarios
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.snackBar.open('✅ Horario registrado exitosamente', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-success'],
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            });
            this.cargarHorarios();
          }
          else {
            this.cargarHorarios();
          }
        });
      },
      error: (err) => {
        console.error('❌ Error al obtener horarios del club', err);
        this.snackBar.open('Error al cargar los horarios', 'Cerrar', { duration: 3000 });
      }
    });
  }

  abrirEditarCanchaDialog(court: Court) {
    const dialogRef = this.dialog.open(EditarCanchaDialogComponent, {
      width: '800px',
      maxWidth: '50vw',
      height: 'auto',
      maxHeight: '70vh',
      panelClass: 'custom-dialog',
      data: { court }
    });

    dialogRef.afterClosed().subscribe((formData: FormData) => {
      if (formData) {
        this.courtService.updateCourt(court.id, formData).subscribe({
          next: () => {
            this.snackBar.open('✅ Cancha actualizada correctamente', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-success']
            });
            this.loadCourts();
          },
          error: (err) => {
            console.error('Error al actualizar cancha:', err);
            this.snackBar.open('❌ Error al actualizar la cancha', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-error']
            });
          }
        });
      }
    });
  }

  loadCourts(page: number = 1) {
    this.canchas = [];

    this.courtService.getCourtsByClub(this.clubId, 5, page).subscribe({
      next: (response: CourtsResponse) => {
        this.canchas = response.data;
        this.currentPage = response.current_page;
        this.lastPage = response.last_page;
        // this.loading = false;
      },
      error: (error) => {
        // this.error = 'Error al cargar las canchas';
        // this.loading = false;
        console.error(error);
      }
    });
  }

  confirmarEliminarCancha(court: Court) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '700px',
      data: {
        title: '¿Eliminar cancha?',
        message: `¿Estás seguro que deseas eliminar la cancha "${court.name}"?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.courtService.deleteCourt(court.id, court.club_id).subscribe({
          next: () => {
            this.snackBar.open('Cancha eliminada correctamente', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-success']
            });
            this.canchas = this.canchas.filter(c => c.id !== court.id);
          },
          error: () => {
            this.snackBar.open('Error al eliminar la cancha', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-error']
            });
          }
        });
      }
    });
  }

  goToPage(page: number) {
    const lista = document.querySelector('.clubs-lista');
    const scrollY = lista ? lista.scrollTop : window.scrollY;

    this.loadCourts(page);

    setTimeout(() => {
      if (lista) {
        lista.scrollTop = scrollY;
      } else {
        window.scrollTo({ top: scrollY });
      }
    }, 0);
  }

  abrirModalRegistrarCancha() {
    const dialogRef = this.dialog.open(RegistrarCanchaDialogComponent, {
      width: '800px',
      maxWidth: '50vw',
      maxHeight: '70vh',
      panelClass: 'custom-dialog',
      data: { club_id: this.clubId, club_name: this.club?.name || '' }
    });

    dialogRef.afterClosed().subscribe(async result => {
      console.log('Dialog result:', result);
      if (result) {
        this.snackBar.open('Cancha registrada exitosamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-success'],
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });

        await this.loadCourts();
        this.abrirModalRegistrarHorario(result.club);
      }
    });
  }
}
