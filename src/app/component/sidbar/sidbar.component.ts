import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, ROL_GERENTE, ROL_ADMINISTRADOR } from '../../service/auth';

@Component({
  selector: 'app-sidbar',
  standalone: false,
  styleUrl: './sidbar.component.css',
  templateUrl: './sidbar.component.html',
})
export class SidbarComponent {
  constructor(private router: Router, private auth: Auth) {}

  get nombreUsuario(): string {
    const sesion = this.auth.obtenerSesion();
    if (!sesion) {
      return 'Usuario';
    }
    return `${sesion.primer_nombre} ${sesion.primer_apellido}`;
  }

  get inicialesUsuario(): string {
    const sesion = this.auth.obtenerSesion();
    if (!sesion) {
      return 'U';
    }
    return (sesion.primer_nombre.charAt(0) + sesion.primer_apellido.charAt(0)).toUpperCase();
  }

  get rolUsuario(): string {
    return this.auth.obtenerSesion()?.rol || 'Usuario del sistema';
  }

  get enlaces(): { ruta: string; label: string; icono: string }[] {
    return this.todosLosEnlaces.filter(e => e.ruta !== '/usuario' || this.auth.tieneRol(ROL_GERENTE, ROL_ADMINISTRADOR));
  }

  private todosLosEnlaces: { ruta: string; label: string; icono: string }[] = [
    {
      ruta: '/inventario',
      label: 'Inventario',
      icono: 'pi-box',
    },
    {
      ruta: '/usuario',
      label: 'Usuarios',
      icono: 'pi-users',
    },
    {
      ruta: '/perfil',
      label: 'Mi perfil',
      icono: 'pi-user',
    }
  ];

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/inicio']);
  }
}
