import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Inventario } from '../../service/inventario';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Auth, ROL_GERENTE, ROL_ADMINISTRADOR, ROL_VENDEDOR } from '../../service/auth';
import {
  Errores, erroresDelServidor, limpiar, validarEntero, validarPrecio, validarTexto
} from '../../service/validaciones';

type TipoMovimiento = 'Entrada' | 'Salida';
type NivelStock = 'Disponible' | 'Stock bajo' | 'Agotado';
type TipoToast = 'ok' | 'alerta' | 'error';

type TipoReporte = 'ventas' | 'categorias' | 'rotacion';
type TipoColumna = 'texto' | 'numero' | 'moneda' | 'veces' | 'posicion';
type TonoReporte = 'azul' | 'cyan' | 'verde';
type TonoResumen = 'azul' | 'verde' | 'ambar' | 'rojo';

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
  costoUnitario: number;
}

interface Costeo {
  costoPromedio: number | null;
  costoTotal: number;
}

interface ToastInventario {
  tipo: TipoToast;
  texto: string;
}

interface OpcionReporte {
  tipo: TipoReporte;
  titulo: string;
  descripcion: string;
  icono: string;
  tono: TonoReporte;
}

interface ColumnaReporte {
  campo: string;
  titulo: string;
  tipo: TipoColumna;
  campoOrden?: string;
}

type FilaReporte = Record<string, string | number>;

interface ResumenReporte {
  etiqueta: string;
  valor: string;
  nota: string;
  icono: string;
  tono: TonoResumen;
}

interface ReporteGenerado {
  tipo: TipoReporte;
  titulo: string;
  descripcion: string;
  columnas: ColumnaReporte[];
  filas: FilaReporte[];
  resumen: ResumenReporte[];
}


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
  guardando = false;

  editandoProducto: Producto | null = null;
  movProducto: Producto | null = null;

  movTipo: TipoMovimiento = 'Entrada';
  movCantidad: number | null = 1;
  movCosto: number | null = null;

  errorProducto = '';
  erroresProducto: Errores = {};
  errorMov = '';
  toast: ToastInventario | null = null;
  private temporizadorToast: any = null;

  productos: Producto[] = [];
  movimientos: MovimientoInventario[] = [];
  categorias: Categoria[] = [];
  costeo: { [idProducto: number]: Costeo } = {};

  dlgReportes = false;
  fechaInicio = '';
  fechaFin = '';
  fechaMax = '';
  errorReporte = '';
  reporte: ReporteGenerado | null = null;
  exportandoPdf = false;

  ordenCampo = '';
  ordenAscendente = true;
  paginaReporte = 1;
  readonly filasPorPagina = 6;

  readonly opcionesReporte: OpcionReporte[] = [
    {
      tipo: 'ventas',
      titulo: 'Más y menos vendidos',
      descripcion: 'Compara unidades vendidas e ingresos por producto.',
      icono: 'pi-chart-bar',
      tono: 'azul'
    },
    {
      tipo: 'categorias',
      titulo: 'Desglose por categoría',
      descripcion: 'Agrupa existencias y calcula su valor acumulado.',
      icono: 'pi-box',
      tono: 'cyan'
    },
    {
      tipo: 'rotacion',
      titulo: 'Rotación de inventario',
      descripcion: 'Calcula costo vendido, inventario promedio y rotación.',
      icono: 'pi-sync',
      tono: 'verde'
    }
  ];


  listaUnidadesMedida: string[] = ['Unidad', 'Par', 'Caja', 'Paquete', 'Metro', 'Kilogramo'];

  formProducto: FormularioProducto = this.formularioVacio();

  constructor(private inventarioService: Inventario, private auth: Auth, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarDatos();
  }

  get puedeGestionarProductos(): boolean {
    return this.auth.tieneRol(ROL_ADMINISTRADOR);
  }

  get puedeOperar(): boolean {
    return this.auth.tieneRol(ROL_ADMINISTRADOR, ROL_VENDEDOR);
  }

  get esGerente(): boolean {
    return this.auth.tieneRol(ROL_GERENTE);
  }

  get veInactivos(): boolean {
    return this.auth.tieneRol(ROL_GERENTE, ROL_ADMINISTRADOR);
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

          this.productos = this.veInactivos ? lista : lista.filter(p => p.activo);
          this.calcularCosteo();
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
            responsable: m.usuario,
            costoUnitario: Number(m.costo_unitario) || 0
          }));
          this.calcularCosteo();
        }
        this.cdr.markForCheck();
      },
      error: () => {

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

  get costoInventario(): number {
    return this.productosActivos.reduce((total, p) => total + (this.costeo[p.id]?.costoTotal ?? 0), 0);
  }

  get movimientosVisibles(): MovimientoInventario[] {
    if (this.veInactivos) return this.movimientos;
    const ids = new Set(this.productos.map(p => p.id));
    return this.movimientos.filter(m => ids.has(m.productoId));
  }

  costoPromedio(producto: Producto): number | null {
    return this.costeo[producto.id]?.costoPromedio ?? null;
  }

  private calcularCosteo(): void {
    const resultado: { [id: number]: Costeo } = {};
    const ordenados = [...this.movimientos].sort((a, b) => (a.fecha.getTime() - b.fecha.getTime()) || (a.id - b.id));
    for (const p of this.productos) {
      const movs = ordenados.filter(m => m.productoId === p.id);
      const entradas = movs.filter(m => m.tipo === 'Entrada').reduce((t, m) => t + m.cantidad, 0);
      const salidas = movs.filter(m => m.tipo === 'Salida').reduce((t, m) => t + m.cantidad, 0);
      let existencias = Math.max(0, p.stock - entradas + salidas);
      let promedio: number | null = null;
      for (const m of movs) {
        if (m.tipo === 'Entrada') {
          const anterior: number = promedio ?? m.costoUnitario;
          const total: number = existencias + m.cantidad;
          promedio = total > 0 ? (existencias * anterior + m.cantidad * m.costoUnitario) / total : m.costoUnitario;
          existencias = total;
        } else {
          existencias = Math.max(0, existencias - m.cantidad);
        }
      }
      resultado[p.id] = {
        costoPromedio: promedio !== null ? Math.round(promedio * 100) / 100 : null,
        costoTotal: promedio !== null ? Math.round(promedio * p.stock * 100) / 100 : 0
      };
    }
    this.costeo = resultado;
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
    if (!this.puedeGestionarProductos) {
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
    if (!errores['unidad_medida'] && f.unidad && !this.listaUnidadesMedida.includes(f.unidad)) {
      errores['unidad_medida'] = 'La unidad de medida no es válida';
    }
    if (f.id_categoria && !this.categorias.some(c => c.id_categoria === Number(f.id_categoria))) {
      errores['id_categoria'] = 'La categoría seleccionada no existe';
    }

    const costo = this.editandoProducto ? this.costoPromedio(this.editandoProducto) : null;
    if (!errores['precio_venta'] && costo !== null && Number(f.precio) < costo) {
      errores['precio_venta'] = `El precio no puede ser menor que el costo promedio (${this.moneda(costo)})`;
    }
    return errores;
  }

  guardarProducto(): void {
    if (!this.puedeGestionarProductos || this.guardando) {
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

  puedeInactivar(producto: Producto): boolean {
    return !producto.activo || producto.stock === 0;
  }

  alternarEstado(producto: Producto): void {
    if (this.guardando) return;
    if (!this.puedeGestionarProductos) {
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

    this.guardando = true;
    this.inventarioService.actualizarProducto(producto.id, payload).subscribe({
      next: () => {
        this.guardando = false;
        this.mostrarToast('ok', activar ? 'Producto activado correctamente.' : 'Producto inactivado correctamente.');
        this.cargarDatos();
      },
      error: (err) => {
        this.guardando = false;
        const { errores, mensaje } = erroresDelServidor(err, 'No se pudo cambiar el estado.');
        this.mostrarToast('error', mensaje || Object.values(errores).join(' '));
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

    this.movCosto = this.costoPromedio(producto);
    this.errorMov = '';
    this.dlgMovimiento = true;
  }

  cerrarMovimiento(): void {
    this.dlgMovimiento = false;
    this.errorMov = '';
    this.movProducto = null;
    this.movCantidad = 1;
    this.movCosto = null;
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

    let costoUnitario: number | null = null;
    if (this.movTipo === 'Entrada') {
      costoUnitario = validarPrecio(errores, 'costo_unitario', this.movCosto, 'El costo unitario', PRECIO_MAXIMO);
      if (errores['costo_unitario'] || costoUnitario === null) {
        this.errorMov = errores['costo_unitario'];
        return;
      }
      if (costoUnitario > this.movProducto.precio) {
        this.errorMov = `El costo unitario no puede ser mayor que el precio de venta (${this.moneda(this.movProducto.precio)}).`;
        return;
      }
    } else {
      costoUnitario = this.costoPromedio(this.movProducto);
    }

    this.guardando = true;
    this.inventarioService.crearMovimiento({
      id_producto: this.movProducto.id,
      id_tipo_movimiento: this.movTipo === 'Entrada' ? 1 : 2,
      cantidad,
      ...(costoUnitario !== null ? { costo_unitario: costoUnitario } : {})
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
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


  abrirReportes(): void {
    if (!this.esGerente) {
      this.mostrarToast('error', 'No tienes permisos para consultar reportes.');
      return;
    }

    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 29);

    this.fechaMax = this.fechaISO(hoy);
    this.fechaFin = this.fechaISO(hoy);
    this.fechaInicio = this.fechaISO(inicio);

    this.errorReporte = '';
    this.reporte = null;
    this.dlgReportes = true;
  }

  cerrarReportes(): void {
    this.dlgReportes = false;
    this.errorReporte = '';
    this.reporte = null;
    this.exportandoPdf = false;
  }

  alCambiarFechas(): void {
    this.errorReporte = '';
    this.reporte = null;
  }

  generarReporte(tipo: TipoReporte): void {
    const rango = this.obtenerRango();

    if (!rango) {
      return;
    }

    this.errorReporte = '';
    this.ordenCampo = '';
    this.ordenAscendente = true;
    this.paginaReporte = 1;

    const periodo =
      `${rango.inicio.toLocaleDateString('es-CO')} – ${rango.fin.toLocaleDateString('es-CO')}`;

    if (tipo === 'ventas') {
      this.reporte = this.reporteVentas(rango.inicio, rango.fin, periodo);
    } else if (tipo === 'categorias') {
      this.reporte = this.reporteCategorias();
    } else {
      this.reporte = this.reporteRotacion(rango.inicio, rango.fin, periodo);
    }
  }

  private reporteVentas(inicio: Date, fin: Date, periodo: string): ReporteGenerado {
    const salidas = this.movimientos.filter(
      (m) => m.tipo === 'Salida' && m.fecha >= inicio && m.fecha <= fin
    );

    const ventas = this.productos
      .map((producto) => {
        const unidades = salidas
          .filter((m) => m.productoId === producto.id)
          .reduce((total, m) => total + m.cantidad, 0);

        return { producto, unidades, ingresos: unidades * producto.precio };
      })
      .filter((item) => item.unidades > 0)
      .sort((a, b) => b.unidades - a.unidades);

    const filas: FilaReporte[] = ventas.map((item, indice) => ({
      posicion:
        indice === 0
          ? 'Más vendido'
          : indice === ventas.length - 1
            ? 'Menos vendido'
            : `${indice + 1}°`,
      orden: indice,
      codigo: item.producto.codigo,
      producto: item.producto.nombre,
      categoria: item.producto.categoria,
      unidades: item.unidades,
      ingresos: item.ingresos
    }));

    return {
      tipo: 'ventas',
      titulo: 'Productos más y menos vendidos',
      descripcion: `Volumen de ventas registrado entre ${periodo}.`,
      columnas: [
        { campo: 'posicion', titulo: 'Posición', tipo: 'posicion', campoOrden: 'orden' },
        { campo: 'codigo', titulo: 'Código', tipo: 'texto' },
        { campo: 'producto', titulo: 'Producto', tipo: 'texto' },
        { campo: 'categoria', titulo: 'Categoría', tipo: 'texto' },
        { campo: 'unidades', titulo: 'Unidades', tipo: 'numero' },
        { campo: 'ingresos', titulo: 'Valor recaudado', tipo: 'moneda' }
      ],
      filas,
      resumen: [
        {
          etiqueta: 'Unidades vendidas',
          valor: ventas.reduce((total, item) => total + item.unidades, 0).toString(),
          nota: 'Salidas registradas en el período',
          icono: 'pi-shopping-cart',
          tono: 'azul'
        },
        {
          etiqueta: 'Ingresos del período',
          valor: this.moneda(ventas.reduce((total, item) => total + item.ingresos, 0)),
          nota: 'Unidades vendidas por precio de venta',
          icono: 'pi-wallet',
          tono: 'verde'
        }
      ]
    };
  }

  private reporteCategorias(): ReporteGenerado {
    const activos = this.productos.filter((p) => p.activo);

    const agrupado = Array.from(new Set(activos.map((p) => p.categoria)))
      .map((categoria) => {
        const lista = activos.filter((p) => p.categoria === categoria);

        return {
          categoria,
          productos: lista.length,
          unidades: lista.reduce((total, p) => total + p.stock, 0),
          valor: lista.reduce((total, p) => total + (p.stock * p.precio), 0)
        };
      })
      .sort((a, b) => b.valor - a.valor);

    return {
      tipo: 'categorias',
      titulo: 'Desglose de inventario por categoría',
      descripcion: 'Existencias actuales de los productos activos, agrupadas por categoría.',
      columnas: [
        { campo: 'categoria', titulo: 'Categoría', tipo: 'texto' },
        { campo: 'productos', titulo: 'Productos', tipo: 'numero' },
        { campo: 'unidades', titulo: 'Unidades disponibles', tipo: 'numero' },
        { campo: 'valor', titulo: 'Valor acumulado', tipo: 'moneda' }
      ],
      filas: agrupado.map((item) => ({
        categoria: item.categoria,
        productos: item.productos,
        unidades: item.unidades,
        valor: item.valor
      })),
      resumen: [
        {
          etiqueta: 'Categorías',
          valor: agrupado.length.toString(),
          nota: 'Categorías con productos activos',
          icono: 'pi-th-large',
          tono: 'azul'
        },
        {
          etiqueta: 'Valor total',
          valor: this.moneda(agrupado.reduce((total, item) => total + item.valor, 0)),
          nota: 'Valor de todas las existencias',
          icono: 'pi-wallet',
          tono: 'verde'
        }
      ]
    };
  }

  private reporteRotacion(inicio: Date, fin: Date, periodo: string): ReporteGenerado {
    const desdeInicio = this.movimientos.filter((m) => m.fecha >= inicio);

    const rotacion = this.productos
      .filter((p) => p.activo)
      .map((producto) => {
        const movs = desdeInicio.filter((m) => m.productoId === producto.id);
        const enRango = movs.filter((m) => m.fecha <= fin);
        const despues = movs.filter((m) => m.fecha > fin);

        const costoVendido = enRango
          .filter((m) => m.tipo === 'Salida')
          .reduce((total, m) => total + m.cantidad * (m.costoUnitario || producto.precio), 0);
        const costoUnidad = this.costoPromedio(producto) ?? producto.precio;

        const stockInicial = Math.max(
          0,
          producto.stock - this.sumarMovimientos(movs, 'Entrada') + this.sumarMovimientos(movs, 'Salida')
        );
        const stockFinal = Math.max(
          0,
          producto.stock - this.sumarMovimientos(despues, 'Entrada') + this.sumarMovimientos(despues, 'Salida')
        );

        const inventarioPromedio = ((stockInicial + stockFinal) / 2) * costoUnidad;
        const indice = inventarioPromedio > 0 ? costoVendido / inventarioPromedio : 0;

        return { producto, costoVendido, inventarioPromedio, indice };
      })
      .filter((item) => item.costoVendido > 0)
      .sort((a, b) => b.indice - a.indice);

    const promedio = rotacion.length
      ? rotacion.reduce((total, item) => total + item.indice, 0) / rotacion.length
      : 0;

    return {
      tipo: 'rotacion',
      titulo: 'Rotación de inventario',
      descripcion: `Cálculo financiero basado en los movimientos ocurridos entre ${periodo}.`,
      columnas: [
        { campo: 'codigo', titulo: 'Código', tipo: 'texto' },
        { campo: 'producto', titulo: 'Producto', tipo: 'texto' },
        { campo: 'costo', titulo: 'Costo mercancía vendida', tipo: 'moneda' },
        { campo: 'promedio', titulo: 'Inventario promedio', tipo: 'moneda' },
        { campo: 'indice', titulo: 'Índice de rotación', tipo: 'veces' }
      ],
      filas: rotacion.map((item) => ({
        codigo: item.producto.codigo,
        producto: item.producto.nombre,
        costo: item.costoVendido,
        promedio: item.inventarioPromedio,
        indice: item.indice
      })),
      resumen: [
        {
          etiqueta: 'Costo total vendido',
          valor: this.moneda(rotacion.reduce((total, item) => total + item.costoVendido, 0)),
          nota: 'Costo de la mercancía vendida',
          icono: 'pi-dollar',
          tono: 'ambar'
        },
        {
          etiqueta: 'Rotación promedio',
          valor: `${promedio.toFixed(2)} veces`,
          nota: 'Promedio entre los productos vendidos',
          icono: 'pi-sync',
          tono: 'verde'
        }
      ]
    };
  }

  private sumarMovimientos(lista: MovimientoInventario[], tipo: TipoMovimiento): number {
    return lista
      .filter((m) => m.tipo === tipo)
      .reduce((total, m) => total + m.cantidad, 0);
  }

  private obtenerRango(): { inicio: Date; fin: Date } | null {
    if (!this.fechaInicio || !this.fechaFin) {
      this.errorReporte = 'Selecciona una fecha inicial y una fecha final para generar el reporte.';
      this.reporte = null;
      return null;
    }

    const inicio = this.aFechaLocal(this.fechaInicio, false);
    const fin = this.aFechaLocal(this.fechaFin, true);

    if (inicio > fin) {
      this.errorReporte = 'La fecha inicial no puede ser posterior a la fecha final.';
      this.reporte = null;
      return null;
    }

    return { inicio, fin };
  }

  private aFechaLocal(valor: string, finDeDia: boolean): Date {
    const [anio, mes, dia] = valor.split('-').map(Number);

    return finDeDia
      ? new Date(anio, mes - 1, dia, 23, 59, 59, 999)
      : new Date(anio, mes - 1, dia);
  }

  private fechaISO(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }


  ordenarPor(columna: ColumnaReporte): void {
    const campo = columna.campoOrden ?? columna.campo;

    if (this.ordenCampo === campo) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.ordenCampo = campo;
      this.ordenAscendente = true;
    }

    this.paginaReporte = 1;
  }

  esOrdenActual(columna: ColumnaReporte): boolean {
    return this.ordenCampo === (columna.campoOrden ?? columna.campo);
  }

  get filasOrdenadas(): FilaReporte[] {
    if (!this.reporte) {
      return [];
    }

    const filas = [...this.reporte.filas];

    if (!this.ordenCampo) {
      return filas;
    }

    const campo = this.ordenCampo;
    const factor = this.ordenAscendente ? 1 : -1;

    return filas.sort((a, b) => {
      const x = a[campo];
      const y = b[campo];

      if (typeof x === 'number' && typeof y === 'number') {
        return (x - y) * factor;
      }

      return String(x).localeCompare(String(y), 'es-CO') * factor;
    });
  }

  get filasPagina(): FilaReporte[] {
    const desde = (this.paginaReporte - 1) * this.filasPorPagina;

    return this.filasOrdenadas.slice(desde, desde + this.filasPorPagina);
  }

  get totalPaginasReporte(): number {
    const total = this.reporte?.filas.length ?? 0;

    return Math.max(1, Math.ceil(total / this.filasPorPagina));
  }

  get rangoDesde(): number {
    const total = this.reporte?.filas.length ?? 0;

    return total === 0 ? 0 : (this.paginaReporte - 1) * this.filasPorPagina + 1;
  }

  get rangoHasta(): number {
    const total = this.reporte?.filas.length ?? 0;

    return Math.min(this.paginaReporte * this.filasPorPagina, total);
  }

  paginaAnterior(): void {
    if (this.paginaReporte > 1) {
      this.paginaReporte--;
    }
  }

  paginaSiguiente(): void {
    if (this.paginaReporte < this.totalPaginasReporte) {
      this.paginaReporte++;
    }
  }

  valorCelda(columna: ColumnaReporte, fila: FilaReporte): string {
    const valor = fila[columna.campo];

    if (columna.tipo === 'moneda') {
      return this.moneda(Number(valor));
    }

    if (columna.tipo === 'veces') {
      return `${Number(valor).toFixed(2)} veces`;
    }

    return String(valor);
  }

  claseBadgePosicion(valor: string | number): string {
    if (valor === 'Más vendido') return 'badge-verde';
    if (valor === 'Menos vendido') return 'badge-ambar';
    return '';
  }

  trackByColumna(_index: number, columna: ColumnaReporte): string {
    return columna.campo;
  }

  async descargarPdf(): Promise<void> {
    if (!this.reporte || this.exportandoPdf) {
      return;
    }

    const reporte = this.reporte;
    this.exportandoPdf = true;


    try {
      const doc = new jsPDF({
        orientation: reporte.columnas.length > 5 ? 'landscape' : 'portrait'
      });


      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 34, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('Stockly', 14, 14);
      doc.setFontSize(12);
      doc.text(reporte.titulo, 14, 24);
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(9);
      doc.text(reporte.descripcion, 14, 42);

      autoTable(doc, {
        startY: 49,
        head: [reporte.columnas.map((columna) => columna.titulo)],
        body: this.filasOrdenadas.map((fila) =>
          reporte.columnas.map((columna) => this.valorCelda(columna, fila))
        ),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [30, 64, 175], textColor: 255 },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        margin: { left: 14, right: 14 }
      });

      doc.save(`stockly-${reporte.tipo}-${this.fechaInicio}-${this.fechaFin}.pdf`);
      this.mostrarToast('ok', 'Reporte PDF descargado correctamente.');
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      this.mostrarToast('error', 'No se pudo generar el PDF. Verifica que jspdf y jspdf-autotable estén instalados.');
    } finally {
      this.exportandoPdf = false;
      this.cdr.markForCheck();
    }
  }
}
