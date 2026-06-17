import { DEFAULT_CURRENCY_CODE, LOCALE_ID, NgModule } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { NgxSpinnerModule } from 'ngx-spinner';
import { NgxCurrencyDirective } from 'ngx-currency';
import { AuthInterceptor } from './auth/auth.interceptor';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AuthComponent } from './components/auth/auth.component';
import { ComissoesComponent } from './components/comissoes/comissoes.component';
import { ConsultaTombamentoComponent } from './components/consulta-tombamento/consulta-tombamento.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { InventariarItemComponent } from './components/inventariar-item/inventariar-item.component';
import { ItensInventariadosComponent } from './components/itens-inventariados/itens-inventariados.component';
import { LaudoTecnicoComponent } from './components/laudo-tecnico/laudo-tecnico.component';
import { LaudosTecnicosComponent } from './components/laudos-tecnicos/laudos-tecnicos.component';
import { LevantamentosComponent } from './components/levantamentos/levantamentos.component';
import { LevantamentosListaComponent } from './components/levantamentos-lista/levantamentos-lista.component';
import { UsuariosComponent } from './components/usuarios/usuarios.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { SearchableSelectComponent } from './components/shared/searchable-select/searchable-select.component';
import { TransferirItensComponent } from './components/transferir-itens/transferir-itens.component';
import { TransferenciasComponent } from './components/transferencias/transferencias.component';
import { UnidadesAdministrativasComponent } from './components/unidades-administrativas/unidades-administrativas.component';
import { LoadingInterceptor } from './core/loading/loading.interceptor';
import { CloseOnOutsideClickDirective } from './shared/close-on-outside-click.directive';

registerLocaleData(localePt);

@NgModule({
  declarations: [
    AppComponent,
    AuthComponent,
    ComissoesComponent,
    ConsultaTombamentoComponent,
    DashboardComponent,
    UsuariosComponent,
    NotFoundComponent,
    SearchableSelectComponent,
    InventariarItemComponent,
    LevantamentosComponent,
    LevantamentosListaComponent,
    ItensInventariadosComponent,
    LaudoTecnicoComponent,
    LaudosTecnicosComponent,
    TransferirItensComponent,
    TransferenciasComponent,
    UnidadesAdministrativasComponent,
    CloseOnOutsideClickDirective,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    NgxSpinnerModule,
    NgxCurrencyDirective,
    ToastrModule.forRoot({
      timeOut: 3000,
      progressBar: true,
      closeButton: true,
      positionClass: 'toast-bottom-right',
      preventDuplicates: true,
    }),
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoadingInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: LOCALE_ID,
      useValue: 'pt-BR',
    },
    {
      provide: DEFAULT_CURRENCY_CODE,
      useValue: 'BRL',
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
