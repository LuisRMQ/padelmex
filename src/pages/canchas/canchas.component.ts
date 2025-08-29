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

  constructor(
    private courtService: CourtService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit() {
    this.loadClubs();
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

  loadCourts() {
    if (!this.selectedClubId) return;

    this.loading = true;
    this.courts = [];
    this.error = '';

    this.courtService.getCourtsByClub(this.selectedClubId).subscribe({
      next: (response: CourtsResponse) => {
        this.courts = response.data;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar las canchas';
        this.loading = false;
        console.error(error);
      }
    });
  }

  abrirModalRegistrarCancha() {
    const dialogRef = this.dialog.open(RegistrarCanchaDialogComponent, {
      width: '800px',
      maxWidth: '50vw',
      height: 'auto',
      maxHeight: '70vh',
      panelClass: 'custom-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('✅ Cancha registrada exitosamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-success'],
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });

        this.loadCourts();
      }
    });
  }

  editarCancha(court: Court) {
    this.editandoCanchaID = court.id;
    this.backupCancha = { ...court };
  }

  guardarCanchaEditada(court: Court) {
    this.courtService.updateCourt(court.id, court).subscribe({
      next: (res) => {
        this.editandoCanchaID = null;
        this.snackBar.open('Cancha actualizada correctamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-success']
        });
      },
      error: (err) => {
        this.snackBar.open('Error al actualizar la cancha', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-error']
        });
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
    const dialogRef = this.dialog.open(RegistrarHorarioDialogComponent, {
      width: '600px',
      maxWidth: '50vw',
      height: '500px',
      maxHeight: '80vh',
      data: { courtId: court.id },
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
  }
}