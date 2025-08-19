import { Component, ElementRef, AfterViewInit, ViewChild } from '@angular/core';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';

@Component({
  selector: 'app-calendario',
  template: `
    <div #calendarContainer class="calendar-container"></div>
  `,
  styles: [`
    .calendar-container {
      margin-top: 20px;
      height: 600px; /* ajusta esto */
      width: 90%;
    }
  `]
})
export class CalendarioComponent implements AfterViewInit {
  @ViewChild('calendarContainer') calendarContainer!: ElementRef;

  ngAfterViewInit() {
    const calendar = new Calendar(this.calendarContainer.nativeElement, {
      plugins: [dayGridPlugin],
      initialView: 'dayGridMonth',
      events: [
        { title: 'Evento 1', date: '2025-08-16' },
        { title: 'Evento 2', date: '2025-08-20' }
      ],
      height: '100%' // Importante
    });
    
    calendar.render();
  }
}