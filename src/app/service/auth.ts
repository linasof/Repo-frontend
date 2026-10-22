import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

// datos que devuelve el back cuando el login es correcto
export interface SesionUsuario {
  token: string;
  id_usuario: number;
  nombre_usuario: string;
  primer_nombre: string;
  primer_apellido: string;
  correo: string;
  id_rol: number;
  rol: string;
  estado: string;
}

// mismos nombres de la tabla rol
export const ROL_ADMINISTRADOR = 'Administrador';
export const ROL_VENDEDOR = 'Vendedor';
export const ROL_AUXILIAR = 'Auxiliar administrativo';

@Injectable({
  providedIn: 'root'
})
export class Auth {

  private baseUrl = 'http://127.0.0.1:8000/api/usuarios';
  private claveSesion = 'sesion';

  constructor(private http: HttpClient) { }

  // manda correo y contraseña al back y si es correcto guarda la sesión
  login(correo: string, contrasenia: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/login/`, { correo, contrasenia }).pipe(
      tap(respuesta => localStorage.setItem(this.claveSesion, JSON.stringify(respuesta.data)))
    );
  }

  cambiarContrasenia(contrasenia_actual: string, contrasenia_nueva: string, confirmacion: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cambiar-contrasenia/`, { contrasenia_actual, contrasenia_nueva, confirmacion });
  }

  obtenerSesion(): SesionUsuario | null {
    const guardada = localStorage.getItem(this.claveSesion);
    if (!guardada) {
      return null;
    }
    try {
      const sesion = JSON.parse(guardada) as SesionUsuario;
      return sesion && sesion.token ? sesion : null;
    } catch {
      return null;
    }
  }

  get token(): string | null {
    return this.obtenerSesion()?.token ?? null;
  }

  get rol(): string {
    return this.obtenerSesion()?.rol ?? '';
  }

  estaLogueado(): boolean {
    return this.obtenerSesion() !== null;
  }

  tieneRol(...roles: string[]): boolean {
    return roles.includes(this.rol);
  }

  cerrarSesion(): void {
    localStorage.removeItem(this.claveSesion);
  }
}
