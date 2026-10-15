import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Usuario } from '../../model/usuario';
import { UsuarioService } from '../../service/usuario.service';
import { Auth } from '../../service/auth';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.componentes.html',
  styleUrls: ['./usuarios.componentes.css'],
  standalone: false
})
export class UsuariosComponentes implements OnInit {

  vistaActual: string = 'usuarios';
  esGerente: boolean = true; 
  puedeGestionarUsuarios: boolean = true;
  usuarioActualId: number = 1;
  usuarioSesion: Usuario | null = null;

  listaUsuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  
  totalUsuarios: number = 0;
  usuariosActivos: number = 0;
  usuariosInactivos: number = 0;
  usuariosSuspendidos: number = 0;

  busqueda: string = '';
  filtroRol: string = '';
  filtroEstado: string = '';
  // mismos nombres e ids que las tablas rol y estado_usuario de la bd
  roles: string[] = ['Administrador', 'Vendedor', 'Auxiliar administrativo'];
  estados: string[] = ['Contratado', 'Suspendido', 'En vacaciones', 'Retirado'];
  idsEstado: { [nombre: string]: number } = { 'Contratado': 1, 'Suspendido': 2, 'En vacaciones': 3, 'Retirado': 4 };

  dlgUsuario: boolean = false;
  editandoUsuario: boolean = false;
  dlgEstado: boolean = false;
  dlgEliminar: boolean = false;

  formUsuario!: Usuario;
  usuarioEstado: Usuario | null = null;
  nuevoEstado: string = '';
  errorEstado: string = '';
  usuarioEliminar: Usuario | null = null;
  errorEliminar: string = '';
  errorUsuario: string = '';

  historialFiltrado: any[] = [];
  toast: { tipo: string, texto: string } | null = null;

  constructor(private usuarioService: UsuarioService, private cdr: ChangeDetectorRef, private auth: Auth) {}

  ngOnInit(): void {
    // el usuario marcado como "Tú" es el que inició sesión
    const sesion = this.auth.obtenerSesion();
    if (sesion) {
      this.usuarioActualId = sesion.id_usuario;
    }
    this.cargarUsuarios();
  }


  cargarUsuarios(): void {
    this.usuarioService.getUsuarios().subscribe({
      next: (respuesta: any) => {
        console.log("Lo que envió Django:", respuesta);

        let datos: Usuario[] = [];

        if (Array.isArray(respuesta)) {
          datos = respuesta;
        } else if (respuesta && respuesta.usuarios) {
          datos = respuesta.usuarios;
        } else if (respuesta && respuesta.data) {
          datos = respuesta.data;
        } else if (respuesta) {
          const posibleArray = Object.values(respuesta).find(val => Array.isArray(val));
          datos = (posibleArray as Usuario[]) || [];
        }

        this.listaUsuarios = datos.map((u: any) => ({
          ...u,
          nombre_rol: u.nombre_rol || u.rol || 'Sin Rol',
          nombre_estado_usuario: u.nombre_estado_usuario || u.estado || u.nombre_estado || 'Contratado',
          nombre_tipo_documento: u.nombre_tipo_documento || u.tipo_documento || 'CC'
        }));

    
        this.usuariosFiltrados = [...this.listaUsuarios];
        this.calcularEstadisticas();
        this.usuarioSesion = this.listaUsuarios.find(u => u.id_usuario === this.usuarioActualId) || null;
        this.cdr.markForCheck(); // para que la tabla se pinte apenas llegan los datos
      },
      error: (err) => {
        this.mostrarToast('error', 'Error al conectar con el backend.');
        this.cdr.markForCheck();
        console.error(err);
      }
    });
  }

  guardarUsuario(): void {
    this.errorUsuario = '';
    console.log("1. Datos antes de procesar:", this.formUsuario);

   
    if (!this.formUsuario.nombre_usuario || !this.formUsuario.primer_nombre || 
        !this.formUsuario.primer_apellido || !this.formUsuario.correo || 
        !this.formUsuario.numero_documento) {
      this.errorUsuario = 'Faltan campos obligatorios (*).';
      return;
    }

    
    if (!this.editandoUsuario && !this.formUsuario.contrasenia) {
      this.errorUsuario = 'La contraseña es obligatoria para usuarios nuevos.';
      return;
    }

  
    this.formUsuario.id_rol = Number(this.formUsuario.id_rol);
    this.formUsuario.id_tipo_documento = Number(this.formUsuario.id_tipo_documento);
    this.formUsuario.id_estado_usuario = Number(this.formUsuario.id_estado_usuario);

    console.log("2. Datos empaquetados para enviar a Django:", this.formUsuario);

    if (this.editandoUsuario && this.formUsuario.id_usuario) {
      this.usuarioService.actualizarUsuario(this.formUsuario.id_usuario, this.formUsuario).subscribe({
        next: () => {
          this.mostrarToast('ok', 'Usuario actualizado correctamente.');
          this.cerrarUsuario();
          this.cargarUsuarios();
        },
        error: (err) => {
          console.error(err);
          this.errorUsuario = 'Error al actualizar. Revisa la consola (F12).';
          this.cdr.markForCheck();
        }
      });
    } else {
      this.usuarioService.crearUsuario(this.formUsuario).subscribe({
        next: () => {
          this.mostrarToast('ok', 'Usuario creado exitosamente.');
          this.cerrarUsuario();
          this.cargarUsuarios();
        },
        error: (err) => {
          console.error(err);
          this.errorUsuario = 'Error al crear. Verifica que el usuario o documento no existan ya.';
          this.cdr.markForCheck();
        }
      });
    }
  }

  confirmarEliminar(): void {
    if (this.usuarioEliminar && this.usuarioEliminar.id_usuario) {
      this.usuarioService.eliminarUsuario(this.usuarioEliminar.id_usuario).subscribe({
        next: () => {
          this.mostrarToast('ok', 'Usuario eliminado.');
          this.cerrarEliminar();
          this.cargarUsuarios();
        },
        error: () => this.errorEliminar = 'No se pudo eliminar el usuario.'
      });
    }
  }

  abrirUsuario(usuario?: Usuario): void {
    if (usuario) {
      this.editandoUsuario = true;
      this.formUsuario = { ...usuario }; 
    } else {
      this.editandoUsuario = false;
      this.formUsuario = this.inicializarUsuarioVacio();
    }
    this.errorUsuario = '';
    this.dlgUsuario = true;
  }

  cerrarUsuario(): void { this.dlgUsuario = false; }
  abrirEliminar(usuario: Usuario): void { this.usuarioEliminar = usuario; this.errorEliminar = ''; this.dlgEliminar = true; }
  cerrarEliminar(): void { this.dlgEliminar = false; this.usuarioEliminar = null; }
  abrirCambioEstado(usuario: Usuario): void { this.usuarioEstado = usuario; this.nuevoEstado = usuario.nombre_estado_usuario || ''; this.errorEstado = ''; this.dlgEstado = true; }
  cerrarCambioEstado(): void { this.dlgEstado = false; this.usuarioEstado = null; }
  guardarEstado(): void {
    this.errorEstado = '';
    if (!this.usuarioEstado || !this.usuarioEstado.id_usuario) {
      return;
    }
    const idEstado = this.idsEstado[this.nuevoEstado];
    if (!idEstado) {
      this.errorEstado = 'Selecciona un estado.';
      return;
    }
    // se manda el usuario completo con el estado nuevo al actualizar del back
    const datos: Usuario = { ...this.usuarioEstado, id_estado_usuario: idEstado };
    this.usuarioService.actualizarUsuario(this.usuarioEstado.id_usuario, datos).subscribe({
      next: () => {
        this.mostrarToast('ok', 'Estado actualizado.');
        this.cerrarCambioEstado();
        this.cargarUsuarios();
      },
      error: (err) => {
        this.errorEstado = err?.error?.message || 'No se pudo cambiar el estado.';
        this.cdr.markForCheck();
      }
    });
  }

  abrirPerfil(): void { this.vistaActual = 'perfil'; }
  abrirAuditoria(): void { this.vistaActual = 'auditoria'; }
  abrirListado(): void { this.vistaActual = 'usuarios'; }

  inicializarUsuarioVacio(): Usuario {
    return {
      nombre_usuario: '', primer_nombre: '', segundo_nombre: '',
      primer_apellido: '', segundo_apellido: '',
      correo: '', numero_documento: '', contrasenia: '',
      id_rol: 1, id_tipo_documento: 1, id_estado_usuario: 1
    };
  }

  calcularEstadisticas(): void {
    this.totalUsuarios = this.listaUsuarios.length;
    // activos: los que pueden entrar al sistema, inactivos: los retirados
    this.usuariosActivos = this.listaUsuarios.filter(u => u.nombre_estado_usuario === 'Contratado' || u.nombre_estado_usuario === 'En vacaciones').length;
    this.usuariosInactivos = this.listaUsuarios.filter(u => u.nombre_estado_usuario === 'Retirado').length;
    this.usuariosSuspendidos = this.listaUsuarios.filter(u => u.nombre_estado_usuario === 'Suspendido').length;
  }

  limpiarFiltros(): void { this.busqueda = ''; this.filtroRol = ''; this.filtroEstado = ''; this.usuariosFiltrados = this.listaUsuarios; }
  mostrarToast(tipo: string, texto: string): void { this.toast = { tipo, texto }; this.cdr.markForCheck(); setTimeout(() => { this.cerrarToast(); this.cdr.markForCheck(); }, 4000); }
  cerrarToast(): void { this.toast = null; }
  trackById(index: number, item: Usuario): any { return item.id_usuario; }
  formatearFechaHora(fecha: string): string { return new Date(fecha).toLocaleString(); }
  claseRol(rol?: string): string { if (rol === 'Administrador') return 'badge-info'; if (rol === 'Vendedor') return 'badge-purpura'; return 'badge-gris'; }
  claseEstado(estado?: string): string { if (estado === 'Contratado') return 'badge-verde'; if (estado === 'Suspendido' || estado === 'Retirado') return 'badge-rojo'; return 'badge-ambar'; }
  claseAvatar(usuario: Usuario): string { return 'avatar-azul'; }
}