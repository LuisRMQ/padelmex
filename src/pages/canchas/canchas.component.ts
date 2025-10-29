import { Component, OnInit } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { RegistrarCanchaDialogComponent } from './registrar-cancha-dialog/registrar-cancha-dialog.component';
import { CourtService, Court, Club, CourtsResponse } from '../../app/services/court.service';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDivider } from "@angular/material/divider";
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from '../../app/commonComponents/confirmDialog.component';
import { RegistrarHorarioDialogComponent } from './registrar-horario-dialog/registrar-horario-dialog.component';
import { HorariosServiceCancha } from '../../app/services/horarios-canchas.service';
import { InfoCanchaDialogComponent } from './info-cancha-dialog/info-cancha-dialog.component';
import { EditarCanchaDialogComponent } from './editar-cancha-dialog/editar-cancha-dialog.component';

import { RegistrarCanchaCerradaDialogComponent } from './registrar-diacerrado-dialog/registrar-diacerrado-dialog.component';


@Component({
  selector: 'app-canchas',
  templateUrl: './canchas.component.html',
  styleUrls: ['./canchas.component.css'],
  imports: [
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatExpansionModule,
    MatDialogModule,
    CommonModule,
    MatCardModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDivider,
    FormsModule
  ],
  standalone: true
})
export class CanchasComponent implements OnInit {

  clubs: Club[] = [];
  selectedClubId: number | null = null;
  courts: Court[] = [];
  loading = false;
  error = '';
  editandoCanchaID: number | null = null;
  backupCancha: Partial<Court> | null = null;
  logoFile: File | null = null;
  currentPage = 1;
  lastPage = 1;

  constructor(
    private courtService: CourtService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private horariosCanchasService: HorariosServiceCancha,
  ) { }

  ngOnInit() {
    this.loadClubs();
  }


  getClub(clubId: number): Club | undefined {
    return this.clubs.find(c => c.id === clubId);
  }

  getClubName(clubId: number): string {
    const club = this.getClub(clubId);
    return club ? club.name : 'Club no encontrado';
  }

  loadClubs() {
    this.courtService.getClubs().subscribe({
      next: (clubs) => {
        this.clubs = clubs;
        if (clubs.length > 0) {
          this.selectedClubId = clubs[0].id;
          this.loadCourts();
        }
      },
      error: (error) => {
        this.error = 'Error al cargar los clubs';
        console.error(error);
      }
    });
  }

  onClubChange() {
    if (this.selectedClubId) {
      this.loadCourts();
    }
  }

  loadCourts(page: number = 1) {
    if (!this.selectedClubId) return;

    this.loading = true;
    this.courts = [];
    this.error = '';

    this.courtService.getCourtsByClub(this.selectedClubId, 5, page).subscribe({
      next: (response: CourtsResponse) => {
        this.courts = response.data;
        this.currentPage = response.current_page;
        this.lastPage = response.last_page;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar las canchas';
        this.loading = false;
        console.error(error);
      }
    });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.lastPage) return;
    this.loadCourts(page);
  }


  abrirModalRegistrarCancha(selectedClubId: number | null, courts: Court[]) {
    const dialogRef = this.dialog.open(RegistrarCanchaDialogComponent, {
      width: '800px',
      maxWidth: '50vw',
      maxHeight: '70vh',
      panelClass: 'custom-dialog',
      data: { selectedClubId, courts }
    });

    dialogRef.afterClosed().subscribe(async result => {
      console.log('Dialog result:', result);
      if (result) {
        await this.loadCourts();
        this.abrirModalRegistrarHorario(result.club);
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






  onImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = '../../../assets/images/logoclub.jpg';
  }




  addDiaCerrado(court: any): void {
    const dialogRef = this.dialog.open(RegistrarCanchaCerradaDialogComponent, {
      width: '800px',
      maxWidth: '50vw',
      maxHeight: '70vh',
      panelClass: 'custom-dialog',
      data: { courtId: court.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Día cerrado registrado:', result);
      }
    });
  }


  cancelarEdicion(court: Court) {
    if (this.backupCancha) {
      Object.assign(court, this.backupCancha);
    }
    this.editandoCanchaID = null;
    this.backupCancha = null;
    this.snackBar.open('Edición cancelada', 'Cerrar', {
      duration: 2000,
      panelClass: ['snackbar-info']
    });
  }

  onLogoSelected(event: Event, court: Court) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.snackBar.open('El archivo supera los 5MB', 'Cerrar', { duration: 3000, panelClass: ['snackbar-error'] });
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      court.photo = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    this.logoFile = file;
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
            this.courts = this.courts.filter(c => c.id !== court.id);
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

  abrirModalRegistrarHorario(court: Court) {
    this.horariosCanchasService.getHorariosByCourt(court.club_id, court.id).subscribe({
      next: (horarios) => {
        const dialogRef = this.dialog.open(RegistrarHorarioDialogComponent, {
          maxWidth: '80vw',
          maxHeight: '90vh',
          height:'90vh',
          data: { courtId: court.id, horarios, clubId: court.club_id, courtName: court.name },
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.snackBar.open('Horario registrado exitosamente', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-success'],
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            });
          }
        });
      },
      error: (err) => {
        console.error('❌ Error al obtener horarios', err);
        this.snackBar.open('Error al cargar los horarios', 'Cerrar', { duration: 3000 });
      }
    });
  }


  abrirModalHorarios(court: Court) {
    this.horariosCanchasService.getHorariosByCourt(court.club_id, court.id).subscribe({
      next: (horarios) => {
        console.log('Horarios recibidos:', horarios);
        this.dialog.open(InfoCanchaDialogComponent, {
          width: '750px',
          maxWidth: '60vw',
          data: { court, horarios }
        });
      },
      error: (err) => {
        console.error('Error al obtener horarios', err);
        this.snackBar.open('❌ Error al cargar los horarios', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-error']
        });
      }
    });
  }

  get totalCanchas(): number {
    return this.courts.length;
  }

  get totalCanchasPublicas(): number {
    return this.courts.filter(c => c.type === 'exterior').length;
  }

  get totalCanchasPrivadas(): number {
    return this.courts.filter(c => c.type === 'interior').length;
  }


  onImgError(event: Event): void {
  const img = event.target as HTMLImageElement;
  img.src = 'assets/images/placeholder.png';
}

}