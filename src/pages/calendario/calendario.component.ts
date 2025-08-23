import { Component, ElementRef, AfterViewInit, ViewChild } from '@angular/core';
import { Calendar } from '@fullcalendar/core';
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
  @ViewChild('calendarContainer') calendarContainer!: ElementRef;

  ngAfterViewInit() {
    const calendar = new Calendar(this.calendarContainer.nativeElement, {
      plugins: [dayGridPlugin, interactionPlugin], 
      initialView: 'dayGridMonth',
      events: [
        { title: 'Evento 1', date: '2025-08-16' },
        { title: 'Evento 2', date: '2025-08-20' }
      ],
      height: 'auto',
      dateClick: (info) => {  
        const title = prompt('Ingrese el nombre del evento para ' + info.dateStr);
        if (title) {
          calendar.addEvent({
            title: title,
            start: info.dateStr,
            allDay: true
          });
        }
      }
    });

    calendar.render();
  }
}
