import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminGuard } from './auth/admin.guard';
import { AuthGuard } from './auth/auth.guard';
import { AuthComponent } from './components/auth/auth.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { EquipesComponent } from './components/equipes/equipes.component';
import { ItensInventariadosComponent } from './components/itens-inventariados/itens-inventariados.component';
import { LocaisComponent } from './components/locais/locais.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { UsuariosComponent } from './components/usuarios/usuarios.component';

const routes: Routes = [
  { path: '', component: DashboardComponent, canActivate: [AuthGuard], data: { title: 'Dashboard' } },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard], data: { title: 'Dashboard' } },
  { path: 'auth', component: AuthComponent, data: { title: 'Entrar' } },
  { path: 'usuarios', component: UsuariosComponent, canActivate: [AdminGuard], data: { title: 'Usuários' } },
  { path: 'equipes', component: EquipesComponent, canActivate: [AdminGuard], data: { title: 'Equipes' } },
  { path: 'locais', component: LocaisComponent, canActivate: [AdminGuard], data: { title: 'Locais' } },
  { path: 'itens-inventariados', component: ItensInventariadosComponent, canActivate: [AuthGuard], data: { title: 'Itens inventariados' } },
  { path: '**', component: NotFoundComponent, data: { title: 'Pagina nao encontrada' } },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
