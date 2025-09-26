import { Component, Input, OnInit, ViewChildren, QueryList, ElementRef, TemplateRef } from '@angular/core';
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
import { ReservationService, Reservation as ApiReservation, ReservationDetails } from '../../app/services/reservation.service';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from '@angular/material/tooltip';
import { ScheduleDetailsDialogComponent } from './schedule-details-dialog/schedule-details-dialog.component';
import { SettingsDialogComponent } from './settings-dialog/settings-dialog.component';

interface Court { id: number; name: string; }
interface CalendarReservation {
  id: number;
  courtId: number;
  user: string;
  startMin: number;
  endMin: number;
  originalData?: ApiReservation;
  details?: ReservationDetails;
}

interface Player {
  id: number; 
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
    MatIconModule,
    MatTooltipModule
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
  allReservations: ApiReservation[] = [];
  private hideTooltipTimeout: any = null;
  isTooltipHovered = false;

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
  readonly dayEndMin = 23 * 60;
  readonly snapMinutes = 30;
  readonly pxPerMin = 2;

  // Derivados
  times: { label: string; min: number }[] = [];
  reservations: CalendarReservation[] = [];

  @ViewChildren('courtColRef') courtCols!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('boardScrollRef') boardScroll!: QueryList<ElementRef<HTMLElement>>;
  //@ViewChildren('reservationTooltip') reservationTooltip!: TemplateRef<any>;
  currentReservation: CalendarReservation | null = null;
  tooltipPosition = { x: 0, y: 0 };
  isLoadingDetails = false;

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


  openSettingsDialog() {
    const dialogRef = this.dialog.open(SettingsDialogComponent, {
      width: '400px',
      data: {
        // Puedes pasar datos iniciales si quieres
        minReservationDuration: 30,
        cancellationLimitHours: 2,
        maxReservationsPerUser: 3
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Configuración guardada:', result);
        // Aquí puedes actualizar la configuración en tu componente o enviar a backend
      }
    });
  }

  // ---- helpers de tiempo / formato ----
  private buildTimeScale(startMin: number, endMin: number, step: number) {
    const arr: { label: string; min: number }[] = [];

    // Generar slots hasta el final INCLUSIVE
    for (let m = startMin; m < endMin; m += step) {
      arr.push({ label: this.formatTime(m), min: m });
    }

    return arr;
  }

  formatTime(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h >= 12 ? 'pm' : 'am';

    // CORRECCIÓN: Mostrar hora en formato 12h pero correctamente
    const displayHour = h % 12 || 12; // Convertir 0 → 12, 13 → 1, etc.
    const mm = m.toString().padStart(2, '0');

    return `${displayHour}:${mm} ${ampm}`;
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

  onCourtClick(ev: MouseEvent, court: Court, colEl: HTMLElement, slotMin?: number) {
    ev.stopPropagation();

    // Si ya tenemos el minuto del slot, usarlo directamente
    if (slotMin !== undefined) {
      this.handleSlotSelection(court, slotMin);
      return;
    }

    // Cálculo de respaldo por si acaso (cuando se hace click directamente en la columna)
    const now = new Date();
    const selected = new Date(this.selectedDate);
    selected.setHours(0, 0, 0, 0);
    const isToday = now.toDateString() === selected.toDateString();

    const rect = colEl.getBoundingClientRect();
    const y = ev.clientY - rect.top;

    // Cálculo simplificado y preciso
    const minutesFromTop = y / this.pxPerMin;
    const clickedMin = this.dayStartMin + minutesFromTop;

    // Redondear al slot de 30 minutos más cercano
    const roundedMin = Math.round(clickedMin / this.snapMinutes) * this.snapMinutes;
    const safeClickedMin = Math.max(
      this.dayStartMin,
      Math.min(roundedMin, this.dayEndMin - this.snapMinutes)
    );

    this.handleSlotSelection(court, safeClickedMin);
  }

  // Nuevo método para manejar la selección del slot
  private handleSlotSelection(court: Court, slotMin: number) {
    const now = new Date();
    const selected = new Date(this.selectedDate);
    selected.setHours(0, 0, 0, 0);
    const isToday = now.toDateString() === selected.toDateString();

    // Verificar si el slot es pasado
    if (
      (isToday && slotMin < (now.getHours() * 60 + now.getMinutes())) ||
      (selected < new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    ) {
      this.warningMsg = 'No puedes seleccionar un horario pasado.';
      setTimeout(() => { this.warningMsg = null; }, 3000);
      return;
    }

    this.warningMsg = null;

    // Preparar datos para el modal
    const pad = (n: number) => n.toString().padStart(2, '0');
    const startHour = Math.floor(slotMin / 60);
    const startMin = slotMin % 60;
    const endHour = Math.floor((slotMin + this.snapMinutes) / 60);
    const endMin = (slotMin + this.snapMinutes) % 60;

    const startTime24 = `${pad(startHour)}:${pad(startMin)}`;
    const endTime24 = `${pad(endHour)}:${pad(endMin)}`;

    console.log('Slot seleccionado:', this.formatTime(slotMin));
    console.log('Tiempo inicio:', startTime24);
    console.log('Tiempo fin:', endTime24);

    // Abrir modal de reservación
 const dialogRef = this.dialog.open(ScheduleDateDialogComponent, {
  data: {
    user: '',
    startTime: startTime24,
    endTime: endTime24,
    courtId: court.id,
    date: this.selectedDate,
    courtName: court.name
  },
  width: '600px',
  maxWidth: '95vw',
  maxHeight: '90vh',
  panelClass: 'custom-modal-panel',
  height: '90vh'
});

dialogRef.afterClosed().subscribe(result => {
  if (!result) return; // Canceló el modal
  console.log('Resultado del modal:', result);

  // **Usamos directamente el payload que envía el modal**
  // Para pruebas puedes usar los jugadores fijos dentro del modal
  const payload = result;

  console.log("Payload final que se enviará al backend:", payload);

  this.reservationService.createReservation(payload).subscribe({
    next: (response) => {
      console.log('✅ Reservación creada:', response);

      // Mapeo para mostrar en calendario
      const newRes: CalendarReservation = {
        id: response.reservation.id,
        courtId: payload.court_id,
        user: `Usuario ${payload.user_id}`,
        startMin: this.timeStringToMinutes(payload.start_time),
        endMin: this.timeStringToMinutes(payload.end_time),
        originalData: response.reservation
      };

      this.reservations = [...this.reservations, newRes];

      // Mensaje WhatsApp
      if (response.whatsapp_status) {
        if (response.whatsapp_status === 'sent') {
          this.warningMsg = 'Mensaje de WhatsApp enviado correctamente.';
        } else if (response.whatsapp_status.startsWith('error')) {
          this.warningMsg = 'No se pudo enviar WhatsApp: ' + response.whatsapp_status.replace('error: ', '');
        }
        setTimeout(() => { this.warningMsg = null; }, 5000);
      }

      this.loadAllReservations();
    },
    error: (error) => {
      console.error('❌ Error creando reservación:', error);
      if (error.status === 422 && error.error?.errors) {
        this.error = Object.values(error.error.errors).flat().join(', ');
      } else if (error.error?.msg) {
        this.error = error.error.msg;
      } else {
        this.error = 'Error desconocido: ' + (error.error?.message || error.message);
      }
      setTimeout(() => { this.error = null; }, 5000);
    }
  });
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

    const colWidth = this.courtCols.first?.nativeElement.clientWidth ?? 0;

    const delta = e.distance;
    const newTopPx = cached.startTopPx + delta.y;

    const currentIndex = this.courtIndexById(res.courtId);
    const movedCols = Math.round(delta.x / Math.max(1, colWidth));
    let newIndex = Math.max(0, Math.min(this.courts.length - 1, currentIndex + movedCols));
    const newCourtId = this.courts[newIndex].id;

    const newStartMinRaw = this.dayStartMin + Math.round((newTopPx / this.pxPerMin) / this.snapMinutes) * this.snapMinutes;
    const duration = res.endMin - res.startMin;
    let newStartMin = Math.max(this.dayStartMin, Math.min(newStartMinRaw, this.dayEndMin - duration));
    let newEndMin = newStartMin + duration;

    // Actualizar en memoria
    this.reservations = this.reservations.map(r =>
      r.id === res.id
        ? { ...r, courtId: newCourtId, startMin: newStartMin, endMin: newEndMin }
        : r
    );

    this.dragCache.delete(res.id);
    e.source.reset();

    const toHHMMSS = (mins: number): string => {
      const h = Math.floor(mins / 60).toString().padStart(2, '0');
      const m = (mins % 60).toString().padStart(2, '0');
      return `${h}:${m}:00`;
    };

    const payload = {
      user_id: res.originalData?.user_id,
      court_id: newCourtId,
      date: res.originalData?.date,
      start_time: toHHMMSS(newStartMin),
      end_time: toHHMMSS(newEndMin),
      observations: res.originalData?.observations ?? ''
    };

    this.reservationService.updateReservation(res.id, payload).subscribe({
      next: (resp) => console.log('Reserva actualizada:', resp),
      error: (err) => console.error('Error al actualizar reserva:', err)
    });
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

    // Encontrar el elemento court-col
    const targetElement = ev.currentTarget as HTMLElement;
    const courtColElement = targetElement.closest('.court-col') as HTMLElement;

    if (courtColElement) {
      // Llamar al método principal con el slotMin
      this.handleSlotSelection(court, slotMin);
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

  async showReservationDetails(reservation: CalendarReservation) {
    this.currentReservation = reservation;

    if (!reservation.details) {
      this.isLoadingDetails = true;
      try {
        const details = await this.reservationService.getReservationDetails(reservation.id).toPromise();
        reservation.details = details;
      } catch (error) {
        console.error('Error loading reservation details:', error);
      } finally {
        this.isLoadingDetails = false;
      }
    }
  }

  async onReservationClick(res: any) {
    console.log('Clicked reservation', res);
    await this.showReservationDetails(res);

    const dialogRef = this.dialog.open(ScheduleDetailsDialogComponent, {
      data: res,
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '96vh',
      panelClass: 'custom-modal-panel',
      height: '96vh'
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log("Dialog closed with result:", result);
      }
    });
  }
}