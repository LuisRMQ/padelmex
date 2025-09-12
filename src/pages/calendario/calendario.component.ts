import { Component, Input, OnInit, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragEnd, CdkDragStart } from '@angular/cdk/drag-drop';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ScheduleDateDialogComponent } from './schedule-date-dialog/schedule-date-dialog.component';
import { MatDividerModule } from "@angular/material/divider";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { FormsModule } from "@angular/forms";
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';


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
  DragDropModule,
  MatDialogModule,
  MatDividerModule,
  MatDatepickerModule,
  MatFormFieldModule,
  MatInputModule,
  FormsModule,
  MatButtonModule
],
  providers: [
    { provide: LOCALE_ID, useValue: 'es' }
  ]
})

export class CalendarioComponent implements OnInit {
  isCourtColPast(): boolean {
    // Si la fecha seleccionada es pasada, toda la columna es pasada
    const now = new Date();
    const selected = new Date(this.selectedDate);
    selected.setHours(0, 0, 0, 0);
    if (selected < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      return true;
    }
    // Si es hoy y la hora actual es mayor o igual al último slot
    const isToday = now.toDateString() === selected.toDateString();
    if (isToday && (now.getHours() * 60 + now.getMinutes()) >= this.dayEndMin) {
      return true;
    }
    return false;
  }
  warningMsg: string | null = null;

  setToYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    this.onDateChange(d);
  }

  setToToday() {
    const d = new Date();
    this.onDateChange(d);
  }

  setToTomorrow() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    this.onDateChange(d);
  }

  selectedDate: Date = new Date();

  constructor(private dialog: MatDialog) {
    registerLocaleData(localeEs);
  }

  @Input() courts: Court[] = [
    { id: 1, name: 'Cancha 1' },
    { id: 2, name: 'Cancha 2' },
    { id: 3, name: 'Cancha 3' },
    { id: 4, name: 'Cancha 4' },
    { id: 5, name: 'Cancha 5' },
    { id: 6, name: 'Cancha 6' },
    { id: 7, name: 'Cancha 7' },
    { id: 8, name: 'Cancha 8' },
    { id: 9, name: 'Cancha 9' },
    { id: 10, name: 'Cancha 10' },
  ];

  @Input() initialReservations: Reservation[] = [
    { id: 1, courtId: 1, user: 'Usuario 1', startMin: 8 * 60, endMin: 9 * 60 + 30 },
    { id: 2, courtId: 2, user: 'Usuario 2', startMin: 10 * 60, endMin: 11 * 60 },
    { id: 3, courtId: 1, user: 'Usuario 3', startMin: 13 * 60 + 30, endMin: 15 * 60 },
  ];

  // Config
  readonly dayStartMin = 6 * 60;
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

  onDateChange(date: Date) {
    this.selectedDate = date;
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

    // Obtener la hora actual y la fecha seleccionada
    const now = new Date();
    const selected = new Date(this.selectedDate);
    selected.setHours(0, 0, 0, 0);
    const isToday = now.toDateString() === selected.toDateString();

  // Calcular el slot clickeado (sin desfase)
  const rect = colEl.getBoundingClientRect();
  const y = ev.clientY - rect.top;
  // El slot debe ser el más cercano hacia abajo (floor), pero si el click cae justo en el borde superior, debe ser ese slot
  const clickedMin = this.dayStartMin + Math.floor(y / (this.pxPerMin * this.snapMinutes)) * this.snapMinutes;
  const safeClickedMin = Math.max(this.dayStartMin, Math.min(clickedMin, this.dayEndMin - this.snapMinutes)) - 30;
  console.log('Clicked min:', safeClickedMin);

    // Si es hoy y el slot es anterior a la hora actual, mostrar warning
    if (
      (isToday && safeClickedMin < (now.getHours() * 60 + now.getMinutes())) ||
      (selected < new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    ) {
      this.warningMsg = 'No puedes seleccionar un horario pasado.';
      setTimeout(() => { this.warningMsg = null; }, 3000);
      return;
    }

    this.warningMsg = null;
    // Formato HH:mm para dropdown, usando safeClickedMin
    const pad = (n: number) => n.toString().padStart(2, '0');
    const startHour = Math.floor(safeClickedMin / 60);
    const startMin = safeClickedMin % 60;
    const endHour = Math.floor((safeClickedMin + this.snapMinutes) / 60);
    const endMin = (safeClickedMin + this.snapMinutes) % 60;
    const startTime24 = `${pad(startHour)}:${pad(startMin)}`;
    const endTime24 = `${pad(endHour)}:${pad(endMin)}`;
    const dialogRef = this.dialog.open(ScheduleDateDialogComponent, {
      data: {
        user: '',
        startTime: startTime24,
        endTime: endTime24,
        courtId: court.id
      },
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'custom-modal-panel',
      height: '85vh'
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
