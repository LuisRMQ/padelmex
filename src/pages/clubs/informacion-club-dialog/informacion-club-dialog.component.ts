import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from "@angular/material/icon";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-informacion-club-dialog',
  imports: [MatIconModule, CommonModule],
  templateUrl: './informacion-club-dialog.component.html',
  styleUrl: './informacion-club-dialog.component.css'
})
export class InformacionClubDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { club: any }) {}
}
