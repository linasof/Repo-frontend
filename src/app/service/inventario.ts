import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Producto, MovimientoInventario } from '../model/producto';

@Injectable({
  providedIn: 'root'
})
export class Inventario {

  private baseUrl = 'http://127.0.0.1:8000/api/inventario';

  constructor(private http: HttpClient) { }



  getProductos(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/productos/`);
  }

  crearProducto(producto: Producto): Observable<any> {
    return this.http.post(`${this.baseUrl}/productos/crear/`, producto);
  }

  actualizarProducto(id: number, producto: Producto): Observable<any> {
    return this.http.put(`${this.baseUrl}/productos/actualizar/${id}/`, producto);
  }

  eliminarProducto(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/productos/eliminar/${id}/`);
  }


  getMovimientos(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/movimientos/`);
  }

  crearMovimiento(movimiento: MovimientoInventario): Observable<any> {
    return this.http.post(`${this.baseUrl}/movimientos/crear/`, movimiento);
  }
}
