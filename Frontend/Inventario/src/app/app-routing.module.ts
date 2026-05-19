import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminGuard } from './auth/admin.guard';
import { AuthGuard } from './auth/auth.guard';
import { GtiGestorGuard } from './auth/gti-gestor.guard';
import { GtiLaudosGuard } from './auth/gti-laudos.guard';
import { GtiTecnicoGuard } from './auth/gti-tecnico.guard';
import { InventarioGuard } from './auth/contratos.guard';
import { AuthComponent } from './components/auth/auth.component';
import { ComissoesComponent } from './components/comissoes/comissoes.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { EquipesComponent } from './components/equipes/equipes.component';
import { InventariarItemComponent } from './components/inventariar-item/inventariar-item.component';
import { ItensInventariadosComponent } from './components/itens-inventariados/itens-inventariados.component';
import { LaudoTecnicoComponent } from './components/laudo-tecnico/laudo-tecnico.component';
import { LaudosTecnicosComponent } from './components/laudos-tecnicos/laudos-tecnicos.component';
import { LevantamentosComponent } from './components/levantamentos/levantamentos.component';
import { LocaisComponent } from './components/locais/locais.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { TransferirItensComponent } from './components/transferir-itens/transferir-itens.component';
import { TransferenciasComponent } from './components/transferencias/transferencias.component';
import { UnidadesAdministrativasComponent } from './components/unidades-administrativas/unidades-administrativas.component';
import { UsuariosComponent } from './components/usuarios/usuarios.component';

const routes: Routes = [
  { path: '', component: DashboardComponent, canActivate: [AuthGuard], data: { title: 'Dashboard' } },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard], data: { title: 'Dashboard' } },
  { path: 'auth', component: AuthComponent, data: { title: 'Entrar' } },
  { path: 'usuarios', component: UsuariosComponent, canActivate: [AdminGuard], data: { title: 'Usuários' } },
  { path: 'comissoes', component: ComissoesComponent, canActivate: [InventarioGuard], data: { title: 'Comissões' } },
  { path: 'comissoes/:id', component: ComissoesComponent, canActivate: [InventarioGuard], data: { title: 'Editar comissão' } },
  { path: 'equipes', component: EquipesComponent, canActivate: [AdminGuard], data: { title: 'Equipes' } },
  { path: 'locais', component: LocaisComponent, canActivate: [AdminGuard], data: { title: 'Locais' } },
  { path: 'unidades-administrativas', component: UnidadesAdministrativasComponent, canActivate: [AdminGuard], data: { title: 'Unidades Administrativas' } },
  { path: 'inventariar', component: InventariarItemComponent, canActivate: [InventarioGuard], data: { title: 'Inventariar item' } },
  { path: 'levantamentos', component: LevantamentosComponent, canActivate: [InventarioGuard], data: { title: 'Levantamentos' } },
  { path: 'lista-inventariados', component: ItensInventariadosComponent, canActivate: [InventarioGuard], data: { title: 'Itens inventariados' } },
  { path: 'transferir', component: TransferirItensComponent, canActivate: [GtiGestorGuard], data: { title: 'Nova transferência' } },
  { path: 'laudo-tecnico', component: LaudoTecnicoComponent, canActivate: [GtiTecnicoGuard], data: { title: 'Laudo Técnico' } },
  { path: 'laudos-tecnicos', component: LaudosTecnicosComponent, canActivate: [GtiLaudosGuard], data: { title: 'Laudos Técnicos' } },
  { path: 'transferencias', component: TransferenciasComponent, canActivate: [GtiGestorGuard], data: { title: 'Transferências' } },
  { path: 'transferencias/:id', component: TransferirItensComponent, canActivate: [GtiGestorGuard], data: { title: 'Editar transferência' } },
  { path: '**', component: NotFoundComponent, data: { title: 'Pagina nao encontrada' } },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
