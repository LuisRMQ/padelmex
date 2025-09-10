// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-reservaciones',
//   imports: [],
//   templateUrl: './reservaciones.component.html',
//   styleUrl: './reservaciones.component.css'
// })
// export class ReservacionesComponent {

// }
import { Component, Input, OnInit, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragEnd, CdkDragStart } from '@angular/cdk/drag-drop';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ScheduleDateDialogComponent } from '../calendario/schedule-date-dialog/schedule-date-dialog.component';

type Court = { id: number; name: string };
type Reservation = {
  id: number;
  courtId: number;
  user: string;
  startMin: number;
  endMin: number;
};

@Component({
  selector: 'app-reservaciones',
  standalone: true,
  templateUrl: './reservaciones.component.html',
  styleUrls: ['./reservaciones.component.css'],
  imports: [
    CommonModule,
    DragDropModule,
    MatDialogModule
  ]
})
export class ReservacionesComponent implements OnInit {

  constructor(private dialog: MatDialog) { }

  @Input() courts: Court[] = [
    { id: 1, name: 'Cancha 1' },
    { id: 2, name: 'Cancha 2' },
    { id: 3, name: 'Cancha 3' },
    { id: 4, name: 'Cancha 4' },
    { id: 5, name: 'Cancha 5' },
    { id: 6, name: 'Cancha 6' },
    { id: 7, name: 'Cancha 7' },
    { id: 8, name: 'Cancha 8' },
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
    ev.stopPropagation();

    const dialogRef = this.dialog.open(ScheduleDateDialogComponent, {
      data: {
        user: '',
        startTime: '08:00',
        endTime: '09:00',
        courtId: court.id
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const newId = (this.reservations.at(-1)?.id ?? 0) + 1;
        const startParts = result.startTime.split(':').map((x: string) => parseInt(x, 10));
        const endParts = result.endTime.split(':').map((x: string) => parseInt(x, 10));

        const startMin = startParts[0] * 60 + startParts[1];
        const endMin = endParts[0] * 60 + endParts[1];

        const newRes: Reservation = {
          id: newId,
          courtId: court.id,
          user: result.user || 'Nuevo',
          startMin,
          endMin
        };

        this.reservations = [...this.reservations, newRes];
      }
    });
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
    const movedCols = Math.round(delta.x / Math.max(1, colWidth));
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

    this.dragCache.delete(res.id);
    e.source.reset();
  }

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
