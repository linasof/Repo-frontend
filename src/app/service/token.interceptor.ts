import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { Auth } from './auth';

// a cada peticion al back le pone el token de la sesion, y si el back responde 401
// (sesion vencida, usuario suspendido, etc) cierra la sesion y manda al login
@Injectable()
export class TokenInterceptor implements HttpInterceptor {

  constructor(private auth: Auth, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.token;
    const esLogin = req.url.includes('/login/');
    const peticion = token && !esLogin
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(peticion).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401 && !esLogin) {
          this.auth.cerrarSesion();
          this.router.navigate(['/inicio'], { queryParams: { motivo: err.error?.message || 'Tu sesión terminó' } });
        }
        return throwError(() => err);
      })
    );
  }
}
