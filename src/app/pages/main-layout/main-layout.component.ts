import { Component, computed, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { CustomSidenavComponent } from "../../sidenav/custom-sidenav/custom-sidenav.component";
import { NotificationService } from '../../services/notification.service';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [RouterOutlet, MatToolbarModule, MatIconModule, MatSidenavModule, MatListModule, CustomSidenavComponent],
    templateUrl: './main-layout.component.html',
    styleUrls: ['./main-layout.component.css']
})
export class MainLayoutComponent implements OnInit {
    constructor(private notificationService: NotificationService) {}
     ngOnInit() {
    this.notificationService.initGlobalListener();
    }
    collapsed = signal(false);
    sideNavWidth = computed(() => this.collapsed() ? '65px' : '250px');
}
