import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Levantamento } from '../../contracts/levantamento.model';
import { LevantamentoService } from '../../contracts/levantamento.service';

@Component({
  selector: 'app-levantamentos-lista',
  templateUrl: './levantamentos-lista.component.html',
  styleUrl: './levantamentos-lista.component.scss',
})
export class LevantamentosListaComponent implements OnInit {
  levantamentos: Levantamento[] = [];
  loading = false;
  activeLevantamento: Levantamento | null = null;
  loadingModal = false;

  constructor(
    private readonly levantamentoService: LevantamentoService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadLevantamentos();
  }

  loadLevantamentos(): void {
    this.loading = true;
    this.levantamentoService.getAll().subscribe({
      next: (data) => {
        this.levantamentos = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Não foi possível carregar os levantamentos.');
      },
    });
  }

  openDetails(id: string): void {
    this.loadingModal = true;
    this.activeLevantamento = null;
    this.levantamentoService.getById(id).subscribe({
      next: (levantamento) => {
        this.activeLevantamento = levantamento;
        this.loadingModal = false;
      },
      error: () => {
        this.loadingModal = false;
        this.toastr.error('Não foi possível carregar os detalhes do levantamento.');
      },
    });
  }

  closeModal(): void {
    this.activeLevantamento = null;
    this.loadingModal = false;
  }

  exportCsv(levantamento: Levantamento): void {
    const headers = [
      'Tombamento',
      'Tombamento antigo',
      'Descricao',
      'Tipo',
      'Levantamento feito por',
      'Data',
    ];

    const rows = levantamento.itens.map((item) => [
      item.tombamento || '',
      item.tombamentoAntigo || '',
      item.descricao || '',
      item.tipo || '',
      item.confirmadoPorUsuarioNome || '',
      this.formatDateTime(item.createdAt),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => this.escapeCsv(value)).join(';'))
      .join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.slugify(levantamento.nome || 'levantamento')}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  exportPdf(levantamento: Levantamento): void {
    if (typeof window === 'undefined') {
      return;
    }

    const rowsHtml = levantamento.itens.map((item) => `
      <tr>
        <td>${this.escapeHtml(item.tombamento || '-')}</td>
        <td>${this.escapeHtml(item.tombamentoAntigo || '-')}</td>
        <td>${this.escapeHtml(item.descricao || '-')}</td>
        <td>${this.escapeHtml(item.tipo || '-')}</td>
        <td>${this.escapeHtml(item.confirmadoPorUsuarioNome || '-')}</td>
        <td>${this.escapeHtml(this.formatDateTime(item.createdAt) || '-')}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=800');
    if (!printWindow) {
      this.toastr.error('Não foi possível abrir a janela de impressão do PDF.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${this.escapeHtml(levantamento.nome || 'Levantamento')}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          p { margin: 0 0 16px; color: #4b5563; }
          .meta { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #eff6ff; }
          @media print {
            body { margin: 12px; }
          }
        </style>
      </head>
      <body>
        <h1>${this.escapeHtml(levantamento.nome || 'Levantamento')}</h1>
        <div class="meta">
          <p><strong>Descrição:</strong> ${this.escapeHtml(levantamento.descricao || '-')}</p>
          <p><strong>Criado por:</strong> ${this.escapeHtml(levantamento.criadoPorUsuarioNome || '-')}</p>
          <p><strong>Total de itens:</strong> ${levantamento.itens.length}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Tombamento</th>
              <th>Tombamento antigo</th>
              <th>Descrição</th>
              <th>Tipo</th>
              <th>Levantamento feito por</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6">Nenhum item confirmado.</td></tr>'}
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  private formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  private escapeCsv(value: string): string {
    const normalized = `${value ?? ''}`.replace(/"/g, '""');
    return `"${normalized}"`;
  }

  private escapeHtml(value: string): string {
    return `${value ?? ''}`
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      || 'levantamento';
  }
}
