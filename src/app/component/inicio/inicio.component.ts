import { ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../service/auth';

@Component({
  selector: 'app-inicio',
  standalone: false,
  styleUrl: './inicio.component.css',
  templateUrl: './inicio.component.html',
})
export class InicioComponent {
  // Declaramos explícitamente las propiedades que usa el HTML
  correo = '';
  password = '';
  verPassword = false;
  error = '';
  cargando = false;

  constructor(private router: Router, private auth: Auth, private cdr: ChangeDetectorRef) {}

  iniciarSesion(): void {
    this.error = '';

    if (!this.correo.trim() || !this.password) {
      this.error = 'Escribe tu correo y tu contraseña.';
      return;
    }

    this.cargando = true;
    this.auth.login(this.correo.trim(), this.password).subscribe({
      next: () => {
        this.cargando = false;
        this.router.navigate(['/inventario']);
      },
      error: (err) => {
        this.cargando = false;
        // el back manda el motivo en message (contraseña incorrecta, usuario retirado, etc)
        this.error = err?.error?.message || 'No se pudo conectar con el servidor.';
        this.cdr.markForCheck(); // para que el mensaje de error se vea en pantalla
      }
    });
  }
}
