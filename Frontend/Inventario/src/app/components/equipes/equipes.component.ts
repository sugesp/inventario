import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Comissao } from '../../contracts/comissao.model';
import { ComissaoService } from '../../contracts/comissao.service';
import { Equipe, EquipePayload } from '../../contracts/equipe.model';
import { EquipeService } from '../../contracts/equipe.service';

@Component({
  selector: 'app-equipes',
  templateUrl: './equipes.component.html',
  styleUrl: './equipes.component.scss',
})
export class EquipesComponent implements OnInit {
  equipes: Equipe[] = [];
  activeComissao: Comissao | null = null;
  saving = false;
  loading = false;
  loadingComissao = false;
  showModal = false;
  editingId: string | null = null;

  form: EquipePayload = {
    descricao: '',
    comissaoId: '',
  };

  constructor(
    private readonly equipeService: EquipeService,
    private readonly comissaoService: ComissaoService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadActiveComissao();
    this.loadEquipes();
  }

  get equipesAtivas(): Equipe[] {
    if (!this.activeComissao) {
      return [];
    }

    return this.equipes.filter((item) => item.comissaoId === this.activeComissao?.id);
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

  loadActiveComissao(): void {
    this.loadingComissao = true;
    this.comissaoService.getActive().subscribe({
      next: (data) => {
        this.activeComissao = data;
        this.loadingComissao = false;
      },
      error: () => {
        this.activeComissao = null;
        this.loadingComissao = false;
      },
    });
  }

  openCreateModal(): void {
    this.editingId = null;
    this.form = { descricao: '', comissaoId: this.activeComissao?.id ?? '' };
    this.showModal = true;
  }

  edit(item: Equipe): void {
    this.editingId = item.id;
    this.form = {
      descricao: item.descricao,
      comissaoId: item.comissaoId ?? '',
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingId = null;
    this.saving = false;
  }

  submit(): void {
    if (!this.activeComissao && !this.editingId) {
      this.toastr.warning('Ative uma comissão antes de cadastrar equipes.');
      return;
    }

    this.saving = true;
    const payload: EquipePayload = {
      descricao: this.form.descricao.trim(),
      comissaoId: this.editingId
        ? (this.equipes.find((item) => item.id === this.editingId)?.comissaoId ?? this.activeComissao?.id ?? '')
        : (this.activeComissao?.id ?? ''),
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
