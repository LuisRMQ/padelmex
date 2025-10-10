import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CourtService } from '../../../app/services/court.service';

@Component({
  selector: 'app-RegistrarCanchaCerrada',
  templateUrl: './registrar-diacerrado-dialog.component.html',
  styleUrls: ['./registrar-diacerrado-dialog.component.css'],
  standalone: true,
  imports: [
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    ReactiveFormsModule,
    CommonModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatTooltipModule
  ]
})
export class RegistrarCanchaCerradaDialogComponent implements OnInit {

  closedDayForm: FormGroup;
  loading = false;
  editingId: number | null = null;

  displayedColumns: string[] = ['day', 'reason', 'actions'];
  closedDays: any[] = [];

  constructor(
    private fb: FormBuilder,
    private courtService: CourtService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<RegistrarCanchaCerradaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.closedDayForm = this.fb.group({
      court_id: [this.data?.courtId || '', Validators.required],
      day: ['', Validators.required],
      reason: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadClosedDays();
  }

  loadClosedDays(): void {
  if (!this.data?.courtId) return;

  this.courtService.getCourtClosedDaysByCourt(this.data.courtId).subscribe({
    next: (res) => {
      this.closedDays = res || [];
    },
    error: (err) => {
      console.error(err);
      this.snackBar.open('❌ Error al cargar los días cerrados', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
    }
  });
}

  onSubmit() {
    if (this.closedDayForm.invalid) {
      Object.keys(this.closedDayForm.controls).forEach(key => {
        this.closedDayForm.get(key)?.markAsTouched();
      });
      this.snackBar.open('⚠️ Completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading = true;
    const data = this.closedDayForm.value;

    const request$ = this.editingId
      ? this.courtService.updateCourtClosedDay(this.editingId, data)
      : this.courtService.createCourtClosedDay(data);

    request$.subscribe({
      next: (response) => {
        this.loading = false;
        this.snackBar.open(
          this.editingId ? '✅ Día cerrado actualizado' : '✅ Día cerrado registrado',
          'Cerrar',
          { duration: 3000 }
        );
        this.closedDayForm.reset({ court_id: this.data?.courtId });
        this.editingId = null;
        this.loadClosedDays();
      },
      error: (error) => {
        this.loading = false;
        console.error('Error:', error);
        this.snackBar.open('❌ Error al guardar el día cerrado', 'Cerrar', { duration: 3000 });
      }
    });
  }

  onEdit(item: any): void {
    this.closedDayForm.patchValue({
      court_id: this.data?.courtId,
      day: new Date(item.day),
      reason: item.reason
    });
    this.editingId = item.id;
  }

  onDelete(id: number): void {
    if (!confirm('¿Seguro que deseas eliminar este día cerrado?')) return;

    this.courtService.deleteCourtClosedDay(id).subscribe({
      next: () => {
        this.snackBar.open('🗑️ Día cerrado eliminado', 'Cerrar', { duration: 3000 });
        this.loadClosedDays();
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('❌ Error al eliminar', 'Cerrar', { duration: 3000 });
      }
    });
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}
