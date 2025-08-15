import { Component } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { RegistrarClubDialogComponent } from './registrar-club-dialog/registrar-club-dialog.component';

import { CommonModule } from '@angular/common';
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
export class ClubsComponent {

  constructor(private dialog: MatDialog) { }

  abrirModalRegistrarClub() {
    this.dialog.open(RegistrarClubDialogComponent, {
      width: '800px',
      maxWidth: '50vw',
      height: 'auto',
      maxHeight: '70vh',
      panelClass: 'custom-dialog'
    });
  }



}