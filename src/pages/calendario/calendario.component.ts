import { Component, ElementRef, AfterViewInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ScheduleDateDialogComponent } from './schedule-date-dialog/schedule-date-dialog.component';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';


@Component({
  selector: 'app-calendario',
  standalone: true,
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.css'],
  imports: [
    CommonModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule, 
    ScheduleDateDialogComponent
  ]
})
export class CalendarioComponent implements AfterViewInit {
  // Columnas de la tabla
  displayedColumns: string[] = ['fecha', 'hora', 'cancha', 'club', 'acciones'];
  dataSource = new MatTableDataSource([
    { fecha: '2025-09-01', hora: '10:00', cancha: 'Cancha 1', club: 'Club A' },
    { fecha: '2025-09-02', hora: '12:00', cancha: 'Cancha 2', club: 'Club B' },
    { fecha: '2025-09-03', hora: '14:00', cancha: 'Cancha 3', club: 'Club C' }
  ]);

  // Variables para mostrar mes/año
  mesActual: string;
  anioActual: number;

  @ViewChild('calendarContainer') calendarContainer!: ElementRef;

  constructor(private dialog: MatDialog) {
    const hoy = new Date();
    this.mesActual = hoy.toLocaleString('es-ES', { month: 'long' });
    this.anioActual = hoy.getFullYear();
  }

  ngAfterViewInit() {
    const calendar = new Calendar(this.calendarContainer.nativeElement, {
      plugins: [dayGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      events: [
        { title: 'Evento 1', date: '2025-08-16' },
        { title: 'Evento 2', date: '2025-08-20' }
      ],
      height: 400,
      contentHeight: 350,
      dateClick: (info) => {
        this.dialog.open(ScheduleDateDialogComponent, {
          data: { date: info.dateStr }
        });
      }
    });
    calendar.render();
  }
}
