import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Usuario } from '../../model/usuario';
import { UsuarioService } from '../../service/usuario.service';
import { Auth, ROL_GERENTE, ROL_ADMINISTRADOR } from '../../service/auth';
import { AuditoriaService, RegistroBitacora } from '../../service/auditoria.service';
import {
  Errores, erroresDelServidor, limpiar, validarContrasenia, validarCorreo, validarDocumento,
  validarNombrePersona, validarNombreUsuario
} from '../../service/validaciones';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.componentes.html',
  styleUrls: ['./usuarios.componentes.css'],
  standalone: false
})
export class UsuariosComponentes implements OnInit {

  vistaActual: string = 'usuarios';
  usuarioActualId: number = 0;
  usuarioSesion: Usuario | null = null;

  listaUsuarios: Usuario[] = [];

  totalUsuarios: number = 0;
  usuariosActivos: number = 0;
  usuariosInactivos: number = 0;
  usuariosSuspendidos: number = 0;

  busqueda: string = '';
  filtroRol: string = '';
  filtroEstado: string = '';
  
  roles: string[] = ['Gerente', 'Administrador', 'Vendedor'];
  idsRol: number[] = [1, 2, 4]; 
  estados: string[] = ['Contratado', 'Suspendido', 'En vacaciones', 'Retirado'];
  idsEstado: { [nombre: string]: number } = { 'Contratado': 1, 'Suspendido': 2, 'En vacaciones': 3, 'Retirado': 4 };

  dlgUsuario: boolean = false;
  editandoUsuario: boolean = false;
  dlgEstado: boolean = false;
  guardando: boolean = false;

  formUsuario!: Usuario;
  usuarioEstado: Usuario | null = null;
  nuevoEstado: string = '';
  errorEstado: string = '';
  errorUsuario: string = '';
  erroresUsuario: Errores = {};

  formClave = { actual: '', nueva: '', confirmacion: '' };
  erroresClave: Errores = {};
  errorClave: string = '';
  verClaves: boolean = false;

  toast: { tipo: string, texto: string } | null = null;
  private temporizadorToast: any = null;
  historialAuditoria: RegistroBitacora[] = [];
  cargandoAuditoria: boolean = false;

  constructor(
    private usuarioService: UsuarioService,
    private cdr: ChangeDetectorRef,
    private auth: Auth,
    private auditoriaService: AuditoriaService
  ) {}

  get puedeGestionarUsuarios(): boolean {
    return this.auth.tieneRol(ROL_ADMINISTRADOR);
  }

  get puedeVerAuditoria(): boolean {
    return this.auth.tieneRol(ROL_GERENTE, ROL_ADMINISTRADOR);
  }

  get usuariosFiltrados(): Usuario[] {
    const termino = this.busqueda.trim().toLocaleLowerCase('es-CO');
    return this.listaUsuarios.filter(u => {
      const texto = [u.primer_nombre, u.segundo_nombre, u.primer_apellido, u.segundo_apellido,
        u.nombre_usuario, u.correo, u.numero_documento, u.nombre_rol]
        .filter(Boolean).join(' ').toLocaleLowerCase('es-CO');
      return (!termino || texto.includes(termino))
        && (!this.filtroRol || u.nombre_rol === this.filtroRol)
        && (!this.filtroEstado || u.nombre_estado_usuario === this.filtroEstado);
    });
  }

  ngOnInit(): void {
  
    const sesion = this.auth.obtenerSesion();
    if (sesion) {
      this.usuarioActualId = sesion.id_usuario;
    }
    this.formUsuario = this.inicializarUsuarioVacio();
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.usuarioService.getUsuarios().subscribe({
      next: (respuesta: any) => {
        const datos: any[] = Array.isArray(respuesta?.data) ? respuesta.data : [];
        this.listaUsuarios = datos.map((u: any) => ({
          ...u,
          nombre_rol: u.nombre_rol || u.rol || 'Sin rol',
          nombre_estado_usuario: u.nombre_estado_usuario || u.estado || 'Contratado',
          nombre_tipo_documento: u.nombre_tipo_documento || u.tipo_documento || ''
        }));
        this.calcularEstadisticas();
        this.usuarioSesion = this.listaUsuarios.find(u => u.id_usuario === this.usuarioActualId) || null;
        this.cdr.markForCheck(); 
      },
      error: (err) => {
        const { mensaje } = erroresDelServidor(err, 'No se pudieron cargar los usuarios.');
        this.mostrarToast('error', mensaje || 'No se pudieron cargar los usuarios.');
      }
    });
  }

  private validarFormulario(): Errores {
    const f = this.formUsuario;
    const errores: Errores = {};
    validarNombreUsuario(errores, 'nombre_usuario', f.nombre_usuario);
    validarNombrePersona(errores, 'primer_nombre', f.primer_nombre, 'El primer nombre');
    validarNombrePersona(errores, 'segundo_nombre', f.segundo_nombre, 'El segundo nombre', false);
    validarNombrePersona(errores, 'primer_apellido', f.primer_apellido, 'El primer apellido');
    validarNombrePersona(errores, 'segundo_apellido', f.segundo_apellido, 'El segundo apellido', false);
    validarCorreo(errores, 'correo', f.correo);
    if (!this.editandoUsuario) {
      validarDocumento(errores, 'numero_documento', f.numero_documento, Number(f.id_tipo_documento));
    }
    if (!this.idsRol.includes(Number(f.id_rol))) errores['id_rol'] = 'Selecciona un rol válido';
    if (![1, 2].includes(Number(f.id_tipo_documento))) errores['id_tipo_documento'] = 'Selecciona un tipo de documento válido';
    if (this.editandoUsuario) {

      const original = this.listaUsuarios.find(u => u.id_usuario === f.id_usuario);
      if (!Object.values(this.idsEstado).includes(Number(f.id_estado_usuario))) {
        errores['id_estado_usuario'] = 'Selecciona un estado válido';
      } else if (f.id_usuario === this.usuarioActualId && original && Number(original.id_estado_usuario) !== Number(f.id_estado_usuario)) {
        errores['id_estado_usuario'] = 'No puedes cambiar tu propio estado';
      }
      if (f.id_usuario === this.usuarioActualId && original && Number(original.id_rol) !== Number(f.id_rol)) {
        errores['id_rol'] = 'No puedes cambiar tu propio rol';
      }
    }
    if (!errores['segundo_nombre'] && f.segundo_nombre && limpiar(f.segundo_nombre).toLowerCase() === limpiar(f.primer_nombre).toLowerCase()) {
      errores['segundo_nombre'] = 'El segundo nombre no puede ser igual al primero';
    }

    return errores;
  }

  guardarUsuario(): void {
    if (this.guardando) return;
    this.errorUsuario = '';
    this.erroresUsuario = this.validarFormulario();
    if (Object.keys(this.erroresUsuario).length) {
      this.errorUsuario = 'Revisa los campos marcados en rojo.';
      return;
    }

    const f = this.formUsuario;
    const datos: any = {
      nombre_usuario: limpiar(f.nombre_usuario),
      primer_nombre: limpiar(f.primer_nombre),
      segundo_nombre: limpiar(f.segundo_nombre) || null,
      primer_apellido: limpiar(f.primer_apellido),
      segundo_apellido: limpiar(f.segundo_apellido) || null,
      correo: limpiar(f.correo).toLowerCase(),
      numero_documento: limpiar(f.numero_documento),
      id_rol: Number(f.id_rol),
      id_tipo_documento: Number(f.id_tipo_documento),
    };

    this.guardando = true;
    const peticion = this.editandoUsuario && f.id_usuario
      ? this.usuarioService.actualizarUsuario(f.id_usuario, { ...datos, id_estado_usuario: Number(f.id_estado_usuario) })
      : this.usuarioService.crearUsuario(datos);

    peticion.subscribe({
      next: (respuesta: any) => {
        this.guardando = false;
        this.mostrarToast('ok', this.editandoUsuario
          ? 'Usuario actualizado correctamente.'
          : (respuesta?.message || 'Usuario creado. La contraseña se envió a su correo.'));
        this.cerrarUsuario();
        this.cargarUsuarios();
      },
      error: (err) => {
        this.guardando = false;
        const { errores, mensaje } = erroresDelServidor(err, 'No se pudo guardar el usuario.');
        this.erroresUsuario = errores;
        this.errorUsuario = mensaje || 'Revisa los campos marcados en rojo.';
        this.cdr.markForCheck();
      }
    });
  }

  abrirUsuario(usuario?: Usuario): void {
    if (!this.puedeGestionarUsuarios) {
      this.mostrarToast('error', 'Tu rol no puede crear ni editar usuarios.');
      return;
    }
    if (usuario) {
      this.editandoUsuario = true;
      this.formUsuario = {
        ...usuario,
        id_estado_usuario: usuario.id_estado_usuario || this.idsEstado[usuario.nombre_estado_usuario || ''] || 1
      };
    } else {
      this.editandoUsuario = false;
      this.formUsuario = this.inicializarUsuarioVacio();
    }
    this.errorUsuario = '';
    this.erroresUsuario = {};
    this.dlgUsuario = true;
  }

  cerrarUsuario(): void { this.dlgUsuario = false; this.erroresUsuario = {}; this.errorUsuario = ''; }

  abrirCambioEstado(usuario: Usuario): void {
    if (!this.puedeGestionarUsuarios || usuario.id_usuario === this.usuarioActualId) return;
    this.usuarioEstado = usuario;
    this.nuevoEstado = usuario.nombre_estado_usuario || '';
    this.errorEstado = '';
    this.dlgEstado = true;
  }

  cerrarCambioEstado(): void { this.dlgEstado = false; this.usuarioEstado = null; }

  guardarEstado(): void {
    this.errorEstado = '';
    if (!this.usuarioEstado || !this.usuarioEstado.id_usuario || this.guardando) {
      return;
    }
    const idEstado = this.idsEstado[this.nuevoEstado];
    if (!idEstado) {
      this.errorEstado = 'Selecciona un estado.';
      return;
    }
    if (this.usuarioEstado.id_usuario === this.usuarioActualId) {
      this.errorEstado = 'No puedes cambiar tu propio estado.';
      return;
    }
    if (this.nuevoEstado === this.usuarioEstado.nombre_estado_usuario) {
      this.errorEstado = 'El usuario ya está en ese estado.';
      return;
    }

    const u = this.usuarioEstado;
    const datos: any = {
      nombre_usuario: u.nombre_usuario, primer_nombre: u.primer_nombre, segundo_nombre: u.segundo_nombre,
      primer_apellido: u.primer_apellido, segundo_apellido: u.segundo_apellido, correo: u.correo,
      numero_documento: u.numero_documento, id_rol: u.id_rol, id_tipo_documento: u.id_tipo_documento,
      id_estado_usuario: idEstado
    };
    this.guardando = true;
    this.usuarioService.actualizarUsuario(u.id_usuario!, datos).subscribe({
      next: () => {
        this.guardando = false;
        this.mostrarToast('ok', 'Estado actualizado.');
        this.cerrarCambioEstado();
        this.cargarUsuarios();
      },
      error: (err) => {
        this.guardando = false;
        const { errores, mensaje } = erroresDelServidor(err, 'No se pudo cambiar el estado.');
        this.errorEstado = mensaje || Object.values(errores).join(' ');
        this.cdr.markForCheck();
      }
    });
  }

  abrirPerfil(): void {
    this.vistaActual = 'perfil';
    this.formClave = { actual: '', nueva: '', confirmacion: '' };
    this.erroresClave = {};
    this.errorClave = '';
  }

  cambiarContrasenia(): void {
    if (this.guardando) return;
    const errores: Errores = {};
    if (!this.formClave.actual) errores['contrasenia_actual'] = 'Escribe tu contraseña actual';
    validarContrasenia(errores, 'contrasenia_nueva', this.formClave.nueva, 'La nueva contraseña');
    if (!errores['contrasenia_nueva'] && this.formClave.nueva === this.formClave.actual) {
      errores['contrasenia_nueva'] = 'La nueva contraseña debe ser diferente a la actual';
    }
    if (this.formClave.nueva && this.formClave.confirmacion !== this.formClave.nueva) {
      errores['confirmacion'] = 'Las contraseñas no coinciden';
    }
    this.erroresClave = errores;
    this.errorClave = '';
    if (Object.keys(errores).length) return;

    this.guardando = true;
    this.auth.cambiarContrasenia(this.formClave.actual, this.formClave.nueva, this.formClave.confirmacion).subscribe({
      next: () => {
        this.guardando = false;
        this.formClave = { actual: '', nueva: '', confirmacion: '' };
        this.mostrarToast('ok', 'Contraseña actualizada.');
      },
      error: (err) => {
        this.guardando = false;
        const { errores: delServidor, mensaje } = erroresDelServidor(err, 'No se pudo cambiar la contraseña.');
        this.erroresClave = delServidor;
        this.errorClave = mensaje;
        this.cdr.markForCheck();
      }
    });
  }

  abrirAuditoria(): void {
    this.vistaActual = 'auditoria';
    this.cargarHistorialAuditoria();
  }

  cargarHistorialAuditoria(): void {
    this.cargandoAuditoria = true;
    this.auditoriaService.obtenerHistorial().subscribe({
      next: (respuesta) => {
        if (respuesta.status === 'success') {
          this.historialAuditoria = respuesta.data;
        }
        this.cargandoAuditoria = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargandoAuditoria = false;
        const { mensaje } = erroresDelServidor(err, 'No se pudo cargar la auditoría.');
        this.mostrarToast('error', mensaje || 'No se pudo cargar la auditoría.');
      }
    });
  }

  abrirListado(): void { this.vistaActual = 'usuarios'; }

  inicializarUsuarioVacio(): Usuario {
    return {
      nombre_usuario: '', primer_nombre: '', segundo_nombre: '',
      primer_apellido: '', segundo_apellido: '',
      correo: '', numero_documento: '',
      id_rol: 4, id_tipo_documento: 1, id_estado_usuario: 1
    };
  }

  calcularEstadisticas(): void {
    this.totalUsuarios = this.listaUsuarios.length;

    this.usuariosActivos = this.listaUsuarios.filter(u => u.nombre_estado_usuario === 'Contratado' || u.nombre_estado_usuario === 'En vacaciones').length;
    this.usuariosInactivos = this.listaUsuarios.filter(u => u.nombre_estado_usuario === 'Retirado').length;
    this.usuariosSuspendidos = this.listaUsuarios.filter(u => u.nombre_estado_usuario === 'Suspendido').length;
  }

  limpiarFiltros(): void { this.busqueda = ''; this.filtroRol = ''; this.filtroEstado = ''; }

  mostrarToast(tipo: string, texto: string): void {
    this.toast = { tipo, texto };
    clearTimeout(this.temporizadorToast);
    this.temporizadorToast = setTimeout(() => { this.cerrarToast(); this.cdr.markForCheck(); }, 4500);
    this.cdr.markForCheck();
  }

  cerrarToast(): void { this.toast = null; }
  trackById(index: number, item: Usuario): any { return item.id_usuario; }
  claseRol(rol?: string): string { if (rol === 'Gerente') return 'badge-info'; if (rol === 'Vendedor') return 'badge-purpura'; return 'badge-gris'; }
  claseEstado(estado?: string): string { if (estado === 'Contratado') return 'badge-verde'; if (estado === 'Suspendido' || estado === 'Retirado') return 'badge-rojo'; return 'badge-ambar'; }
  claseAvatar(usuario: Usuario): string { return 'avatar-azul'; }
}
