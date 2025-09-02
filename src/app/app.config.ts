import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideNativeDateAdapter } from '@angular/material/core';

import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { FullCalendarModule } from '@fullcalendar/angular'; 
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideAnimations(),
    provideHttpClient(),

  provideNativeDateAdapter(),

    importProvidersFrom(
      ReactiveFormsModule,
  MatFormFieldModule,
  MatInputModule,
  MatIconModule,
  MatButtonModule,
  MatTableModule,
  FullCalendarModule,    
    )
  ]
};
