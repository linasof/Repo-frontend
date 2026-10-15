import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../service/auth';

@Component({
  selector: 'app-sidbar',
  standalone: false,
  styleUrl: './sidbar.component.css',
  templateUrl: './sidbar.component.html',
})
export class SidbarComponent {
  constructor(private router: Router, private auth: Auth) {}

  // Nombre del usuario que inició sesión
  get nombreUsuario(): string {
    const sesion = this.auth.obtenerSesion();
    if (!sesion) {
      return 'Usuario';
    }
    return `${sesion.primer_nombre} ${sesion.primer_apellido}`;
  }

  // Iniciales del usuario
  get inicialesUsuario(): string {
    const sesion = this.auth.obtenerSesion();
    if (!sesion) {
      return 'U';
    }
    return (sesion.primer_nombre.charAt(0) + sesion.primer_apellido.charAt(0)).toUpperCase();
  }

  // Rol del usuario
  get rolUsuario(): string {
    return this.auth.obtenerSesion()?.rol || 'Usuario del sistema';
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
    this.auth.cerrarSesion();
    this.router.navigate(['/inicio']);
  }
}
