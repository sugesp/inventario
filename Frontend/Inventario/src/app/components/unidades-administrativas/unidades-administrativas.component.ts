import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { UnidadeAdministrativa, UnidadeAdministrativaPayload } from '../../contracts/unidade-administrativa.model';
import { UnidadeAdministrativaService } from '../../contracts/unidade-administrativa.service';

interface UnidadeTreeNode {
  unidade: UnidadeAdministrativa;
  children: UnidadeTreeNode[];
  depth: number;
}

@Component({
  selector: 'app-unidades-administrativas',
  templateUrl: './unidades-administrativas.component.html',
  styleUrl: './unidades-administrativas.component.scss',
})
export class UnidadesAdministrativasComponent implements OnInit {
  unidades: UnidadeAdministrativa[] = [];
  expandedNodeIds = new Set<string>();
  saving = false;
  showModal = false;
  editingId: string | null = null;

  form: UnidadeAdministrativaPayload = {
    nome: '',
    sigla: '',
    unidadeSuperiorId: null,
  };

  constructor(
    private readonly unidadeService: UnidadeAdministrativaService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadUnidades();
  }

  get unidadesPaiDisponiveis(): UnidadeAdministrativa[] {
    return this.unidades.filter((x) => x.id !== this.editingId);
  }

  get unidadesTree(): UnidadeTreeNode[] {
    const childrenByParent = new Map<string | null, UnidadeAdministrativa[]>();

    for (const unidade of this.unidades) {
      const parentId = unidade.unidadeSuperiorId ?? null;
      const siblings = childrenByParent.get(parentId) ?? [];
      siblings.push(unidade);
      childrenByParent.set(parentId, siblings);
    }

    for (const siblings of childrenByParent.values()) {
      siblings.sort((a, b) => a.nome.localeCompare(b.nome));
    }

    const buildNodes = (parentId: string | null, depth: number): UnidadeTreeNode[] =>
      (childrenByParent.get(parentId) ?? []).map((unidade) => ({
        unidade,
        depth,
        children: buildNodes(unidade.id, depth + 1),
      }));

    return buildNodes(null, 0);
  }

  loadUnidades(): void {
    this.unidadeService.getAll().subscribe({
      next: (data) => {
        this.unidades = data;
        this.expandedNodeIds = new Set(data.map((item) => item.id));
      },
      error: () => {
        this.toastr.error('Não foi possível carregar as unidades administrativas.');
      },
    });
  }

  openCreateModal(): void {
    this.editingId = null;
    this.form = {
      nome: '',
      sigla: '',
      unidadeSuperiorId: null,
    };
    this.showModal = true;
  }

  edit(item: UnidadeAdministrativa): void {
    this.editingId = item.id;
    this.form = {
      nome: item.nome,
      sigla: item.sigla,
      unidadeSuperiorId: item.unidadeSuperiorId ?? null,
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
    const payload: UnidadeAdministrativaPayload = {
      ...this.form,
      sigla: this.form.sigla.trim().toUpperCase(),
      unidadeSuperiorId: this.form.unidadeSuperiorId || null,
    };

    const request = this.editingId
      ? this.unidadeService.update(this.editingId, payload)
      : this.unidadeService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success(this.editingId ? 'Unidade administrativa atualizada com sucesso.' : 'Unidade administrativa cadastrada com sucesso.');
        this.closeModal();
        this.loadUnidades();
      },
      error: (error) => {
        this.saving = false;
        this.toastr.error(error?.error?.message ?? 'Não foi possível salvar a unidade administrativa.');
      },
    });
  }

  remove(item: UnidadeAdministrativa): void {
    if (!confirm(`Deseja excluir a unidade administrativa ${item.sigla}?`)) {
      return;
    }

    this.unidadeService.delete(item.id).subscribe({
      next: () => {
        this.toastr.success('Unidade administrativa excluída com sucesso.');
        this.loadUnidades();
      },
      error: (error) => {
        this.toastr.error(error?.error?.message ?? 'Não foi possível excluir a unidade administrativa.');
      },
    });
  }

  toggleNode(nodeId: string): void {
    if (this.expandedNodeIds.has(nodeId)) {
      this.expandedNodeIds.delete(nodeId);
      return;
    }

    this.expandedNodeIds.add(nodeId);
  }

  isExpanded(nodeId: string): boolean {
    return this.expandedNodeIds.has(nodeId);
  }

  hasChildren(node: UnidadeTreeNode): boolean {
    return node.children.length > 0;
  }
}
