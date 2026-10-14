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
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http'; // <-- Importación para las peticiones HTTP

@NgModule({
  declarations: [
    AppComponent,
    InicioComponent,
    UsuariosComponentes,
    InventarioComponent,
    NavbarComponent,
    SidbarComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    CommonModule,
    HttpClientModule // <-- Agregado a los imports
  ],
  providers: [
    provideBrowserGlobalErrorListeners()
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}