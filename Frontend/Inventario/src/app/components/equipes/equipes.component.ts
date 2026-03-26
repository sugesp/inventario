import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Equipe, EquipePayload } from '../../contracts/equipe.model';
import { EquipeService } from '../../contracts/equipe.service';

@Component({
  selector: 'app-equipes',
  templateUrl: './equipes.component.html',
  styleUrl: './equipes.component.scss',
})
export class EquipesComponent implements OnInit {
  equipes: Equipe[] = [];
  saving = false;
  loading = false;
  showModal = false;
  editingId: string | null = null;

  form: EquipePayload = {
    descricao: '',
  };

  constructor(
    private readonly equipeService: EquipeService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadEquipes();
  }

  loadEquipes(): void {
    this.loading = true;
    this.equipeService.getAll().subscribe({
      next: (data) => {
        this.equipes = [...data].sort((a, b) => a.descricao.localeCompare(b.descricao));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Não foi possível carregar as equipes.');
      },
    });
  }

  openCreateModal(): void {
    this.editingId = null;
    this.form = { descricao: '' };
    this.showModal = true;
  }

  edit(item: Equipe): void {
    this.editingId = item.id;
    this.form = {
      descricao: item.descricao,
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
    const payload: EquipePayload = {
      descricao: this.form.descricao.trim(),
    };

    const request = this.editingId
      ? this.equipeService.update(this.editingId, payload)
      : this.equipeService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success(this.editingId ? 'Equipe atualizada com sucesso.' : 'Equipe cadastrada com sucesso.');
        this.closeModal();
        this.loadEquipes();
      },
      error: (error) => {
        this.saving = false;
        this.toastr.error(error?.error?.message ?? 'Não foi possível salvar a equipe.');
      },
    });
  }

  remove(item: Equipe): void {
    if (!confirm(`Deseja excluir a equipe "${item.descricao}"?`)) {
      return;
    }

    this.equipeService.delete(item.id).subscribe({
      next: () => {
        this.toastr.success('Equipe excluída com sucesso.');
        this.loadEquipes();
      },
      error: (error) => {
        this.toastr.error(error?.error?.message ?? 'Não foi possível excluir a equipe.');
      },
    });
  }
}
