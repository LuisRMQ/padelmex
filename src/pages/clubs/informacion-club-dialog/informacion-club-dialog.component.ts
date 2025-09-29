import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from "@angular/material/icon";
import { CommonModule } from '@angular/common';
import { UsersService } from '../../../app/services/users.service';
import { CourtService } from '../../../app/services/court.service';

@Component({
  selector: 'app-informacion-club-dialog',
  imports: [MatIconModule, CommonModule],
  templateUrl: './informacion-club-dialog.component.html',
  styleUrl: './informacion-club-dialog.component.css'
})
export class InformacionClubDialogComponent {
  usuariosCount: number = 0;
  courtsCount: number = 0;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { club: any },
    private usuariosService: UsersService,
    private courtService: CourtService) {

    this.cargarUsuarios();
    this.cargarCanchas();

  }

  cargarUsuarios() {
    this.usuariosService.searchUsersResponse('', this.data.club.id).subscribe({
      next: (resp) => {
        this.usuariosCount = resp.total;
      },
      error: () => {
        this.usuariosCount = 0;
      }
    });
  }

  cargarCanchas() {
    this.courtService.getCourtsByClub(this.data.club.id).subscribe({
      next: (resp) => {
        this.courtsCount = resp.total;
      },
      error: () => {
        this.courtsCount = 0;
      }
    });
  }

}
