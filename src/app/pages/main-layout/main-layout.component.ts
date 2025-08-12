import { Component } from '@angular/core';
import { HeaderComponent } from "../../../pages/layout/header/header.component";
import { SidebarComponent } from "../../../pages/layout/sidebar/sidebar.component";
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [HeaderComponent, SidebarComponent, RouterOutlet],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css']
})
export class MainLayoutComponent { }