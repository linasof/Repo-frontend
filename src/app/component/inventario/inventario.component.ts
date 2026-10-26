import { Component, OnInit } from '@angular/core';
import { Inventario } from '../../service/inventario';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type RolInventario =
  | 'Administrador'
  | 'Auxiliar administrativo'
  | 'Vendedor';

type TipoMovimiento = 'Entrada' | 'Salida';
type NivelStock = 'Disponible' | 'Stock bajo' | 'Agotado';
type TipoToast = 'ok' | 'alerta' | 'error';

/* ===== REPORTES: tipos ===== */
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

/* ===== REPORTES: interfaces ===== */
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

  /* ===== REPORTES: estado ===== */
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

  /* =====================================================
     REPORTES
     ===================================================== */

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
          nota: 'Unidades vendidas por precio unitario',
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

        const unidadesVendidas = this.sumarMovimientos(enRango, 'Salida');
        const costoVendido = unidadesVendidas * producto.precio;

        const stockInicial = Math.max(
          0,
          producto.stock - this.sumarMovimientos(movs, 'Entrada') + this.sumarMovimientos(movs, 'Salida')
        );
        const stockFinal = Math.max(
          0,
          producto.stock - this.sumarMovimientos(despues, 'Entrada') + this.sumarMovimientos(despues, 'Salida')
        );

        const inventarioPromedio = ((stockInicial + stockFinal) / 2) * producto.precio;
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

  /* ----- Tabla de la vista previa: orden y paginación ----- */

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

  /* ----- Descarga en PDF ----- */

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
    }
  }
}
