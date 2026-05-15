import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Comissao } from '../../contracts/comissao.model';
import { ComissaoService } from '../../contracts/comissao.service';
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
  activeComissao: Comissao | null = null;
  loading = false;
  loadingEquipes = false;
  loadingComissao = false;
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
    private readonly comissaoService: ComissaoService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadActiveComissao();
    this.loadEquipes();
    this.loadLocais();
  }

  get locaisAtivos(): Local[] {
    if (!this.activeComissao) {
      return [];
    }

    return this.locais.filter((item) => item.comissaoId === this.activeComissao?.id);
  }

  get equipesAtivas(): Equipe[] {
    if (!this.activeComissao) {
      return [];
    }

    return this.equipes.filter((item) => item.comissaoId === this.activeComissao?.id);
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
    this.form = {
      nome: '',
      equipeId: this.equipesAtivas[0]?.id ?? '',
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
    if (!this.activeComissao && !this.editingId) {
      this.toastr.warning('Ative uma comissão antes de cadastrar locais.');
      return;
    }

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
