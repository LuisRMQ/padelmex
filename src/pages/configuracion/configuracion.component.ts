import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { IntegrantesService, Integrante } from '../../app/services/integrantes.service';

@Component({
    selector: 'app-configuracion',
    standalone: true,
    templateUrl: './configuracion.component.html',
    styleUrls: ['./configuracion.component.css'],
    imports: [
        CommonModule,
        MatTableModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatButtonModule,
        MatCardModule
    ]
})
export class ConfiguracionComponent implements OnInit {
    displayedColumns: string[] = ['foto', 'nombre', 'email', 'rol', 'club', 'categoria', 'acciones'];
    dataSource!: MatTableDataSource<Integrante>;
    selectedUsuario: Integrante | null = null;

    club = {
        nombre: 'Club Deportivo Ejemplo',
        direccion: 'Av. Central 123',
        telefono: '555-123-4567',
        email: 'contacto@club.com'
    };

    horarios = [
        { dia: 'Lunes', start_time: '08:00', end_time: '12:00' },
        { dia: 'Miércoles', start_time: '14:00', end_time: '18:00' }
    ];

    canchas = [
        { nombre: 'Cancha 1', tipo: 'Padel', capacidad: 4 },
        { nombre: 'Cancha 2', tipo: 'Tenis', capacidad: 2 }
    ];
    @ViewChild(MatPaginator) paginator!: MatPaginator;

    constructor(private integrantesService: IntegrantesService) { }

    ngOnInit() {
        this.integrantesService.getIntegrantes().subscribe({
            next: (res: any) => {
                const integrantesArray: Integrante[] = res.data ?? [];
                this.dataSource = new MatTableDataSource(integrantesArray);
                this.dataSource.paginator = this.paginator;
            },
            error: (err) => console.error('Error al obtener integrantes:', err)
        });
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        if (this.dataSource) {
            this.dataSource.filter = filterValue.trim().toLowerCase();
        }
    }

    verDetalle(usuario: Integrante) {
        this.selectedUsuario = usuario;
    }

    volverLista() {
        this.selectedUsuario = null;
    }

    abrirModalRegistrarUsuario() {
        console.log('Abrir modal de registro');
    }

    eliminarUsuario(usuario: Integrante) {
        console.log('Eliminar', usuario);
    }

    onImageError(event: Event) {
        const target = event.target as HTMLImageElement;
        target.src = '../../../assets/images/iconuser.png';
    }

    editarClub() {
        console.log('Editar club');
    }

    editarHorario(horario: any) {
        console.log('Editar horario', horario);
    }

    editarCancha(cancha: any) {
        console.log('Editar cancha', cancha);
    }
}
