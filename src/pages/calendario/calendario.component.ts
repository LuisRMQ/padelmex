// import { Component, ElementRef, AfterViewInit, ViewChild } from '@angular/core';
// import { MatDialog } from '@angular/material/dialog';
// import { ScheduleDateDialogComponent } from './schedule-date-dialog/schedule-date-dialog.component';
// import { MatTableDataSource, MatTableModule } from '@angular/material/table';
// import { MatFormFieldModule } from '@angular/material/form-field';
// import { MatSelectModule } from '@angular/material/select';
// import { MatCardModule } from '@angular/material/card';
// import { MatIconModule } from '@angular/material/icon';
// import { MatButtonModule } from '@angular/material/button';
// import { CommonModule } from '@angular/common';

// import { Calendar } from '@fullcalendar/core';
// import dayGridPlugin from '@fullcalendar/daygrid';
// import interactionPlugin from '@fullcalendar/interaction';


// @Component({
//   selector: 'app-calendario',
//   standalone: true,
//   templateUrl: './calendario.component.html',
//   styleUrls: ['./calendario.component.css'],
//   imports: [
//     CommonModule,
//     MatTableModule,
//     MatFormFieldModule,
//     MatSelectModule,
//     MatCardModule,
//     MatIconModule,
//     MatButtonModule, 

//   ]
// })
// export class CalendarioComponent implements AfterViewInit {
//   // Columnas de la tabla
//   displayedColumns: string[] = ['fecha', 'hora', 'cancha', 'club', 'acciones'];
//   dataSource = new MatTableDataSource([
//     { fecha: '2025-09-01', hora: '10:00', cancha: 'Cancha 1', club: 'Club A' },
//     { fecha: '2025-09-02', hora: '12:00', cancha: 'Cancha 2', club: 'Club B' },
//     { fecha: '2025-09-03', hora: '14:00', cancha: 'Cancha 3', club: 'Club C' }
//   ]);

//   // Variables para mostrar mes/año
//   mesActual: string;
//   anioActual: number;

//   @ViewChild('calendarContainer') calendarContainer!: ElementRef;

//   constructor(private dialog: MatDialog) {
//     const hoy = new Date();
//     this.mesActual = hoy.toLocaleString('es-ES', { month: 'long' });
//     this.anioActual = hoy.getFullYear();
//   }

//   ngAfterViewInit() {
//     const calendar = new Calendar(this.calendarContainer.nativeElement, {
//       plugins: [dayGridPlugin, interactionPlugin],
//       initialView: 'dayGridMonth',
//       events: [
//         { title: 'Evento 1', date: '2025-08-16' },
//         { title: 'Evento 2', date: '2025-08-20' }
//       ],
//       height: 400,
//       contentHeight: 350,
//       dateClick: (info) => {
//         this.dialog.open(ScheduleDateDialogComponent, {
//           data: { date: info.dateStr }
//         });
//       }
//     });
//     calendar.render();
//   }
// }

import { Component, Input, OnInit, ViewChildren, QueryList, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragEnd, CdkDragStart } from '@angular/cdk/drag-drop';

type Court = { id: number; name: string };
type Reservation = {
  id: number;
  courtId: number;
  user: string;
  startMin: number;
  endMin: number; 
};

@Component({
  selector: 'app-calendario',
  standalone: true,
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.css'],
  imports: [
    CommonModule,
    DragDropModule
  ]
})
export class CalendarioComponent implements OnInit {

  @Input() courts: Court[] = [
    { id: 1, name: 'Cancha 1' },
    { id: 2, name: 'Cancha 2' },
    { id: 3, name: 'Cancha 3' },
    { id: 4, name: 'Cancha 4' },
  ];

  @Input() initialReservations: Reservation[] = [
    { id: 1, courtId: 1, user: 'Usuario 1', startMin: 8 * 60, endMin: 9 * 60 + 30 }, 
    { id: 2, courtId: 2, user: 'Usuario 2', startMin: 10 * 60, endMin: 11 * 60 }, 
    { id: 3, courtId: 1, user: 'Usuario 3', startMin: 13 * 60 + 30, endMin: 15 * 60 },
  ];

  // Config
  readonly dayStartMin = 8 * 60; 
  readonly dayEndMin = 22 * 60;
  readonly snapMinutes = 30; 
  readonly pxPerMin = 2; 

  // Derivados
  times: { label: string; min: number }[] = [];
  reservations: Reservation[] = [];

  @ViewChildren('courtColRef') courtCols!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('boardScrollRef') boardScroll!: QueryList<ElementRef<HTMLElement>>;

  // cache para drag
  private dragCache = new Map<number, { startTopPx: number; startLeftPx: number }>();

  ngOnInit(): void {
    this.reservations = [...this.initialReservations];
    this.times = this.buildTimeScale(this.dayStartMin, this.dayEndMin, this.snapMinutes);
  }

  // ---- helpers de tiempo / formato ----
  private buildTimeScale(startMin: number, endMin: number, step: number) {
    const arr: { label: string; min: number }[] = [];
    for (let m = startMin; m <= endMin; m += step) {
      arr.push({ label: this.formatTime(m), min: m });
    }
    return arr;
  }

  formatTime(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h >= 12 ? 'pm' : 'am';
    const hh = ((h + 11) % 12) + 1;
    const mm = m.toString().padStart(2, '0');
    return `${hh}:${mm} ${ampm}`;
  }

  minutesToPx(mins: number): number {
    return mins * this.pxPerMin;
  }

  // ---- posicionamiento de reservas ----
  getReservationStyle(r: Reservation) {
    const topPx = this.minutesToPx(r.startMin - this.dayStartMin);
    const heightPx = this.minutesToPx(r.endMin - r.startMin);
    return {
      top: `${topPx}px`,
      height: `${Math.max(24, heightPx)}px`, // mínimo alto visible
    };
  }

  courtIndexById(courtId: number) {
    return this.courts.findIndex(c => c.id === courtId);
  }

  // ---- crear reserva clickeando en la columna ----
  onCourtClick(ev: MouseEvent, court: Court, colEl: HTMLElement) {
    const rect = colEl.getBoundingClientRect();
    const y = ev.clientY - rect.top + colEl.scrollTop;
    const clickedMin = this.dayStartMin + Math.round((y / this.pxPerMin) / this.snapMinutes) * this.snapMinutes;

    const defaultDuration = 60; // 1h
    const startMin = Math.max(this.dayStartMin, Math.min(clickedMin, this.dayEndMin - defaultDuration));
    const endMin = Math.min(this.dayEndMin, startMin + defaultDuration);

    const newId = (this.reservations.at(-1)?.id ?? 0) + 1;
    const newRes: Reservation = {
      id: newId,
      courtId: court.id,
      user: `Nuevo`,
      startMin,
      endMin,
    };
    this.reservations = [...this.reservations, newRes];
  }

  // ---- drag & drop ----
  onDragStarted(e: CdkDragStart, res: Reservation, resEl: HTMLElement) {
    const rect = resEl.getBoundingClientRect();
    const colRect = (resEl.parentElement as HTMLElement).getBoundingClientRect();
    // top relativo a la columna, left relativo al contenedor de columnas
    const startTopPx = rect.top - colRect.top + (resEl.parentElement as HTMLElement).scrollTop;
    const allColsContainer = (resEl.closest('.columns') as HTMLElement);
    const allRect = allColsContainer.getBoundingClientRect();
    const leftPx = rect.left - allRect.left + allColsContainer.scrollLeft;
    this.dragCache.set(res.id, { startTopPx, startLeftPx: leftPx });
  }

  onDragEnded(e: CdkDragEnd, res: Reservation, resEl: HTMLElement) {
    const cached = this.dragCache.get(res.id);
    if (!cached) return;

    const allColsContainer = (resEl.closest('.columns') as HTMLElement);
    const colWidth = this.courtCols.first?.nativeElement.clientWidth ?? 0;

    const delta = e.distance; // {x,y} respecto al inicio del drag
    const newTopPx = cached.startTopPx + delta.y;
    const newLeftPx = cached.startLeftPx + delta.x;

    // Calcular nueva cancha por desplazamiento horizontal
    const currentIndex = this.courtIndexById(res.courtId);
    const movedCols = Math.round(newLeftPx / Math.max(1, colWidth));
    let newIndex = currentIndex + movedCols;

    newIndex = Math.max(0, Math.min(this.courts.length - 1, newIndex));
    const newCourtId = this.courts[newIndex].id;

    // Calcular nueva hora por desplazamiento vertical (snap)
    const newStartMinRaw = this.dayStartMin + Math.round((newTopPx / this.pxPerMin) / this.snapMinutes) * this.snapMinutes;
    const duration = res.endMin - res.startMin;
    let newStartMin = Math.max(this.dayStartMin, Math.min(newStartMinRaw, this.dayEndMin - duration));
    let newEndMin = newStartMin + duration;

    // Actualizar el objeto (inmutable para disparar change detection)
    const updated = this.reservations.map(r => r.id === res.id ? { ...r, courtId: newCourtId, startMin: newStartMin, endMin: newEndMin } : r);
    this.reservations = updated;

    // limpiar
    this.dragCache.delete(res.id);
    // reset visual del drag
    e.source.reset();
  }

  // (Opcional) cambiar duración con botones
  addMinutes(res: Reservation, minutes: number) {
    const newEnd = Math.min(this.dayEndMin, res.endMin + minutes);
    if (newEnd > res.startMin) {
      this.reservations = this.reservations.map(r => r.id === res.id ? { ...r, endMin: newEnd } : r);
    }
  }

  subtractMinutes(res: Reservation, minutes: number) {
    const newEnd = Math.max(res.startMin + this.snapMinutes, res.endMin - minutes);
    this.reservations = this.reservations.map(r => r.id === res.id ? { ...r, endMin: newEnd } : r);
  }
}
