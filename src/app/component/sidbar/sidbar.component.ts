import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidbar',
  standalone: false,
  styleUrl: './sidbar.component.css',
  templateUrl: './sidbar.component.html',
})
export class SidbarComponent {
  constructor(private router: Router) {}

  // Nombre del usuario
  get nombreUsuario(): string {
    return 'Usuario';
  }

  // Iniciales del usuario
  get inicialesUsuario(): string {
    return 'U';
  }

  // Enlaces disponibles
  enlaces: { ruta: string; label: string; icono: string }[] = [
    {
      ruta: '/inventario',
      label: 'Inventario',
      icono: 'pi-box',
    },
    {
      ruta: '/usuario',
      label: 'Usuarios',
      icono: 'pi-users',
    }
  ];

  // Cerrar sesión y regresar al inicio
  cerrarSesion(): void {
    this.router.navigate(['/inicio']);
  }
}
