import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatStepperModule } from '@angular/material/stepper';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Observable, map, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { MatIconModule } from "@angular/material/icon";
import { UsersService, User } from '../../../app/services/users.service';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfigService, Category } from '../../../app/services/config.service';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { HorariosServiceCancha, HorarioCancha } from '../../../app/services/horarios-canchas.service';
import { CourtService } from '../../../app/services/court.service';
import { AlertService } from '../../../app/services/alert.service';

export interface DialogData {
  user: string;
  startTime: string;
  endTime: string;
  courtId: number;
  date: string | Date;
  clubId?: number;
  courtName?: string;
  price_hour?: number;
  commission?: number;
}

@Component({
  selector: 'app-schedule-date-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatStepperModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatIconModule,
    MatCheckboxModule
  ],
  templateUrl: './schedule-date-dialog.component.html',
  styleUrls: ['./schedule-date-dialog.component.css']
})
export class ScheduleDateDialogComponent implements OnInit {
  reservationForm: FormGroup;
  horas: string[] = [];
  metodosPago = [
    { value: 'single_payment', label: 'Pago único' },
    { value: 'split_payment', label: 'Pago dividido' }
  ];

  userControl = new FormControl<string | User>('');
  filteredUsers: Observable<User[]>;
  selectedUser: User | null = null;
  isLoadingUsers = false;

  playersControl = new FormControl<string | User>('');
  filteredPlayers: Observable<User[]>;
  selectedPlayers: User[] = [];
  isLoadingPlayers = false;

  selectedDate: Date;
  minReservationTime = 60;

  categories: Category[] = [];
  defaultAvatar = '../../../assets/images/iconuser.png';

  horariosCancha: HorarioCancha[] = [];
  precioPorHoraActual = 0;

  constructor(
    public dialogRef: MatDialogRef<ScheduleDateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private fb: FormBuilder,
    private usersService: UsersService,
    private snackBar: MatSnackBar,
    private configService: ConfigService,
    private horariosService: HorariosServiceCancha,
    private courtService: CourtService,
    private alert: AlertService
  ) {
    this.selectedDate = this.convertToDate(data.date);
    const defaultEndTime = this.getDefaultEndTime(data.startTime, this.minReservationTime);

    this.reservationForm = this.fb.group({
      user_id: ['', Validators.required],
      court_id: [data.courtId, Validators.required],
      reservation_type_id: ['', Validators.required],
      date: [this.formatDateForApi(this.selectedDate), Validators.required],
      start_time: [data.startTime, Validators.required],
      end_time: [defaultEndTime, Validators.required],
      pay_method: ['single_payment', Validators.required],
      observations: [''],
      type: ['private', Validators.required],
      category_id: ['', Validators.required],
    });

    this.filteredUsers = this.userControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        const searchTerm = typeof value === 'string' ? value : '';
        return this.searchUsers(searchTerm);
      }),
      catchError(() => of([]))
    );

    this.filteredPlayers = this.playersControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        const searchTerm = typeof value === 'string' ? value : '';
        return this.searchPlayers(searchTerm);
      }),
      catchError(() => of([]))
    );
  }

  ngOnInit(): void {
    this.generarHoras();

    // Cargar categorías
    this.configService.getCategories().subscribe(categories => this.categories = categories);

    // 🔹 Cargar horarios por cancha y día
    const dayName = this.getNombreDia(this.selectedDate);
    this.horariosService.getHorariosByCourt(this.data.clubId!, this.data.courtId).subscribe({
      next: (horarios) => {
        this.horariosCancha = horarios.filter(h => h.day === dayName);

        // 🔹 Cargar comisión desde CourtService
        this.courtService.getCourtsByClub(this.data.clubId!).subscribe({
          next: (res) => {
            const court = res.data.find(c => c.id === this.data.courtId);
            if (court) {
              // Convertimos a number aquí
              this.data.commission = typeof court.commission === 'string' ? parseFloat(court.commission) : court.commission;
              this.data.price_hour = court.price_hour; // si quieres también precio
            }
          },
          error: (err) => console.error(err)
        });

      },
      error: (err) => console.error('Error al cargar horarios:', err)
    });

    // Validar duración mínima
    this.reservationForm.get('end_time')?.valueChanges.subscribe(endTime => {
      const startTime = this.reservationForm.get('start_time')?.value;
      if (startTime && endTime) {
        const duration = this.getMinutesDiff(startTime, endTime);
        if (duration < this.minReservationTime) {
          this.alert.info(`La duración mínima de la reservación es de ${this.minReservationTime / 60} hora(s).`);

          this.reservationForm.get('end_time')?.setValue('');
        }
      }
    });

    // Recalcular total al cambiar hora
    this.reservationForm.get('start_time')?.valueChanges.subscribe(() => this.getTotalAPagar());
    this.reservationForm.get('end_time')?.valueChanges.subscribe(() => this.getTotalAPagar());
  }

  // ------------------- MÉTODOS DE DESGLOSE -------------------
  getTotalHoras(): number {
    const start = this.reservationForm.value.start_time;
    const end = this.reservationForm.value.end_time;
    if (!start || !end) return 0;

    const horario = this.horariosCancha.find(h => {
      const startH = h.start_time.slice(0, 5);
      const endH = h.end_time.slice(0, 5);
      return start >= startH && end <= endH;
    });

    const price = horario ? parseFloat(String(horario.price_hour ?? '0')) : 0;
    this.precioPorHoraActual = price;

    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const durationHours = (endH * 60 + endM - (startH * 60 + startM)) / 60;

    return Math.max(0, durationHours * price);
  }

  getComisionCancha(): number {
    return parseFloat(String(this.data.commission ?? '0'));
  }

  getTotalAPagar(): number {
    return this.getTotalHoras() + this.getComisionCancha();
  }
  // ------------------------------------------------------------

  getNombreDia(fecha: Date): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[fecha.getDay()];
  }

  getMinutesDiff(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }

   private searchUsers(searchTerm: string): Observable<User[]> {
    if (searchTerm.length < 2) return of([]);
    this.isLoadingUsers = true;
    const normalizedTerm = searchTerm.toLowerCase();
    return this.usersService.searchAllUsers('').pipe(
      map(users => {
        this.isLoadingUsers = false;
        return users.filter(u =>
          (`${u.name} ${u.lastname}`.toLowerCase().includes(normalizedTerm) ||
          (u.email && u.email.toLowerCase().includes(normalizedTerm)))
        );
      }),
      catchError(() => { this.isLoadingUsers = false; return of([]); })
    );
  }

   private searchPlayers(searchTerm: string): Observable<User[]> {
    if (searchTerm.length < 2) return of([]);
    this.isLoadingPlayers = true;
    const normalizedTerm = searchTerm.toLowerCase();
    return this.usersService.searchAllUsers('').pipe(
      map(users => {
        this.isLoadingPlayers = false;
        const ownerId = this.reservationForm.value.user_id;
        return users.filter(u =>
          u.id !== ownerId &&
          (
            (`${u.name} ${u.lastname}`.toLowerCase().includes(normalizedTerm)) ||
            (u.email && u.email.toLowerCase().includes(normalizedTerm))
          )
        );
      }),
      catchError(() => { this.isLoadingPlayers = false; return of([]); })
    );
  }

  displayFn(user: User): string {
    return user && user.name ? `${user.name} ${user.lastname}` : '';
  }

  onImageError(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = this.defaultAvatar;
  }

  onUserSelected(user: User): void {
    this.selectedUser = user;
    this.reservationForm.patchValue({ user_id: user.id });
  }

  getDefaultEndTime(start: string, minMinutes: number): string {
    const [sh, sm] = start.split(':').map(Number);
    const totalMinutes = sh * 60 + sm + minMinutes;
    const eh = Math.floor(totalMinutes / 60);
    const em = totalMinutes % 60;
    return `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
  }

  addPlayer(user: User): void {
    if (this.selectedPlayers.length >= 3) {
      this.alert.info('No puedes agregar más de 3 jugadores adicionales.');

      this.playersControl.setValue('');
      return;
    }
    if (!this.selectedPlayers.find(p => p.id === user.id)) this.selectedPlayers = [...this.selectedPlayers, user];
    this.playersControl.setValue('');
  }

  setPaidByOwner(index: number, checked: boolean) {
    this.selectedPlayers[index] = { ...this.selectedPlayers[index], paid_by_owner: checked };
  }

  removePlayer(index: number): void { this.selectedPlayers.splice(index, 1); }

  onSubmit(): void {
  if (!this.reservationForm.valid) return;

  const mainPlayer = this.userControl.value;
  if (!mainPlayer || typeof mainPlayer !== 'object' || !mainPlayer.id) {
    this.alert.info('Selecciona el jugador principal antes de continuar.');
    return;
  }

  const ownerId = this.reservationForm.value.user_id;

  // 🔹 Datos base
  const payload: any = {
    user_id: ownerId,
    court_id: this.reservationForm.value.court_id,
    reservation_type_id: this.reservationForm.value.reservation_type_id,
    date: this.formatDateForApi(this.selectedDate),
    start_time: this.formatTimeForApi(this.reservationForm.value.start_time),
    end_time: this.formatTimeForApi(this.reservationForm.value.end_time),
    pay_method: this.reservationForm.value.pay_method,
    observations: this.reservationForm.value.observations,
    type: this.reservationForm.value.type,
    category_id: this.reservationForm.value.category_id,
    players: []
  };

  // 🔹 Agregamos el jugador que reserva solo si hay espacio
  const maxPlayers = 3; // máximo permitido
  let currentPlayersCount = 0;

  if (this.reservationForm.value.pay_method === 'split_payment') {
    const additionalPlayers = this.selectedPlayers
      .filter(p => p.id !== ownerId)
      .map((p, index) => ({
        user_id: p.id,
        player_number: index + 2,
        paid_by_owner: p.paid_by_owner || false
      }));

    payload.players.push(...additionalPlayers);
    currentPlayersCount = payload.players.length;
  }

  // Si aún hay espacio, agregamos al que reserva
  if (currentPlayersCount < maxPlayers) {
    payload.players.unshift({
      user_id: ownerId,
      player_number: 1,
      paid_by_owner:  this.reservationForm.value.pay_method !== 'single_payment'
    });
  }

  console.log('JSON payload que se enviará:', JSON.stringify(payload, null, 2));
  this.dialogRef.close(payload);
}


  private convertToDate(dateValue: string | Date): Date {
    if (dateValue instanceof Date) return dateValue;
    const parsed = Date.parse(dateValue as string);
    return isNaN(parsed) ? new Date() : new Date(parsed);
  }

  private formatDateForApi(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private formatTimeForApi(time: string): string {
    if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time;
    if (/^\d{2}:\d{2}$/.test(time)) return `${time}:00`;
    return time;
  }

  generarHoras(): void {
    this.horas = [];
    for (let h = 6; h <= 23; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 23 && m > 30) break;
        this.horas.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
  }

  onDateChange(event: any): void {
    const selectedDate = event.value;
    if (selectedDate) this.reservationForm.patchValue({ date: this.formatDateForApi(selectedDate) });
  }

  onCancel(): void { this.dialogRef.close(); }

  getMetodoPagoLabel(value: string): string {
    const found = this.metodosPago.find(m => m.value === value);
    return found ? found.label : '';
  }

  hasValidSearchTerm(): boolean {
    const value = this.userControl.value;
    return typeof value === 'string' && value.length >= 2;
  }

  hasValidSearchTermPlayers(): boolean {
    const value = this.playersControl.value;
    return typeof value === 'string' && value.length >= 2;
  }
}
