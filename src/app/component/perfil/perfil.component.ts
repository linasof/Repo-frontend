import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Usuario } from '../../model/usuario';
import { UsuarioService } from '../../service/usuario.service';
import { Auth } from '../../service/auth';
import { Errores, erroresDelServidor, validarContrasenia } from '../../service/validaciones';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.component.html',
  styleUrls: ['../usuarios/usuarios.componentes.css'], 
  standalone: false
})
export class PerfilComponent implements OnInit {

  usuario: Usuario | null = null;
  cargando = true;
  guardando = false;

  formClave = { actual: '', nueva: '', confirmacion: '' };
  erroresClave: Errores = {};
  errorClave = '';
  verClaves = false;

  toast: { tipo: string, texto: string } | null = null;
  private temporizadorToast: any = null;

  constructor(private usuarioService: UsuarioService, private auth: Auth, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.usuarioService.getPerfil().subscribe({
      next: (res: any) => {
        this.usuario = res?.data ?? null;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargando = false;
        const { mensaje } = erroresDelServidor(err, 'No se pudo cargar tu perfil.');
        this.mostrarToast('error', mensaje || 'No se pudo cargar tu perfil.');
      }
    });
  }

  get rol(): string {
    return this.usuario?.nombre_rol || this.auth.rol;
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

  claseEstado(estado?: string): string {
    if (estado === 'Contratado') return 'badge-verde';
    if (estado === 'Suspendido' || estado === 'Retirado') return 'badge-rojo';
    return 'badge-ambar';
  }

  mostrarToast(tipo: string, texto: string): void {
    this.toast = { tipo, texto };
    clearTimeout(this.temporizadorToast);
    this.temporizadorToast = setTimeout(() => { this.toast = null; this.cdr.markForCheck(); }, 4500);
    this.cdr.markForCheck();
  }

  cerrarToast(): void { this.toast = null; }
}
