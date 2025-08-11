import { Component } from '@angular/core';
import { HeaderComponent } from "../../../pages/layout/header/header.component";
import { SidebarComponent } from "../../../pages/layout/sidebar/sidebar.component";
import { DashboardComponent } from "../../../pages/dashboard/dashboard.component";


@Component({
  selector: 'app-main-layout',
  imports: [HeaderComponent, SidebarComponent,DashboardComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent {

}
