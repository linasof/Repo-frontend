import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario } from '../model/usuario';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private baseUrl = 'http://127.0.0.1:8000/api/usuarios';

  constructor(private http: HttpClient) { }

  getPerfil(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/perfil/`);
  }

  getUsuarios(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/`);
  }

  crearUsuario(usuario: Usuario): Observable<any> {
    return this.http.post(`${this.baseUrl}/crear/`, usuario);
  }

  actualizarUsuario(id: number, usuario: Usuario): Observable<any> {
    return this.http.put(`${this.baseUrl}/actualizar/${id}/`, usuario);
  }
}

