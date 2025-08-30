import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RegistrarClubDialogComponent } from './registrar-club-dialog/registrar-club-dialog.component';
import { ClubsService, Club } from '../../app/services/clubs.service';
import { HorariosService } from '../../app/services/horarios-clubes.service'; 

import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from '../../app/commonComponents/confirmDialog.component';
import { FormsModule } from '@angular/forms';
import { MatDivider } from "@angular/material/divider";
import { RegistrarHorarioDialogComponent } from './registrar-horario-dialog/registrar-horario-dialog.component';
import { HorariosDialogComponent } from './info-club-dialog/info-club-dialog.component';




@Component({
  selector: 'app-clubs',
  templateUrl: './clubs.component.html',
  styleUrls: ['./clubs.component.css'],
  imports: [
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    CommonModule,
    MatExpansionModule,
    MatDialogModule,
    FormsModule,
    MatDivider
  ],
  standalone: true
})
export class ClubsComponent implements OnInit {

  clubs: Club[] = [];
  editandoClubId: number | null = null;
  logoFile: File | null = null;
  logoPreview: string = '../../assets/images/placeholder.png';
  backupClub: Partial<Club> | null = null;

  constructor(
    private dialog: MatDialog,
    private clubsService: ClubsService,
    private snackBar: MatSnackBar,
    private horariosService: HorariosService,

  ) { }

  ngOnInit(): void {
    this.clubsService.getClubs().subscribe({
      next: (res: any) => {
        this.clubs = res.data;
      },
      error: (err) => {
        console.error('Error al cargar clubs', err);
      }
    });
  }

  abrirModalRegistrarClub() {
    const dialogRef = this.dialog.open(RegistrarClubDialogComponent, {
      width: '800px',
      maxWidth: '50vw',
      height: '800px',
      maxHeight: '70vh',
      panelClass: 'custom-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('✅ Club registrado exitosamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-success'],
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });

        this.clubsService.getClubs().subscribe({
          next: (res: any) => {
            this.clubs = res.data;
          },
          error: (err) => {
            console.error('Error al recargar clubs', err);
          }
        });
      }
    });
  }

  confirmarEliminarClub(club: Club) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '700px',
      data: {
        title: '¿Eliminar club?',
        message: `¿Estás seguro que deseas eliminar el club "${club.name}"?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.clubsService.deleteClub(club.id).subscribe({
          next: () => {
            this.snackBar.open('Club eliminado correctamente', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-success']
            });
            this.clubs = this.clubs.filter(c => c.id !== club.id);
          },
          error: () => {
            this.snackBar.open('Error al eliminar el club', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-error']
            });
          }
        });
      }
    });
  }

  editarClub(club: Club) {
    this.editandoClubId = club.id;
    this.backupClub = { ...club };
  }

  guardarClubEditado(club: Club) {
    this.clubsService.updateClub(club.id, club).subscribe({
      next: (res) => {
        this.editandoClubId = null;
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
  }

  onLogoSelected(event: Event, club: Club) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.snackBar.open('El archivo supera los 5MB', 'Cerrar', { duration: 3000, panelClass: ['snackbar-error'] });
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      club.logo = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    this.logoFile = file;
  }

  cancelarEdicion(club: Club) {
    if (this.backupClub) {
      Object.assign(club, this.backupClub);
    }
    this.editandoClubId = null;
    this.backupClub = null;
  }


  abrirModalRegistrarHorario(club: Club) {
    const dialogRef = this.dialog.open(RegistrarHorarioDialogComponent, {
      width: '600px',
      maxWidth: '50vw',
      height: '400px',
      maxHeight: '70vh',
      data: { clubId: club.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('✅ Horario registrado exitosamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-success'],
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });

      }
    });
  }


abrirModalHorarios(club: Club) {
  this.horariosService.getHorariosByClub(club.id).subscribe({
    next: (horarios) => {
      this.dialog.open(HorariosDialogComponent, {
        width: '600px',
        maxWidth: '60vw',
        data: { club, horarios }
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


}
