import { Component } from '@angular/core';

type RolInventario =
  | 'Gerente'
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
}

interface FormularioProducto {
  codigo: string;
  nombre: string;
  categoria: string;
  unidad: string;
  precio: number;
  stock: number;
  stockMinimo: number;
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
export class InventarioComponent {
  // Usuario y permisos
  rolActual: RolInventario = 'Gerente';
  usuarioActual = 'Lspatino';

  // Búsqueda
  busqueda = '';

  // Ventanas
  dlgProducto = false;
  dlgMovimiento = false;

  // Producto seleccionado
  editandoProducto: Producto | null = null;
  movProducto: Producto | null = null;

  // Movimiento de inventario
  movTipo: TipoMovimiento = 'Entrada';
  movCantidad = 1;

  // Validaciones
  errorProducto = '';
  errorMov = '';

  // Notificación
  toast: ToastInventario | null = null;

  private siguienteId = 5;
  private siguienteMovimientoId = 1;

  // Productos de demostración
  productos: Producto[] = [
    {
      id: 1,
      codigo: 'PRD-001',
      nombre: 'Portátil empresarial',
      categoria: 'Tecnología',
      unidad: 'Unidad',
      precio: 2450000,
      stock: 12,
      stockMinimo: 5,
      activo: true,
    },
    {
      id: 2,
      codigo: 'PRD-002',
      nombre: 'Mouse inalámbrico',
      categoria: 'Accesorios',
      unidad: 'Unidad',
      precio: 65000,
      stock: 4,
      stockMinimo: 8,
      activo: true,
    },
    {
      id: 3,
      codigo: 'PRD-003',
      nombre: 'Escritorio de oficina',
      categoria: 'Mobiliario',
      unidad: 'Unidad',
      precio: 580000,
      stock: 7,
      stockMinimo: 3,
      activo: true,
    },
    {
      id: 4,
      codigo: 'PRD-004',
      nombre: 'Teclado USB',
      categoria: 'Accesorios',
      unidad: 'Unidad',
      precio: 85000,
      stock: 0,
      stockMinimo: 5,
      activo: true,
    },
  ];

  // Historial de movimientos
  movimientos: MovimientoInventario[] = [];

  // Opciones de los formularios
  categorias: string[] = [
    'Ropa femenina',
    'Calzado',
    'Bolsos y carteras',
    'Accesorios de moda',
    'Belleza y cuidado personal',
    'Lencería y ropa interior',
    'Cuidado del cabello',
    'Hogar',
    'Tecnología y electrónica',
    'Papelería y oficina',
    'Alimentos y bebidas',
    'Deportes',
    'Juguetes',
    'Mascotas',
    'Otros'
  ];

  unidades: string[] = [
    'Unidad',
    'Caja',
    'Paquete',
    'Kg',
    'Litro',
  ];

  formProducto: FormularioProducto = this.formularioVacio();

  // ========================================
  // PERMISOS
  // ========================================

  get esGerente(): boolean {
    return this.rolActual === 'Gerente';
  }

  get puedeOperar(): boolean {
    return (
      this.rolActual === 'Gerente' ||
      this.rolActual === 'Auxiliar administrativo'
    );
  }

  // ========================================
  // ESTADÍSTICAS
  // ========================================

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
        (total, producto) =>
          total + producto.stock * producto.precio,
        0
      );
  }

  // ========================================
  // BÚSQUEDA Y FILTRADO
  // ========================================

  get productosFiltrados(): Producto[] {
    const termino = this.busqueda
      .trim()
      .toLocaleLowerCase('es-CO');

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

  // ========================================
  // FORMULARIO DE PRODUCTOS
  // ========================================

  private formularioVacio(): FormularioProducto {
    return {
      codigo: '',
      nombre: '',
      categoria: '',
      unidad: '',
      precio: 0,
      stock: 0,
      stockMinimo: 0,
    };
  }

  abrirProducto(producto?: Producto): void {
    if (!this.puedeOperar) {
      this.mostrarToast(
        'error',
        'No tienes permisos para gestionar productos.'
      );
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
      this.mostrarToast(
        'error',
        'No tienes permisos para esta acción.'
      );
      return;
    }

    const codigo = this.formProducto.codigo.trim().toUpperCase();
    const nombre = this.formProducto.nombre.trim();

    if (!codigo || !nombre) {
      this.errorProducto =
        'El código y el nombre son obligatorios.';
      return;
    }

    const codigoDuplicado = this.productos.some(
      (producto) =>
        producto.codigo.toUpperCase() === codigo &&
        producto.id !== this.editandoProducto?.id
    );

    if (codigoDuplicado) {
      this.errorProducto =
        'Ya existe un producto con ese código.';
      return;
    }

    if (!this.formProducto.categoria || !this.formProducto.unidad) {
      this.errorProducto =
        'Selecciona una categoría y una unidad.';
      return;
    }

    const precio = Number(this.formProducto.precio);
    const stock = Number(this.formProducto.stock);
    const stockMinimo = Number(this.formProducto.stockMinimo);

    if (!Number.isFinite(precio) || precio < 0) {
      this.errorProducto =
        'El precio debe ser un número válido no negativo.';
      return;
    }

    if (!Number.isInteger(stockMinimo) || stockMinimo < 0) {
      this.errorProducto =
        'El stock mínimo debe ser un entero no negativo.';
      return;
    }

    if (!this.editandoProducto) {
      if (!Number.isInteger(stock) || stock < 0) {
        this.errorProducto =
          'La cantidad inicial debe ser un entero no negativo.';
        return;
      }

      const nuevoProducto: Producto = {
        id: this.siguienteId++,
        codigo,
        nombre,
        categoria: this.formProducto.categoria,
        unidad: this.formProducto.unidad,
        precio,
        stock,
        stockMinimo,
        activo: true,
      };

      this.productos = [...this.productos, nuevoProducto];

      // Registrar el inventario inicial en el historial.
      if (stock > 0) {
        this.movimientos = [
          {
            id: this.siguienteMovimientoId++,
            productoId: nuevoProducto.id,
            codigo: nuevoProducto.codigo,
            producto: nuevoProducto.nombre,
            tipo: 'Entrada',
            cantidad: stock,
            stockAnterior: 0,
            stockNuevo: stock,
            fecha: new Date(),
            responsable: this.usuarioActual,
          },
          ...this.movimientos,
        ];
      }

      this.mostrarToast(
        'ok',
        'Producto registrado correctamente.'
      );
    } else {
      const id = this.editandoProducto.id;

      this.productos = this.productos.map((producto) =>
        producto.id === id
          ? {
              ...producto,
              codigo,
              nombre,
              categoria: this.formProducto.categoria,
              unidad: this.formProducto.unidad,
              precio,
              stockMinimo,
            }
          : producto
      );

      this.mostrarToast(
        'ok',
        'Producto actualizado correctamente.'
      );
    }

    this.cerrarProducto();
  }

  // ========================================
  // ACTIVAR Y DESACTIVAR PRODUCTOS
  // ========================================

  alternarEstado(producto: Producto): void {
    if (!this.puedeOperar) {
      this.mostrarToast(
        'error',
        'No tienes permisos para esta acción.'
      );
      return;
    }

    const nuevoEstado = !producto.activo;

    this.productos = this.productos.map((item) =>
      item.id === producto.id
        ? { ...item, activo: nuevoEstado }
        : item
    );

    if (!nuevoEstado && this.movProducto?.id === producto.id) {
      this.cerrarMovimiento();
    }

    this.mostrarToast(
      'ok',
      nuevoEstado
        ? 'Producto activado correctamente.'
        : 'Producto desactivado correctamente.'
    );
  }

  // ========================================
  // ENTRADAS Y SALIDAS
  // ========================================

  abrirMovimiento(
    producto: Producto,
    tipo: TipoMovimiento
  ): void {
    if (!this.puedeOperar) {
      this.mostrarToast(
        'error',
        'No tienes permisos para registrar movimientos.'
      );
      return;
    }

    if (!producto.activo) {
      this.mostrarToast(
        'alerta',
        'No puedes mover existencias de un producto inactivo.'
      );
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
      this.mostrarToast(
        'error',
        'No tienes permisos para esta acción.'
      );
      return;
    }

    if (!this.movProducto) {
      this.errorMov =
        'No se encontró el producto seleccionado.';
      return;
    }

    const producto = this.productos.find(
      (item) => item.id === this.movProducto?.id
    );

    if (!producto || !producto.activo) {
      this.errorMov =
        'El producto no existe o está inactivo.';
      return;
    }

    const cantidad = Number(this.movCantidad);

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      this.errorMov =
        'La cantidad debe ser un entero mayor que cero.';
      return;
    }

    if (this.movTipo === 'Salida' && cantidad > producto.stock) {
      this.errorMov =
        `No hay existencias suficientes. Stock actual: ${producto.stock}.`;
      return;
    }

    const stockAnterior = producto.stock;

    const stockNuevo =
      this.movTipo === 'Entrada'
        ? stockAnterior + cantidad
        : stockAnterior - cantidad;

    this.productos = this.productos.map((item) =>
      item.id === producto.id
        ? { ...item, stock: stockNuevo }
        : item
    );

    const movimiento: MovimientoInventario = {
      id: this.siguienteMovimientoId++,
      productoId: producto.id,
      codigo: producto.codigo,
      producto: producto.nombre,
      tipo: this.movTipo,
      cantidad,
      stockAnterior,
      stockNuevo,
      fecha: new Date(),
      responsable: this.usuarioActual,
    };

    this.movimientos = [movimiento, ...this.movimientos];

    const tipoRegistrado = this.movTipo;
    this.cerrarMovimiento();

    this.mostrarToast(
      'ok',
      `${tipoRegistrado} registrada correctamente. Nuevo stock: ${stockNuevo}.`
    );
  }

  // ========================================
  // PRESENTACIÓN Y FORMATO
  // ========================================

  nivel(producto: Producto): NivelStock {
    if (producto.stock === 0) {
      return 'Agotado';
    }

    if (producto.stock <= producto.stockMinimo) {
      return 'Stock bajo';
    }

    return 'Disponible';
  }

  moneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor);
  }

  formatearFecha(fecha: Date): string {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(fecha);
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

  // Para la tabla de productos.
  trackById(_index: number, producto: Producto): number {
    return producto.id;
  }

  // Para la tabla de movimientos.
  trackByMovimientoId(
    _index: number,
    movimiento: MovimientoInventario
  ): number {
    return movimiento.id;
  }

  // ========================================
  // NOTIFICACIONES
  // ========================================

  private mostrarToast(tipo: TipoToast, texto: string): void {
    this.toast = { tipo, texto };
  }

  cerrarToast(): void {
    this.toast = null;
  }
}

