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
    MatProgressSpinnerModule
  ],
  standalone: true
})
export class CanchasComponent implements OnInit { 

  clubs: Club[] = [];
  selectedClubId: number | null = null;
  courts: Court[] = [];
  loading = false;
  error = '';

  constructor(
    private courtService: CourtService,
    private dialog: MatDialog
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
    this.dialog.open(RegistrarCanchaDialogComponent, {
      width: '800px',
      maxWidth: '50vw',
      height: 'auto',
      maxHeight: '70vh',
      panelClass: 'custom-dialog'
    });
  }
}