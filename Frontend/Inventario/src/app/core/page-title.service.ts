import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PageTitleService {
  private readonly appTitle = environment.title?.trim() || 'Inventario';

  constructor(private readonly title: Title) { }

  setPageTitle(pageTitle?: string | null): void {
    const normalized = pageTitle?.trim();
    this.title.setTitle(normalized ? `${this.appTitle} - ${normalized}` : this.appTitle);
  }
}
