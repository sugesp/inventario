import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Unidade, UnidadePayload } from '../../contracts/unidade.model';
import { UnidadeService } from '../../contracts/unidade.service';
import { SearchableSelectOption } from '../shared/searchable-select/searchable-select.component';

interface UnidadeTreeNode {
  unidade: Unidade;
  children: UnidadeTreeNode[];
  depth: number;
}

interface UnidadeSelectOption extends SearchableSelectOption {
  value: string;
}

@Component({
  selector: 'app-unidades',
  templateUrl: './unidades.component.html',
  styleUrl: './unidades.component.scss',
})
export class UnidadesComponent implements OnInit {
  unidades: Unidade[] = [];
  expandedNodeIds = new Set<string>();
  saving = false;
  showModal = false;
  editingId: string | null = null;

  form: UnidadePayload = {
    nome: '',
    sigla: '',
    unidadeSuperiorId: null,
  };

  constructor(
    private readonly unidadeService: UnidadeService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadUnidades();
  }

  get unidadesPaiDisponiveis(): Unidade[] {
    return this.unidades.filter((x) => x.id !== this.editingId);
  }

  get unidadesPaiOptions(): UnidadeSelectOption[] {
    return this.buildUnidadeOptions(this.unidadesPaiDisponiveis);
  }

  get unidadesTree(): UnidadeTreeNode[] {
    const childrenByParent = new Map<string | null, Unidade[]>();

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
        this.toastr.error('Não foi possível carregar as unidades.');
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

  edit(item: Unidade): void {
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
  }

  submit(): void {
    this.saving = true;
    const payload: UnidadePayload = {
      ...this.form,
      unidadeSuperiorId: this.form.unidadeSuperiorId || null,
    };

    const request = this.editingId
      ? this.unidadeService.update(this.editingId, payload)
      : this.unidadeService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success(this.editingId ? 'Unidade atualizada com sucesso.' : 'Unidade cadastrada com sucesso.');
        this.closeModal();
        this.loadUnidades();
      },
      error: (error) => {
        this.saving = false;
        this.toastr.error(error?.error?.message ?? 'Não foi possível salvar a unidade.');
      },
    });
  }

  remove(item: Unidade): void {
    if (!confirm(`Deseja excluir a unidade ${item.sigla}?`)) {
      return;
    }

    this.unidadeService.delete(item.id).subscribe({
      next: () => {
        this.toastr.success('Unidade excluída com sucesso.');
        this.loadUnidades();
      },
      error: (error) => {
        this.toastr.error(error?.error?.message ?? 'Não foi possível excluir a unidade.');
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

  private buildUnidadeOptions(unidades: Unidade[]): UnidadeSelectOption[] {
    const idsDisponiveis = new Set(unidades.map((item) => item.id));
    const childrenByParent = new Map<string | null, Unidade[]>();

    for (const unidade of unidades) {
      const parentId = unidade.unidadeSuperiorId && idsDisponiveis.has(unidade.unidadeSuperiorId)
        ? unidade.unidadeSuperiorId
        : null;
      const siblings = childrenByParent.get(parentId) ?? [];
      siblings.push(unidade);
      childrenByParent.set(parentId, siblings);
    }

    for (const siblings of childrenByParent.values()) {
      siblings.sort((a, b) => a.nome.localeCompare(b.nome));
    }

    const options: UnidadeSelectOption[] = [];

    const walk = (parentId: string | null, depth: number): void => {
      for (const unidade of childrenByParent.get(parentId) ?? []) {
        options.push({
          value: unidade.id,
          label: `${unidade.sigla} - ${unidade.nome}`,
          depth,
        });
        walk(unidade.id, depth + 1);
      }
    };

    walk(null, 0);

    return options;
  }
}
