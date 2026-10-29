import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing-module';
import { AppComponent } from './app';
import { InicioComponent } from './component/inicio/inicio.component';
import { UsuariosComponentes } from './component/usuarios/usuarios.componentes';
import { InventarioComponent } from './component/inventario/inventario.component';
import { NavbarComponent } from './component/navbar/navbar.component';
import { SidbarComponent } from './component/sidbar/sidbar.component';
import { PerfilComponent } from './component/perfil/perfil.component';
import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { TokenInterceptor } from './service/token.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    InicioComponent,
    UsuariosComponentes,
    InventarioComponent,
    NavbarComponent,
    SidbarComponent,
    PerfilComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    CommonModule,
    HttpClientModule 
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}