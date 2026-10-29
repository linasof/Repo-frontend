import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, ROL_GERENTE, ROL_ADMINISTRADOR } from './auth';

// sin sesion no se puede entrar a ninguna pantalla interna
export const sesionGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  return auth.estaLogueado() ? true : inject(Router).createUrlTree(['/inicio']);
};

// el modulo de usuarios solo lo ven el gerente y el administrador 
export const usuariosGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  if (!auth.estaLogueado()) {
    return inject(Router).createUrlTree(['/inicio']);
  }
  return auth.tieneRol(ROL_GERENTE, ROL_ADMINISTRADOR) ? true : inject(Router).createUrlTree(['/inventario']);
};
