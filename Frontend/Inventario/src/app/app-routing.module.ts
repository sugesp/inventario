import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminGuard } from './auth/admin.guard';
import { AuthGuard } from './auth/auth.guard';
import { AuthComponent } from './components/auth/auth.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { EquipesComponent } from './components/equipes/equipes.component';
import { InventariarItemComponent } from './components/inventariar-item/inventariar-item.component';
import { ItensInventariadosComponent } from './components/itens-inventariados/itens-inventariados.component';
import { LaudoTecnicoComponent } from './components/laudo-tecnico/laudo-tecnico.component';
import { LocaisComponent } from './components/locais/locais.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { TransferirItensComponent } from './components/transferir-itens/transferir-itens.component';
import { TransferenciasComponent } from './components/transferencias/transferencias.component';
import { UsuariosComponent } from './components/usuarios/usuarios.component';

const routes: Routes = [
  { path: '', component: DashboardComponent, canActivate: [AuthGuard], data: { title: 'Dashboard' } },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard], data: { title: 'Dashboard' } },
  { path: 'auth', component: AuthComponent, data: { title: 'Entrar' } },
  { path: 'usuarios', component: UsuariosComponent, canActivate: [AdminGuard], data: { title: 'Usuários' } },
  { path: 'equipes', component: EquipesComponent, canActivate: [AdminGuard], data: { title: 'Equipes' } },
  { path: 'locais', component: LocaisComponent, canActivate: [AdminGuard], data: { title: 'Locais' } },
  { path: 'inventariar', component: InventariarItemComponent, canActivate: [AuthGuard], data: { title: 'Inventariar item' } },
  { path: 'lista-inventariados', component: ItensInventariadosComponent, canActivate: [AdminGuard], data: { title: 'Itens inventariados' } },
  { path: 'transferir', component: TransferirItensComponent, canActivate: [AuthGuard], data: { title: 'Nova transferência' } },
  { path: 'laudo-tecnico', component: LaudoTecnicoComponent, canActivate: [AuthGuard], data: { title: 'Laudo Técnico' } },
  { path: 'transferencias', component: TransferenciasComponent, canActivate: [AuthGuard], data: { title: 'Transferências' } },
  { path: 'transferencias/:id', component: TransferirItensComponent, canActivate: [AuthGuard], data: { title: 'Editar transferência' } },
  { path: '**', component: NotFoundComponent, data: { title: 'Pagina nao encontrada' } },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
