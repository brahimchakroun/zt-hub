import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent {
  cards = [
    { title: 'Branches Assurance', value: '7', icon: 'pi pi-briefcase', color: '#7da65d' },
    { title: 'Modules Admin', value: '4', icon: 'pi pi-cog', color: '#8b5cf6' },
    { title: 'Pages génériques', value: 'Ready', icon: 'pi pi-check-circle', color: '#16a34a' },
    { title: 'Auth mock', value: 'OK', icon: 'pi pi-lock', color: '#f59e0b' }
  ];
}
