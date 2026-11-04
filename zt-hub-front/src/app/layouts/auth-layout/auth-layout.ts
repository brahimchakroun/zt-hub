import { Component, computed, inject } from '@angular/core';
import { RouterOutlet, ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss'
})
export class AuthLayoutComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private childRouteData = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let child = this.route.firstChild;
        while (child?.firstChild) {
          child = child.firstChild;
        }
        return (child?.snapshot?.data?.['auth'] ?? {}) as { title?: string; subtitle?: string };
      })
    ),
    { initialValue: {} as { title?: string; subtitle?: string } }
  );

  title = computed(() => this.childRouteData()['title'] ?? null);
  subtitle = computed(() => this.childRouteData()['subtitle'] ?? null);
}
