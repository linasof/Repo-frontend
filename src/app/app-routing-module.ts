
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InicioComponent } from './component/inicio/inicio.component';
import { InventarioComponent } from './component/inventario/inventario.component';
import { UsuariosComponentes } from './component/usuarios/usuarios.componentes';
import { sesionGuard, usuariosGuard } from './service/guards';

const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', component: InicioComponent },
  { path: 'usuario', component: UsuariosComponentes, canActivate: [usuariosGuard] },
  { path: 'inventario', component: InventarioComponent, canActivate: [sesionGuard] },
  { path: '**', redirectTo: 'inicio' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
