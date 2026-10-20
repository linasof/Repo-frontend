import { Component, OnInit } from '@angular/core';
import { Inventario } from '../../service/inventario';

type RolInventario =
  | 'Administrador'
  | 'Auxiliar administrativo'
  | 'Vendedor';

type TipoMovimiento = 'Entrada' | 'Salida';
type NivelStock = 'Disponible' | 'Stock bajo' | 'Agotado';
type TipoToast = 'ok' | 'alerta' | 'error';

interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  unidad: string;
  precio: number;
  stock: number;
  stockMinimo: number;
  activo: boolean;
  id_categoria?: number;
  id_estado_producto?: number;
}

interface FormularioProducto {
  codigo: string;
  nombre: string;
  categoria: string;
  unidad: string;
  precio: number;
  stock: number;
  stockMinimo: number;
  id_categoria: number;
  id_estado_producto: number;
}

interface MovimientoInventario {
  id: number;
  productoId: number;
  codigo: string;
  producto: string;
  tipo: TipoMovimiento;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  fecha: Date;
  responsable: string;
}

interface ToastInventario {
  tipo: TipoToast;
  texto: string;
}

@Component({
  selector: 'app-inventario',
  standalone: false,
  templateUrl: './inventario.component.html',
  styleUrl: './inventario.component.css',
})
export class InventarioComponent implements OnInit {
  rolActual: RolInventario = 'Administrador';
  usuarioActual = 'Lspatino';

  busqueda = '';
  dlgProducto = false;
  dlgMovimiento = false;

  editandoProducto: Producto | null = null;
  movProducto: Producto | null = null;

  movTipo: TipoMovimiento = 'Entrada';
  movCantidad = 1;

  errorProducto = '';
  errorMov = '';
  toast: ToastInventario | null = null;

  productos: Producto[] = [];
  movimientos: MovimientoInventario[] = [];

  categorias: string[] = [
    'Calzado',
    'Ropa',
    'Bolsos',
    'Accesorios',
    'Bisutería'
  ];

  listaUnidadesMedida: string[] = [
    'Unidad',
    'Par',
    'Caja',
    'Metro',
    'Kilogramo'
  ];

  formParameterCategoriasMap: { [key: string]: number } = {
    'Calzado': 1,
    'Ropa': 2,
    'Bolsos': 3,
    'Accesorios': 4,
    'Bisutería': 5
  };

  formProducto: FormularioProducto = this.formularioVacio();

  constructor(private inventarioService: Inventario) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.inventarioService.getProductos().subscribe({
      next: (res) => {
        if (res.status === 'success' && Array.isArray(res.data)) {
          this.productos = res.data.map((p: any) => ({
            id: p.id_producto,
            codigo: p.codigo_identificacion,
            nombre: p.nombre,
            categoria: p.categoria || 'General',
            unidad: p.unidad_medida || 'Unidad',
            precio: Number(p.precio_venta),
            stock: p.stock_actual,
            stockMinimo: p.stock_minimo,
            activo: p.estado_producto !== 'Inactivo',
            id_categoria: p.id_categoria,
            id_estado_producto: p.id_estado_producto
          }));
        }
      },
      error: (err) => {
        console.error('Error al cargar productos:', err);
        this.mostrarToast('error', 'No se pudieron cargar los productos del servidor.');
      }
    });

    this.inventarioService.getMovimientos().subscribe({
      next: (res) => {
        if (res.status === 'success' && Array.isArray(res.data)) {
          this.movimientos = res.data.map((m: any) => ({
            id: m.id_movimiento_inventario,
            productoId: m.id_producto,
            codigo: '',
            producto: m.producto,
            tipo: m.tipo_movimiento,
            cantidad: m.cantidad,
            stockAnterior: 0,
            stockNuevo: 0,
            fecha: new Date(m.fecha),
            responsable: m.usuario
          }));
        }
      },
      error: (err) => {
        console.error('Error al cargar movimientos:', err);
      }
    });
  }

  get esGerente(): boolean {
    return this.rolActual === 'Administrador';
  }

  get puedeOperar(): boolean {
    return (
      this.rolActual === 'Administrador' ||
      this.rolActual === 'Auxiliar administrativo'
    );
  }

  get totalUnidades(): number {
    return this.productos
      .filter((producto) => producto.activo)
      .reduce((total, producto) => total + producto.stock, 0);
  }

  get alertasCount(): number {
    return this.productos.filter(
      (producto) =>
        producto.activo &&
        producto.stock <= producto.stockMinimo
    ).length;
  }

  get valorInventario(): number {
    return this.productos
      .filter((producto) => producto.activo)
      .reduce(
        (total, producto) => total + (producto.stock * producto.precio),
        0
      );
  }

  get productosFiltrados(): Producto[] {
    const termino = this.busqueda.trim().toLocaleLowerCase('es-CO');

    if (!termino) {
      return this.productos;
    }

    return this.productos.filter((producto) =>
      [
        producto.codigo,
        producto.nombre,
        producto.categoria,
      ].some((campo) =>
        campo.toLocaleLowerCase('es-CO').includes(termino)
      )
    );
  }

  private formularioVacio(): FormularioProducto {
    return {
      codigo: '',
      nombre: '',
      categoria: '',
      unidad: 'Unidad',
      precio: 0,
      stock: 0,
      stockMinimo: 0,
      id_categoria: 1,
      id_estado_producto: 1
    };
  }

  abrirProducto(producto?: Producto): void {
    if (!this.puedeOperar) {
      this.mostrarToast('error', 'No tienes permisos para gestionar productos.');
      return;
    }

    this.errorProducto = '';
    this.editandoProducto = producto ?? null;

    if (producto) {
      this.formProducto = {
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria: producto.categoria,
        unidad: producto.unidad,
        precio: producto.precio,
        stock: producto.stock,
        stockMinimo: producto.stockMinimo,
        id_categoria: producto.id_categoria ?? 1,
        id_estado_producto: producto.id_estado_producto ?? 1
      };
    } else {
      this.formProducto = this.formularioVacio();
    }

    this.dlgProducto = true;
  }

  cerrarProducto(): void {
    this.dlgProducto = false;
    this.errorProducto = '';
    this.editandoProducto = null;
    this.formProducto = this.formularioVacio();
  }

  guardarProducto(): void {
    if (!this.puedeOperar) {
      this.mostrarToast('error', 'No tienes permisos para esta acción.');
      return;
    }

    const codigo = this.formProducto.codigo.trim().toUpperCase();
    const nombre = this.formProducto.nombre.trim();
    const unidad = this.formProducto.unidad.trim();

    if (!codigo || !nombre || !unidad) {
      this.errorProducto = 'El código, el nombre y la unidad de medida son obligatorios.';
      return;
    }

    if (!this.formProducto.categoria) {
      this.errorProducto = 'Selecciona una categoría.';
      return;
    }

    const precio = Number(this.formProducto.precio);
    const stock = Number(this.formProducto.stock);
    const stockMinimo = Number(this.formProducto.stockMinimo);

    if (!Number.isFinite(precio) || precio < 0) {
      this.errorProducto = 'El precio debe ser un número válido no negativo.';
      return;
    }

    const idCat = this.formParameterCategoriasMap[this.formProducto.categoria] || 1;

    const payload = {
      codigo_identificacion: codigo,
      nombre: nombre,
      unidad_medida: unidad,
      precio_venta: precio,
      stock_actual: stock,
      stock_minimo: stockMinimo,
      id_categoria: idCat,
      id_estado_producto: 1
    };

    if (!this.editandoProducto) {
      this.inventarioService.crearProducto(payload as any).subscribe({
        next: () => {
          this.mostrarToast('ok', 'Producto registrado correctamente.');
          this.cargarDatos();
          this.cerrarProducto();
        },
        error: (err) => {
          // IMPRIMIR DETALLE DEL ERROR EN CONSOLA
          console.error('Error detallado desde Django:', err.error);

          this.errorProducto = typeof err.error === 'string'
            ? err.error
            : (err.error?.message || JSON.stringify(err.error));
        }
      });
    }


    else {
      const id = this.editandoProducto.id;
      const updatePayload = {
        ...payload,
        stock_actual: this.editandoProducto.stock
      };

      this.inventarioService.actualizarProducto(id, updatePayload as any).subscribe({
        next: () => {
          this.mostrarToast('ok', 'Producto actualizado correctamente.');
          this.cargarDatos();
          this.cerrarProducto();
        },
        error: (err) => {
          this.errorProducto = err.error?.message || 'Error al actualizar el producto.';
        }
      });
    }
  }

  alternarEstado(producto: Producto): void {
    if (!this.puedeOperar) {
      this.mostrarToast('error', 'No tienes permisos para esta acción.');
      return;
    }

    const nuevoEstadoActivo = !producto.activo;
    const nuevoEstadoId = nuevoEstadoActivo ? 1 : 2;

    const payload = {
      codigo_identificacion: producto.codigo,
      nombre: producto.nombre,
      unidad_medida: producto.unidad,
      precio_venta: producto.precio,
      stock_actual: producto.stock,
      stock_minimo: producto.stockMinimo,
      id_categoria: producto.id_categoria || 1,
      id_estado_producto: nuevoEstadoId
    };

    this.inventarioService.actualizarProducto(producto.id, payload as any).subscribe({
      next: () => {
        this.mostrarToast(
          'ok',
          nuevoEstadoActivo ? 'Producto activado correctamente.' : 'Producto desactivado correctamente.'
        );
        this.cargarDatos();
      },
      error: (err) => {
        this.mostrarToast('error', err.error?.message || 'Error al cambiar estado.');
      }
    });
  }

  abrirMovimiento(producto: Producto, tipo: TipoMovimiento): void {
    if (!this.puedeOperar) {
      this.mostrarToast('error', 'No tienes permisos para registrar movimientos.');
      return;
    }

    if (!producto.activo) {
      this.mostrarToast('alerta', 'No puedes mover existencias de un producto inactivo.');
      return;
    }

    this.movProducto = producto;
    this.movTipo = tipo;
    this.movCantidad = 1;
    this.errorMov = '';
    this.dlgMovimiento = true;
  }

  cerrarMovimiento(): void {
    this.dlgMovimiento = false;
    this.errorMov = '';
    this.movProducto = null;
    this.movCantidad = 1;
  }

  registrarMovimiento(): void {
    if (!this.puedeOperar) {
      this.mostrarToast('error', 'No tienes permisos para esta acción.');
      return;
    }

    if (!this.movProducto) {
      this.errorMov = 'No se encontró el producto seleccionado.';
      return;
    }

    const cantidad = Number(this.movCantidad);

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      this.errorMov = 'La cantidad debe ser un entero mayor que cero.';
      return;
    }

    if (this.movTipo === 'Salida' && cantidad > this.movProducto.stock) {
      this.errorMov = `No hay existencias suficientes. Stock actual: ${this.movProducto.stock}.`;
      return;
    }

    const idTipoMov = this.movTipo === 'Entrada' ? 1 : 2;

    const payloadMovimiento = {
      id_producto: this.movProducto.id,
      id_usuario: 1,
      id_tipo_movimiento: idTipoMov,
      cantidad: cantidad,
      costo_unitario: this.movProducto.precio
    };

    this.inventarioService.crearMovimiento(payloadMovimiento as any).subscribe({
      next: () => {
        this.mostrarToast('ok', `${this.movTipo} registrada correctamente`);
        this.cargarDatos();
        this.cerrarMovimiento();
      },
      error: (err) => {

        this.errorMov = err.error?.message || 'Error al registrar el movimiento';
      }
    });
  }

  nivel(producto: Producto): NivelStock {
    if (producto.stock === 0) return 'Agotado';
    if (producto.stock <= producto.stockMinimo) return 'Stock bajo';
    return 'Disponible';
  }

  moneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor);
  }

  formatearFechaHora(fecha: Date): string {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(fecha);
  }

  trackById(_index: number, producto: Producto): number {
    return producto.id;
  }

  trackByMovimientoId(_index: number, movimiento: MovimientoInventario): number {
    return movimiento.id;
  }

  private mostrarToast(tipo: TipoToast, texto: string): void {
    this.toast = { tipo, texto };
  }

  cerrarToast(): void {
    this.toast = null;
  }
}
