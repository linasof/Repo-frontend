import { Component } from '@angular/core';
import { Router } from '@angular/router';

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

  constructor(private router: Router) {}

  iniciarSesion(): void {
    this.router.navigate(['/inventario']).then(
      resultado => console.log('Navegación:', resultado)
    ).catch(error => console.error(error));
  }
}
