import { Component } from '@angular/core';

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

  get nombreUsuario(): string {
    return 'Lspatino';
  }

  get inicialesUsuario(): string {
    return 'L';
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
