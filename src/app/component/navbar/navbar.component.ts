import { Component } from '@angular/core';
import { Auth } from '../../service/auth';

interface Notificacion {
  id: number;
  titulo: string;
  mensaje: string;
  fecha: Date;
  leida: boolean;
  tipo: 'info' | 'exito' | 'alerta';
}

@Component({
  selector: 'app-navbar',
  standalone: false,
  styleUrls: ['./navbar.component.css'],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  constructor(private auth: Auth) {}

  dlgAlertas = false;

  mostrarNotificaciones = false;

  notificaciones: Notificacion[] = [
    {
      id: 1,
      titulo: 'Bienvenido al sistema',
      mensaje: 'Tu sesión se encuentra activa.',
      fecha: new Date(),
      leida: false,
      tipo: 'info',
    },
    {
      id: 2,
      titulo: 'Sistema actualizado',
      mensaje: 'El panel de administración está listo para usar.',
      fecha: new Date(),
      leida: false,
      tipo: 'exito',
    },
    {
      id: 3,
      titulo: 'Revisión pendiente',
      mensaje: 'Recuerda revisar los registros pendientes.',
      fecha: new Date(),
      leida: true,
      tipo: 'alerta',
    },
  ];

  get cantidadNoLeidas(): number {
    return this.notificaciones.filter(
      (notificacion) => !notificacion.leida
    ).length;
  }

  get fechaHoy(): string {
    const f = new Date().toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    return f.charAt(0).toUpperCase() + f.slice(1);
  }

  // nombre e inicial del usuario que inició sesión
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

  marcarComoLeida(id: number): void {
    this.notificaciones = this.notificaciones.map((notificacion) =>
      notificacion.id === id
        ? { ...notificacion, leida: true }
        : notificacion
    );
  }

  marcarTodasComoLeidas(): void {
    this.notificaciones = this.notificaciones.map((notificacion) => ({
      ...notificacion,
      leida: true,
    }));
  }
}
