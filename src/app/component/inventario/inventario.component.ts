import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Inventario } from '../../service/inventario';
import { Auth, ROL_ADMINISTRADOR, ROL_AUXILIAR } from '../../service/auth';
import {
  Errores, erroresDelServidor, limpiar, validarEntero, validarPrecio, validarTexto
} from '../../service/validaciones';

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
  id_categoria: number;
  id_estado_producto: number;
}

interface Categoria {
  id_categoria: number;
  nombre: string;
  prefijo: string;
}

interface FormularioProducto {
  nombre: string;
  id_categoria: number | null;
  unidad: string;
  precio: number | null;
  stock: number | null;
  stockMinimo: number | null;
}

interface MovimientoInventario {
  id: number;
  productoId: number;
  producto: string;
  tipo: TipoMovimiento;
  cantidad: number;
  fecha: Date;
  responsable: string;
}

interface ToastInventario {
  tipo: TipoToast;
  texto: string;
}

// mismos limites que el back (inventario/service/producto_service.py)
const PRECIO_MAXIMO = 100000000;
const STOCK_MAXIMO = 1000000;
const ESTADO_ACTIVO = 1;
const ESTADO_INACTIVO = 2;

@Component({
  selector: 'app-inventario',
  standalone: false,
  templateUrl: './inventario.component.html',
  styleUrl: './inventario.component.css',
})
export class InventarioComponent implements OnInit {
  busqueda = '';
  dlgProducto = false;
  dlgMovimiento = false;
  dlgEliminar = false;
  guardando = false;

  editandoProducto: Producto | null = null;
  movProducto: Producto | null = null;
  productoEliminar: Producto | null = null;

  movTipo: TipoMovimiento = 'Entrada';
  movCantidad: number | null = 1;

  errorProducto = '';
  erroresProducto: Errores = {};
  errorMov = '';
  errorEliminar = '';
  toast: ToastInventario | null = null;
  private temporizadorToast: any = null;

  productos: Producto[] = [];
  movimientos: MovimientoInventario[] = [];
  categorias: Categoria[] = [];

  listaUnidadesMedida: string[] = ['Unidad', 'Par', 'Caja', 'Paquete', 'Metro', 'Kilogramo'];

  formProducto: FormularioProducto = this.formularioVacio();

  constructor(private inventarioService: Inventario, private auth: Auth, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarDatos();
  }

  // el administrador (gerente) ve inactivos, activa/inactiva y elimina
  get esGerente(): boolean {
    return this.auth.tieneRol(ROL_ADMINISTRADOR);
  }

  // administrador y auxiliar registran productos y movimientos, el vendedor solo consulta
  get puedeOperar(): boolean {
    return this.auth.tieneRol(ROL_ADMINISTRADOR, ROL_AUXILIAR);
  }

  cargarCategorias(): void {
    this.inventarioService.getCategorias().subscribe({
      next: (res) => {
        this.categorias = Array.isArray(res?.data) ? res.data : [];
        this.cdr.markForCheck();
      },
      error: () => this.mostrarToast('error', 'No se pudieron cargar las categorías.')
    });
  }

  cargarDatos(): void {
    this.inventarioService.getProductos().subscribe({
      next: (res) => {
        if (res.status === 'success' && Array.isArray(res.data)) {
          const lista: Producto[] = res.data.map((p: any) => ({
            id: p.id_producto,
            codigo: p.codigo_identificacion,
            nombre: p.nombre,
            categoria: p.categoria || 'General',
            unidad: p.unidad_medida || 'Unidad',
            precio: Number(p.precio_venta),
            stock: p.stock_actual,
            stockMinimo: p.stock_minimo,
            activo: (p.estado_producto || '').toLowerCase() === 'activo',
            id_categoria: p.id_categoria,
            id_estado_producto: p.id_estado_producto
          }));
          // el back ya no le manda los inactivos al auxiliar ni al vendedor, esto es por si acaso
          this.productos = this.esGerente ? lista : lista.filter(p => p.activo);
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        const { mensaje } = erroresDelServidor(err, 'No se pudieron cargar los productos del servidor.');
        this.mostrarToast('error', mensaje || 'No se pudieron cargar los productos del servidor.');
      }
    });

    this.inventarioService.getMovimientos().subscribe({
      next: (res) => {
        if (res.status === 'success' && Array.isArray(res.data)) {
          this.movimientos = res.data.map((m: any) => ({
            id: m.id_movimiento_inventario,
            productoId: m.id_producto,
            producto: m.producto,
            tipo: m.tipo_movimiento,
            cantidad: m.cantidad,
            fecha: new Date(m.fecha),
            responsable: m.usuario
          }));
        }
        this.cdr.markForCheck();
      },
      error: () => {
        // el vendedor no tiene permiso de ver movimientos, no se muestra error
        this.movimientos = [];
        this.cdr.markForCheck();
      }
    });
  }

  get productosActivos(): Producto[] {
    return this.productos.filter((producto) => producto.activo);
  }

  get totalUnidades(): number {
    return this.productosActivos.reduce((total, producto) => total + producto.stock, 0);
  }

  get alertasCount(): number {
    return this.productosActivos.filter((producto) => producto.stock <= producto.stockMinimo).length;
  }

  get valorInventario(): number {
    return this.productosActivos.reduce((total, producto) => total + (producto.stock * producto.precio), 0);
  }

  get productosFiltrados(): Producto[] {
    const termino = this.busqueda.trim().toLocaleLowerCase('es-CO');
    if (!termino) {
      return this.productos;
    }
    return this.productos.filter((producto) =>
      [producto.codigo, producto.nombre, producto.categoria]
        .some((campo) => campo.toLocaleLowerCase('es-CO').includes(termino))
    );
  }

  // vista previa del codigo que va a asignar el back (el definitivo lo da el servidor al guardar)
  get codigoSugerido(): string {
    const categoria = this.categorias.find(c => c.id_categoria === Number(this.formProducto.id_categoria));
    if (!categoria) return 'Se asigna al elegir la categoría';
    const numeros = this.productos
      .filter(p => p.codigo.toUpperCase().startsWith(categoria.prefijo + '-'))
      .map(p => Number(p.codigo.split('-')[1]) || 0);
    const siguiente = Math.max(0, ...numeros) + 1;
    return `${categoria.prefijo}-${String(siguiente).padStart(3, '0')} (aprox.)`;
  }

  private formularioVacio(): FormularioProducto {
    return { nombre: '', id_categoria: null, unidad: 'Unidad', precio: null, stock: 0, stockMinimo: 0 };
  }

  abrirProducto(producto?: Producto): void {
    if (!this.puedeOperar) {
      this.mostrarToast('error', 'No tienes permisos para gestionar productos.');
      return;
    }

    this.errorProducto = '';
    this.erroresProducto = {};
    this.editandoProducto = producto ?? null;
    this.formProducto = producto
      ? {
        nombre: producto.nombre,
        id_categoria: producto.id_categoria,
        unidad: producto.unidad,
        precio: producto.precio,
        stock: producto.stock,
        stockMinimo: producto.stockMinimo,
      }
      : this.formularioVacio();
    this.dlgProducto = true;
  }

  cerrarProducto(): void {
    this.dlgProducto = false;
    this.errorProducto = '';
    this.erroresProducto = {};
    this.editandoProducto = null;
    this.formProducto = this.formularioVacio();
  }

  private validarProducto(): Errores {
    const f = this.formProducto;
    const errores: Errores = {};
    const nombre = validarTexto(errores, 'nombre', f.nombre, 'El nombre del producto', true, 3, 150);
    if (nombre && !errores['nombre'] && !/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(nombre)) {
      errores['nombre'] = 'El nombre del producto debe tener letras';
    }
    if (!f.id_categoria) errores['id_categoria'] = 'Selecciona una categoría';
    if (!f.unidad) errores['unidad_medida'] = 'Selecciona la unidad de medida';
    validarPrecio(errores, 'precio_venta', f.precio, 'El precio', PRECIO_MAXIMO);
    validarEntero(errores, 'stock_minimo', f.stockMinimo, 'El stock mínimo', 0, STOCK_MAXIMO);
    if (!this.editandoProducto) {
      validarEntero(errores, 'stock_actual', f.stock, 'El stock inicial', 0, STOCK_MAXIMO);
    }
    return errores;
  }

  guardarProducto(): void {
    if (!this.puedeOperar || this.guardando) {
      return;
    }

    this.errorProducto = '';
    this.erroresProducto = this.validarProducto();
    if (Object.keys(this.erroresProducto).length) {
      this.errorProducto = 'Revisa los campos marcados en rojo.';
      return;
    }

    const f = this.formProducto;
    const datos: any = {
      nombre: limpiar(f.nombre),
      unidad_medida: f.unidad,
      precio_venta: Number(f.precio),
      stock_minimo: Number(f.stockMinimo),
      id_categoria: Number(f.id_categoria),
    };

    this.guardando = true;
    const peticion = this.editandoProducto
      ? this.inventarioService.actualizarProducto(this.editandoProducto.id, {
        ...datos, id_estado_producto: this.editandoProducto.id_estado_producto
      })
      : this.inventarioService.crearProducto({ ...datos, stock_actual: Number(f.stock) });

    peticion.subscribe({
      next: (res: any) => {
        this.guardando = false;
        this.mostrarToast('ok', this.editandoProducto
          ? 'Producto actualizado correctamente.'
          : (res?.message || 'Producto registrado correctamente.'));
        this.cerrarProducto();
        this.cargarDatos();
      },
      error: (err) => {
        this.guardando = false;
        const { errores, mensaje } = erroresDelServidor(err, 'No se pudo guardar el producto.');
        this.erroresProducto = errores;
        this.errorProducto = mensaje || 'Revisa los campos marcados en rojo.';
        this.cdr.markForCheck();
      }
    });
  }

  // regla: solo se puede inactivar cuando no queda ninguna unidad
  puedeInactivar(producto: Producto): boolean {
    return !producto.activo || producto.stock === 0;
  }

  alternarEstado(producto: Producto): void {
    if (!this.esGerente) {
      this.mostrarToast('error', 'Solo el administrador puede activar o inactivar productos.');
      return;
    }
    if (producto.activo && producto.stock > 0) {
      this.mostrarToast('alerta', `No se puede inactivar: todavía hay ${producto.stock} unidad(es). Primero registra la salida de todas.`);
      return;
    }

    const activar = !producto.activo;
    const payload = {
      nombre: producto.nombre,
      unidad_medida: producto.unidad,
      precio_venta: producto.precio,
      stock_minimo: producto.stockMinimo,
      id_categoria: producto.id_categoria,
      id_estado_producto: activar ? ESTADO_ACTIVO : ESTADO_INACTIVO
    };

    this.inventarioService.actualizarProducto(producto.id, payload).subscribe({
      next: () => {
        this.mostrarToast('ok', activar ? 'Producto activado correctamente.' : 'Producto inactivado correctamente.');
        this.cargarDatos();
      },
      error: (err) => {
        const { errores, mensaje } = erroresDelServidor(err, 'No se pudo cambiar el estado.');
        this.mostrarToast('error', mensaje || Object.values(errores).join(' '));
      }
    });
  }

  abrirEliminar(producto: Producto): void {
    if (!this.esGerente) return;
    this.productoEliminar = producto;
    this.errorEliminar = '';
    this.dlgEliminar = true;
  }

  cerrarEliminar(): void {
    this.dlgEliminar = false;
    this.productoEliminar = null;
    this.errorEliminar = '';
  }

  confirmarEliminar(): void {
    if (!this.productoEliminar || this.guardando) return;
    if (this.productoEliminar.stock > 0) {
      this.errorEliminar = `No se puede eliminar: el producto todavía tiene ${this.productoEliminar.stock} unidad(es).`;
      return;
    }
    this.guardando = true;
    this.inventarioService.eliminarProducto(this.productoEliminar.id).subscribe({
      next: () => {
        this.guardando = false;
        this.mostrarToast('ok', 'Producto eliminado.');
        this.cerrarEliminar();
        this.cargarDatos();
      },
      error: (err) => {
        this.guardando = false;
        const { errores, mensaje } = erroresDelServidor(err, 'No se pudo eliminar el producto.');
        this.errorEliminar = mensaje || Object.values(errores).join(' ');
        this.cdr.markForCheck();
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
    if (!this.puedeOperar || this.guardando) {
      return;
    }
    if (!this.movProducto) {
      this.errorMov = 'No se encontró el producto seleccionado.';
      return;
    }

    const errores: Errores = {};
    const cantidad = validarEntero(errores, 'cantidad', this.movCantidad, 'La cantidad', 1, STOCK_MAXIMO);
    if (errores['cantidad'] || cantidad === null) {
      this.errorMov = errores['cantidad'];
      return;
    }
    if (this.movTipo === 'Salida' && cantidad > this.movProducto.stock) {
      this.errorMov = `No hay existencias suficientes. Stock actual: ${this.movProducto.stock}.`;
      return;
    }
    if (this.movTipo === 'Entrada' && this.movProducto.stock + cantidad > STOCK_MAXIMO) {
      this.errorMov = `Con esta entrada el stock pasaría de ${STOCK_MAXIMO.toLocaleString('es-CO')}.`;
      return;
    }

    this.guardando = true;
    // el usuario que registra lo toma el back del token de la sesion
    this.inventarioService.crearMovimiento({
      id_producto: this.movProducto.id,
      id_tipo_movimiento: this.movTipo === 'Entrada' ? 1 : 2,
      cantidad
    }).subscribe({
      next: () => {
        this.guardando = false;
        this.mostrarToast('ok', `${this.movTipo} registrada correctamente`);
        this.cerrarMovimiento();
        this.cargarDatos();
      },
      error: (err) => {
        this.guardando = false;
        const { errores: delServidor, mensaje } = erroresDelServidor(err, 'Error al registrar el movimiento');
        this.errorMov = mensaje || Object.values(delServidor).join(' ');
        this.cdr.markForCheck();
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
    if (isNaN(fecha.getTime())) return '';
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
    clearTimeout(this.temporizadorToast);
    this.temporizadorToast = setTimeout(() => { this.toast = null; this.cdr.markForCheck(); }, 4500);
    this.cdr.markForCheck();
  }

  cerrarToast(): void {
    this.toast = null;
  }
}
