import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-placeholder-page',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './placeholder-page.html',
  styleUrl: './placeholder-page.scss'
})
export class PlaceholderPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  title = signal('Page');
  description = signal('Espace réservé — à implémenter par les équipes métier.');
  icon = signal('pi pi-box');

  ngOnInit(): void {
    const data = this.route.snapshot.data;
    if (data['title']) this.title.set(data['title']);
    if (data['description']) this.description.set(data['description']);
    if (data['icon']) this.icon.set(data['icon']);
  }
}
