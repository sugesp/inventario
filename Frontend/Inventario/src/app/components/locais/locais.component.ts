import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Equipe } from '../../contracts/equipe.model';
import { EquipeService } from '../../contracts/equipe.service';
import { Local, LocalPayload } from '../../contracts/local.model';
import { LocalService } from '../../contracts/local.service';

@Component({
  selector: 'app-locais',
  templateUrl: './locais.component.html',
  styleUrl: './locais.component.scss',
})
export class LocaisComponent implements OnInit {
  locais: Local[] = [];
  equipes: Equipe[] = [];
  loading = false;
  loadingEquipes = false;
  saving = false;
  showModal = false;
  editingId: string | null = null;

  form: LocalPayload = {
    nome: '',
    equipeId: '',
  };

  constructor(
    private readonly localService: LocalService,
    private readonly equipeService: EquipeService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadEquipes();
    this.loadLocais();
  }

  loadLocais(): void {
    this.loading = true;
    this.localService.getAll().subscribe({
      next: (data) => {
        this.locais = [...data].sort((a, b) => a.nome.localeCompare(b.nome));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Não foi possível carregar os locais.');
      },
    });
  }

  loadEquipes(): void {
    this.loadingEquipes = true;
    this.equipeService.getAll().subscribe({
      next: (data) => {
        this.equipes = [...data].sort((a, b) => a.descricao.localeCompare(b.descricao));
        this.loadingEquipes = false;
      },
      error: () => {
        this.loadingEquipes = false;
        this.toastr.error('Não foi possível carregar as equipes.');
      },
    });
  }

  openCreateModal(): void {
    this.editingId = null;
    this.form = {
      nome: '',
      equipeId: this.equipes[0]?.id ?? '',
    };
    this.showModal = true;
  }

  edit(item: Local): void {
    this.editingId = item.id;
    this.form = {
      nome: item.nome,
      equipeId: item.equipeId,
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingId = null;
    this.saving = false;
  }

  submit(): void {
    this.saving = true;
    const payload: LocalPayload = {
      nome: this.form.nome.trim(),
      equipeId: this.form.equipeId,
    };

    const request = this.editingId
      ? this.localService.update(this.editingId, payload)
      : this.localService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success(this.editingId ? 'Local atualizado com sucesso.' : 'Local cadastrado com sucesso.');
        this.closeModal();
        this.loadLocais();
      },
      error: (error) => {
        this.saving = false;
        this.toastr.error(error?.error?.message ?? 'Não foi possível salvar o local.');
      },
    });
  }

  remove(item: Local): void {
    if (!confirm(`Deseja excluir o local "${item.nome}"?`)) {
      return;
    }

    this.localService.delete(item.id).subscribe({
      next: () => {
        this.toastr.success('Local excluído com sucesso.');
        this.loadLocais();
      },
      error: (error) => {
        this.toastr.error(error?.error?.message ?? 'Não foi possível excluir o local.');
      },
    });
  }
}
