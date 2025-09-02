import { Component, ElementRef, AfterViewInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ScheduleDateDialogComponent } from './schedule-date-dialog/schedule-date-dialog.component';
import { Calendar } from '@fullcalendar/core';
import { MatTableDataSource } from '@angular/material/table';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction'; // <-- importante

@Component({
  selector: 'app-calendario',
  template: `
    <div class="calendar-wrapper">
      <div #calendarContainer class="calendar-container"></div>
    </div>
  `,
  styles: [`
    .calendar-wrapper {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 100px 20px 40px 20px; 
      width: 100%;
      min-height: calc(100vh - 100px);
      box-sizing: border-box;
      overflow-x: auto; 
    }

    .calendar-container {
      width: 100%;
      max-width: 1200px;
    }
  `]
})
export class CalendarioComponent implements AfterViewInit {
  // Datos de ejemplo para la tabla
  displayedColumns: string[] = ['fecha', 'hora', 'cancha', 'club', 'acciones'];
  dataSource = new MatTableDataSource([
    { fecha: '2025-09-01', hora: '10:00', cancha: 'Cancha 1', club: 'Club A' },
    { fecha: '2025-09-02', hora: '12:00', cancha: 'Cancha 2', club: 'Club B' },
    { fecha: '2025-09-03', hora: '14:00', cancha: 'Cancha 3', club: 'Club C' }
  ]);
  @ViewChild('calendarContainer') calendarContainer!: ElementRef;

  constructor(private dialog: MatDialog) {}

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
