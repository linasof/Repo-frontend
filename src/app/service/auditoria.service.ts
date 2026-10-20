import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RegistroBitacora {
  id_registro_bitacora: number;
  id_usuario_afectado: number | null;
  usuario_afectado: string;
  id_usuario_responsable: number | null;
  usuario_responsable: string;
  accion: string;
  cambio_realizado: string;
  fecha: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditoriaService {
  private apiUrl = 'http://127.0.0.1:8000/api/auditoria/';

  constructor(private http: HttpClient) {}

  obtenerHistorial(): Observable<{ status: string; data: RegistroBitacora[] }> {
    return this.http.get<{ status: string; data: RegistroBitacora[] }>(this.apiUrl);
  }
}
