import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ClubsService, ClubAmenity } from '../../../app/services/clubs.service';
import { ConfigService, Comidad } from '../../../app/services/config.service';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MatDivider } from "@angular/material/divider";
import { MatCheckboxModule } from '@angular/material/checkbox';
import { forkJoin,Observable  } from 'rxjs';

interface ClubAmenityWithSelection {
    id?: number;               
    amenity_name: string;
    selected?: boolean;
    alreadyExists?: boolean;   
    clubAmenityId?: number;   
}

@Component({
    selector: 'app-club-amenities-modal',
    templateUrl: './registrar-comodidad-dialog.component.html',
    styleUrls: ['./registrar-comodidad-dialog.component.css'],
    standalone: true,
    imports: [
        MatButtonModule,
        MatIconModule,
        CommonModule,
        MatDivider,
        MatFormFieldModule,
        MatInputModule,
        FormsModule,
        MatCheckboxModule
    ],
})
export class ClubAmenitiesModalComponent implements OnInit {
    amenities: ClubAmenityWithSelection[] = [];
    clubId: number;

    constructor(
        private dialogRef: MatDialogRef<ClubAmenitiesModalComponent>,
        @Inject(MAT_DIALOG_DATA) private data: any,
        private configService: ConfigService,
        private clubsService: ClubsService,
        private snackBar: MatSnackBar
    ) {
        this.clubId = data.clubId;
    }

    ngOnInit() {
        this.loadAmenities();
    }

    loadAmenities() {
        this.configService.getComidades().subscribe(allAmenities => {
            const mappedAmenities = allAmenities.map(a => ({
                id: a.id,
                amenity_name: (a as any).name || (a as any).amenity_name,
            }));

            this.clubsService.getClubAmenities(this.clubId).subscribe(clubAmenities => {
                const clubAmenityMap = new Map<string, number>();
                clubAmenities.forEach(ca => {
                    clubAmenityMap.set(ca.amenity_name, ca.id); 
                });

                this.amenities = mappedAmenities.map(a => ({
                    ...a,
                    selected: clubAmenityMap.has(a.amenity_name),
                    alreadyExists: clubAmenityMap.has(a.amenity_name),
                    clubAmenityId: clubAmenityMap.get(a.amenity_name)
                }));
            });
        });
    }

    guardarComodidades() {
    const requests: Observable<any>[] = []; 

    this.amenities.forEach(a => {
        if (a.selected && !a.alreadyExists && a.id !== undefined) {
            requests.push(this.clubsService.createClubAmenity(this.clubId, a.id));
        }

        if (!a.selected && a.alreadyExists && a.clubAmenityId !== undefined) {
            requests.push(this.clubsService.deleteClubAmenity(a.clubAmenityId));
        }
    });

    if (requests.length === 0) {
        this.dialogRef.close(true);
        return;
    }

    forkJoin(requests).subscribe({
        next: () => {
            this.snackBar.open('Comodidades actualizadas correctamente', 'Cerrar', {
                duration: 3000,
                panelClass: ['snackbar-success']
            });
            this.dialogRef.close(true);
        },
        error: err => {
            console.error('Error al actualizar comodidades', err);
            this.snackBar.open('Error al actualizar comodidades', 'Cerrar', {
                duration: 3000,
                panelClass: ['snackbar-error']
            });
        }
    });
}
}
