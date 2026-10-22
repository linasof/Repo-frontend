import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, ROL_ADMINISTRADOR, ROL_AUXILIAR } from './auth';

// sin sesion no se puede entrar a ninguna pantalla interna
export const sesionGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  return auth.estaLogueado() ? true : inject(Router).createUrlTree(['/inicio']);
};

// el modulo de usuarios solo lo ven el administrador (consulta) y el auxiliar administrativo (gestiona)
export const usuariosGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  if (!auth.estaLogueado()) {
    return inject(Router).createUrlTree(['/inicio']);
  }
  return auth.tieneRol(ROL_ADMINISTRADOR, ROL_AUXILIAR) ? true : inject(Router).createUrlTree(['/inventario']);
};
