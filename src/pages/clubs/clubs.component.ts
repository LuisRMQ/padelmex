import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RegistrarClubDialogComponent } from './registrar-club-dialog/registrar-club-dialog.component';
import { ClubsService, Club } from '../../app/services/clubs.service';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule } from '@angular/material/dialog';

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
  ],
  standalone: true
})
export class ClubsComponent implements OnInit {

  clubs: Club[] = [];

  constructor(
    private dialog: MatDialog,
    private clubsService: ClubsService
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
    this.dialog.open(RegistrarClubDialogComponent, {
      width: '800px',
      maxWidth: '50vw',
      height: '800px',
      maxHeight: '70vh',
      panelClass: 'custom-dialog'
    });
  }
}
