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
import { MatSelectModule } from "@angular/material/select";
import { Club, CourtService, CourtsResponse } from '../../app/services/court.service';
import { ReservationService, Reservation as ApiReservation, ReservationFilters } from '../../app/services/reservation.service';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconModule } from "@angular/material/icon";

interface Court { id: number; name: string; }
interface CalendarReservation {
  id: number;
  courtId: number;
  user: string;
  startMin: number;
  endMin: number;
  originalData?: ApiReservation;
}

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
    MatButtonModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'es' }
  ]
})
export class CalendarioComponent implements OnInit {
  warningMsg: string | null = null;
  selectedDate: Date = new Date();
  selectedClubId: number | null = null;
  selectedCourtId: number | null = null;
  loading = false;
  loadingReservations = false;
  error: string | null = null;
  clubs: Club[] = [];
  courtNameToIdMap: Map<string, number> = new Map();
  allReservations: ApiReservation[] = []; // Todas las reservaciones sin filtrar

  constructor(
    private dialog: MatDialog,
    private courtService: CourtService,
    private reservationService: ReservationService
  ) {
    registerLocaleData(localeEs);
  }

  @Input() courts: Court[] = [];
  @Input() initialReservations: CalendarReservation[] = [];

  // Config
  readonly dayStartMin = 6 * 60;
  readonly dayEndMin = 22 * 60;
  readonly snapMinutes = 30;
  readonly pxPerMin = 2;

  // Derivados
  times: { label: string; min: number }[] = [];
  reservations: CalendarReservation[] = [];

  @ViewChildren('courtColRef') courtCols!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('boardScrollRef') boardScroll!: QueryList<ElementRef<HTMLElement>>;

  // cache para drag
  private dragCache = new Map<number, { startTopPx: number; startLeftPx: number }>();

  ngOnInit(): void {
    this.times = this.buildTimeScale(this.dayStartMin, this.dayEndMin, this.snapMinutes);
    this.loadClubs();
    this.loadAllReservations(); // Cargar todas las reservaciones al iniciar
  }

  onDateChange(date: Date) {
    this.selectedDate = date;
    this.applyFilters(); // Aplicar filtros cuando cambia la fecha
  }

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

  onClubChange() {
    if (this.selectedClubId) {
      this.loadCourts();
    } else {
      this.courts = [];
      this.selectedCourtId = null;
      this.applyFilters();
    }
  }

  onCourtChange() {
    this.applyFilters();
  }

  isCourtColPast(): boolean {
    const now = new Date();
    const selected = new Date(this.selectedDate);
    selected.setHours(0, 0, 0, 0);
    if (selected < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      return true;
    }
    const isToday = now.toDateString() === selected.toDateString();
    if (isToday && (now.getHours() * 60 + now.getMinutes()) >= this.dayEndMin) {
      return true;
    }
    return false;
  }

  // ---- helpers de tiempo / formato ----
  private buildTimeScale(startMin: number, endMin: number, step: number) {
    const arr: { label: string; min: number }[] = [];

    // Generar slots hasta el final INCLUSIVE
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
  getReservationStyle(r: CalendarReservation) {
    const topPx = this.minutesToPx(r.startMin - this.dayStartMin);
    const heightPx = this.minutesToPx(r.endMin - r.startMin);
    return {
      top: `${topPx}px`,
      height: `${Math.max(24, heightPx)}px`,
    };
  }

  courtIndexById(courtId: number) {
    return this.courts.findIndex(c => c.id === courtId);
  }

  // ---- crear reserva clickeando en la columna ----
  onCourtClick(ev: MouseEvent, court: Court, colEl: HTMLElement) {
    ev.stopPropagation();

    const now = new Date();
    const selected = new Date(this.selectedDate);
    selected.setHours(0, 0, 0, 0);
    const isToday = now.toDateString() === selected.toDateString();

    const rect = colEl.getBoundingClientRect();
    const y = ev.clientY - rect.top;

    // Cálculo CORRECTO del minuto clickeado
    const minutesFromTop = y / this.pxPerMin;
    const slotIndex = Math.floor(minutesFromTop / this.snapMinutes);
    const clickedMin = this.dayStartMin + (slotIndex * this.snapMinutes);

    // Asegurarse de que esté dentro de los límites (CORRECCIÓN)
    const safeClickedMin = Math.max(this.dayStartMin, Math.min(clickedMin, this.dayEndMin - this.snapMinutes));

    // DEBUG: Verificar cálculos
    console.log('Click Y:', y, 'px');
    console.log('Minutes from top:', minutesFromTop);
    console.log('Slot index:', slotIndex);
    console.log('Clicked min:', clickedMin);
    console.log('Safe clicked min:', safeClickedMin);

    // ... resto del código sin cambios

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

    // CORRECCIÓN: Usar safeClickedMin directamente para el diálogo
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
        // 🔍 Log para ver qué datos se mandan al backend
        console.log("Payload que se enviará al backend:", result);

        this.reservationService.createReservation(result).subscribe({
          next: (response) => {
            console.log('✅ Reservación creada:', response);
            this.error = null;

            // Mostrar estado de WhatsApp
            if (response.whatsapp_status) {
              if (response.whatsapp_status === 'sent') {
                this.warningMsg = 'Mensaje de WhatsApp enviado correctamente.';
              } else if (response.whatsapp_status.startsWith('error')) {
                this.warningMsg = 'No se pudo enviar WhatsApp: ' + response.whatsapp_status.replace('error: ', '');
              }

              // Limpiar el mensaje después de 5 segundos
              setTimeout(() => { this.warningMsg = null; }, 5000);
            }

            // Opcional: refrescar la lista de reservaciones
            this.loadAllReservations();
          },
          error: (error) => {
            console.error('❌ Error creando reservación:', error);

            if (error.status === 422 && error.error?.errors) {
              const backendErrors = error.error.errors;
              let messages: string[] = [];
              for (const field in backendErrors) {
                if (backendErrors.hasOwnProperty(field)) {
                  messages.push(...backendErrors[field]);
                }
              }
              this.error = messages.join(', ');
              console.warn('Errores de validación:', this.error);
            } else if (error.error?.msg) {
              this.error = error.error.msg;
            } else {
              this.error = 'Error desconocido al crear la reservación';
            }

            // Mostrar detalles completos en consola para debug
            console.log('Detalles completos del error del backend:', error.error);
          }
        });

      }
    });

  }

  // ---- drag & drop ----
  onDragStarted(e: CdkDragStart, res: CalendarReservation, resEl: HTMLElement) {
    const rect = resEl.getBoundingClientRect();
    const colRect = (resEl.parentElement as HTMLElement).getBoundingClientRect();
    const startTopPx = rect.top - colRect.top + (resEl.parentElement as HTMLElement).scrollTop;
    const allColsContainer = (resEl.closest('.columns') as HTMLElement);
    const allRect = allColsContainer.getBoundingClientRect();
    const leftPx = rect.left - allRect.left + allColsContainer.scrollLeft;
    this.dragCache.set(res.id, { startTopPx, startLeftPx: leftPx });
  }

  onDragEnded(e: CdkDragEnd, res: CalendarReservation, resEl: HTMLElement) {
    const cached = this.dragCache.get(res.id);
    if (!cached) return;

    const allColsContainer = (resEl.closest('.columns') as HTMLElement);
    const colWidth = this.courtCols.first?.nativeElement.clientWidth ?? 0;

    const delta = e.distance;
    const newTopPx = cached.startTopPx + delta.y;
    const newLeftPx = cached.startLeftPx + delta.x;

    const currentIndex = this.courtIndexById(res.courtId);
    const movedCols = Math.round(delta.x / Math.max(1, colWidth));
    let newIndex = currentIndex + movedCols;

    newIndex = Math.max(0, Math.min(this.courts.length - 1, newIndex));
    const newCourtId = this.courts[newIndex].id;

    const newStartMinRaw = this.dayStartMin + Math.round((newTopPx / this.pxPerMin) / this.snapMinutes) * this.snapMinutes;
    const duration = res.endMin - res.startMin;
    let newStartMin = Math.max(this.dayStartMin, Math.min(newStartMinRaw, this.dayEndMin - duration));
    let newEndMin = newStartMin + duration;

    const updated = this.reservations.map(r => r.id === res.id ? { ...r, courtId: newCourtId, startMin: newStartMin, endMin: newEndMin } : r);
    this.reservations = updated;

    this.dragCache.delete(res.id);
    e.source.reset();
  }

  addMinutes(res: CalendarReservation, minutes: number) {
    const newEnd = Math.min(this.dayEndMin, res.endMin + minutes);
    if (newEnd > res.startMin) {
      this.reservations = this.reservations.map(r => r.id === res.id ? { ...r, endMin: newEnd } : r);
    }
  }

  subtractMinutes(res: CalendarReservation, minutes: number) {
    const newEnd = Math.max(res.startMin + this.snapMinutes, res.endMin - minutes);
    this.reservations = this.reservations.map(r => r.id === res.id ? { ...r, endMin: newEnd } : r);
  }

  // Determina si un slot específico es pasado
  isPastSlot(slotMin: number): boolean {
    const now = new Date();
    const selected = new Date(this.selectedDate);
    selected.setHours(0, 0, 0, 0);
    if (selected < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      return true;
    }
    const isToday = now.toDateString() === selected.toDateString();
    if (isToday && slotMin < (now.getHours() * 60 + now.getMinutes())) {
      return true;
    }
    return false;
  }

  // Verifica si un slot está reservado para una cancha y minuto dados
  isSlotReserved(courtId: number, slotMin: number): boolean {
    return this.reservations.some(res =>
      res.courtId === courtId &&
      res.startMin <= slotMin &&
      res.endMin > slotMin
    );
  }

  handleSlotClick(ev: MouseEvent, court: Court, slotMin: number) {
    if (this.isPastSlot(slotMin) || this.isSlotReserved(court.id, slotMin)) {
      return;
    }

    const targetElement = ev.currentTarget as HTMLElement;
    const courtColElement = targetElement.closest('.court-col') as HTMLElement;

    if (courtColElement) {
      this.onCourtClick(ev, court, courtColElement);
    }
  }

  // ---- Carga de datos ----
  loadClubs() {
    this.loading = true;
    this.courtService.getClubs().subscribe({
      next: (clubs) => {
        this.clubs = clubs;
        this.loading = false;
        if (clubs.length > 0 && !this.selectedClubId) {
          this.selectedClubId = clubs[0].id;
          this.loadCourts();
        }
      },
      error: (error) => {
        this.error = 'Error al cargar los clubs';
        this.loading = false;
        console.error(error);
      }
    });
  }

  loadCourts() {
    if (!this.selectedClubId) return;

    this.loading = true;
    this.courts = [];
    this.error = '';

    this.courtService.getCourtsByClub(this.selectedClubId).subscribe({
      next: (response: CourtsResponse) => {
        if (response && Array.isArray(response.data)) {
          this.courts = response.data;

          this.courtNameToIdMap.clear();
          this.courts.forEach(court => {
            this.courtNameToIdMap.set(court.name, court.id);
          });
        } else {
          this.courts = [];
        }

        this.loading = false;
        this.applyFilters();
      },
      error: (error) => {
        this.error = 'Error al cargar las canchas';
        this.loading = false;
        console.error(error);
      }
    });
  }

  loadAllReservations() {
    this.loadingReservations = true;

    this.reservationService.getReservations({}).subscribe({
      next: (response) => {
        if (response && Array.isArray(response.data)) {
          this.allReservations = response.data;
          console.log('Total reservaciones cargadas:', this.allReservations.length);
          this.applyFilters();
        } else {
          this.allReservations = [];
          console.warn('La respuesta no contiene data válida:', response);
        }
        this.loadingReservations = false;
      },
      error: (error) => {
        this.error = 'Error al cargar las reservaciones';
        this.allReservations = [];
        this.loadingReservations = false;
        console.error(error);
      }
    });
  }

  // ---- Filtrado en frontend ----
  applyFilters() {
    if (this.allReservations.length === 0) {
      this.reservations = [];
      return;
    }

    let filteredReservations = this.allReservations;

    // Filtrar por club
    if (this.selectedClubId) {
      const clubName = this.clubs.find(c => c.id === this.selectedClubId)?.name;
      if (clubName) {
        filteredReservations = filteredReservations.filter(res =>
          res.club === clubName
        );
      }
    }

    // Filtrar por cancha
    if (this.selectedCourtId) {
      const courtName = this.courts.find(c => c.id === this.selectedCourtId)?.name;
      if (courtName) {
        filteredReservations = filteredReservations.filter(res =>
          res.court === courtName
        );
      }
    }

    // Filtrar por fecha
    const selectedDateStr = this.formatDateForApi(this.selectedDate);
    filteredReservations = filteredReservations.filter(res =>
      res.date === selectedDateStr
    );

    console.log('Reservaciones filtradas:', filteredReservations.length);
    this.reservations = this.mapApiReservationsToCalendar(filteredReservations);
  }

  private mapApiReservationsToCalendar(apiReservations: ApiReservation[]): CalendarReservation[] {
    if (!apiReservations || !Array.isArray(apiReservations)) {
      return [];
    }

    const result: CalendarReservation[] = [];

    for (const apiRes of apiReservations) {
      try {
        const courtId = this.courtNameToIdMap.get(apiRes.court) || 0;
        const startMin = this.timeStringToMinutes(apiRes.start_time);
        const endMin = this.timeStringToMinutes(apiRes.end_time);

        if (courtId > 0 && !isNaN(startMin) && !isNaN(endMin)) {
          result.push({
            id: apiRes.reservationId,
            courtId: courtId,
            user: `${apiRes.user} ${apiRes.lastname}`.trim(),
            startMin: startMin,
            endMin: endMin,
            originalData: apiRes
          });
        }
      } catch (error) {
        console.error('Error procesando reservación:', apiRes, error);
      }
    }

    return result;
  }

  private timeStringToMinutes(timeString: string): number {
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      return hours * 60 + (minutes || 0);
    } catch (error) {
      console.error('Error convirtiendo tiempo:', timeString, error);
      return 0;
    }
  }

  private formatDateForApi(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getCourtReservationCount(courtId: number): number {
    return this.reservations.filter(res => res.courtId === courtId).length;
  }

  getStatusClass(reservation: any): string {
    const status = reservation.originalData?.status;
    if (!status) return 'status-default';

    switch (status.toLowerCase()) {
      case 'confirmed': return 'status-confirmed';
      case 'pending': return 'status-pending';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-default';
    }
  }

  getStatusText(reservation: any): string {
    return reservation.originalData?.status || '';
  }

  getTotalOccupationHours(): number {
    if (this.reservations.length === 0) return 0;

    const totalMinutes = this.reservations.reduce((total, res) => {
      return total + (res.endMin - res.startMin);
    }, 0);

    return Math.round(totalMinutes / 60 * 10) / 10; // Redondear a 1 decimal
  }

  getOccupationPercentage(): number {
    if (this.reservations.length === 0) return 0;

    const totalAvailableHours = (this.dayEndMin - this.dayStartMin) / 60 * this.courts.length;
    const occupiedHours = this.getTotalOccupationHours();

    return Math.round((occupiedHours / totalAvailableHours) * 100);
  }

  getTotalClients(): number {
    // Contar usuarios únicos
    const uniqueUsers = new Set(this.reservations.map(res => res.user));
    return uniqueUsers.size;
  }

  getAverageOccupation(): number {
    if (this.courts.length === 0) return 0;

    const totalHours = this.getTotalOccupationHours();
    return Math.round((totalHours / this.courts.length) * 10) / 10;
  }

  // Métodos para canchas específicas
  getCourtOccupationHours(courtId: number): number {
    const courtReservations = this.reservations.filter(res => res.courtId === courtId);
    if (courtReservations.length === 0) return 0;

    const totalMinutes = courtReservations.reduce((total, res) => {
      return total + (res.endMin - res.startMin);
    }, 0);

    return Math.round(totalMinutes / 60 * 10) / 10;
  }

  getCourtOccupationPercentage(courtId: number): number {
    const courtReservations = this.reservations.filter(res => res.courtId === courtId);
    if (courtReservations.length === 0) return 0;

    const totalAvailableHours = (this.dayEndMin - this.dayStartMin) / 60;
    const occupiedHours = this.getCourtOccupationHours(courtId);

    return Math.round((occupiedHours / totalAvailableHours) * 100);
  }

  getCourtClients(courtId: number): number {
    const courtReservations = this.reservations.filter(res => res.courtId === courtId);
    const uniqueUsers = new Set(courtReservations.map(res => res.user));
    return uniqueUsers.size;
  }

  getCourtName(courtId: number): string {
    const court = this.courts.find(c => c.id === courtId);
    return court ? court.name : '';
  }
}