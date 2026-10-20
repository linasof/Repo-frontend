export interface Producto {
  id_producto?: number;
  codigo_identificacion: string;
  nombre: string;
  unidad_medida: string;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;


  id_categoria: number;
  id_estado_producto: number;


  categoria?: string;
  estado_producto?: string;
}

export interface MovimientoInventario {
  id_movimiento_inventario?: number;
  id_producto: number;
  id_usuario: number;
  id_tipo_movimiento: number;
  cantidad: number;
  costo_unitario: number;
  producto?: string;
  usuario?: string;
  tipo_movimiento?: string;
  fecha?: string;
}
