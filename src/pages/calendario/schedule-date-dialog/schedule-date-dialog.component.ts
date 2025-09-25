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

export interface DialogData {
  user: string;
  startTime: string;
  endTime: string;
  courtId: number;
  date: string | Date;
  clubId?: number;
  courtName?: string;
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
    MatIconModule
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

  constructor(
    public dialogRef: MatDialogRef<ScheduleDateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private fb: FormBuilder,
    private usersService: UsersService
  ) {
    this.selectedDate = this.convertToDate(data.date);

    this.reservationForm = this.fb.group({
      user_id: ['', Validators.required],
      court_id: [data.courtId, Validators.required],
      reservation_type_id: ['2', Validators.required],
      date: [this.formatDateForApi(this.selectedDate), Validators.required],
      start_time: [data.startTime, Validators.required],
      end_time: [data.endTime, Validators.required],
      pay_method: ['single_payment', Validators.required],
      observations: ['']
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
  }

  private searchUsers(searchTerm: string): Observable<User[]> {
    if (searchTerm.length < 2) return of([]);
    this.isLoadingUsers = true;
    return this.usersService.searchUsers(searchTerm, this.data.clubId).pipe(
      map(users => { this.isLoadingUsers = false; return users; }),
      catchError(() => { this.isLoadingUsers = false; return of([]); })
    );
  }

  private searchPlayers(searchTerm: string): Observable<User[]> {
    if (searchTerm.length < 2) return of([]);
    this.isLoadingPlayers = true;
    return this.usersService.searchUsers(searchTerm, this.data.clubId).pipe(
      map(users => { this.isLoadingPlayers = false; return users; }),
      catchError(() => { this.isLoadingPlayers = false; return of([]); })
    );
  }

  displayFn(user: User): string {
    return user && user.name ? `${user.name} ${user.lastname}` : '';
  }

  onUserSelected(user: User): void {
  this.selectedUser = user;
  // Backend necesita user_id, pero User tiene id
  this.reservationForm.patchValue({ user_id: user.id });
  console.log('Usuario dueño seleccionado:', user);
}

  addPlayer(user: User): void {
  console.log('Jugador seleccionado:', user);
  if (this.selectedPlayers.length >= 3) return;

  // Evitamos duplicados por id
  if (!this.selectedPlayers.find(p => p.id === user.id)) {
    this.selectedPlayers.push(user);
    console.log('Lista de jugadores actuales:', this.selectedPlayers);
  }
  this.playersControl.setValue('');
}

  removePlayer(index: number): void {
    this.selectedPlayers.splice(index, 1);
    console.log('Jugador eliminado, lista actual:', this.selectedPlayers);
  }

  onSubmit(): void {
  if (!this.reservationForm.valid) return;

  console.log('Jugadores antes de enviar:', this.selectedPlayers);

  const payload = {
    user_id: this.reservationForm.value.user_id,
    court_id: this.reservationForm.value.court_id,
    reservation_type_id: this.reservationForm.value.reservation_type_id,
    date: this.formatDateForApi(this.selectedDate),
    start_time: this.formatTimeForApi(this.reservationForm.value.start_time),
    end_time: this.formatTimeForApi(this.reservationForm.value.end_time),
    pay_method: this.reservationForm.value.pay_method,
    observations: this.reservationForm.value.observations,
    players: this.selectedPlayers.map(p => ({ user_id: p.id }))

  

  };

  console.log('Payload final que cierra modal:', payload);

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
    if (selectedDate) {
      this.reservationForm.patchValue({ date: this.formatDateForApi(selectedDate) });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

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
