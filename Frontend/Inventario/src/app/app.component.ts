import { Component, HostListener } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from './auth/auth.service';
import { ChangePasswordPayload } from './auth/auth.model';
import { BackendStatusService } from './core/backend-status.service';
import { PageTitleService } from './core/page-title.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  isAuthRoute = false;
  isMobileViewport = false;
  mobileSidebarOpen = false;
  showUserMenu = false;
  showChangePasswordModal = false;
  changingPassword = false;
  gravatarFailed = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  checkingBackendStatus = false;
  passwordForm: ChangePasswordPayload & { confirmarNovaSenha: string } = {
    senhaAtual: '',
    novaSenha: '',
    confirmarNovaSenha: '',
  };

  get userInitials(): string {
    const nome = this.authService.session?.nome?.trim();
    if (!nome) {
      return 'US';
    }

    return nome
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  get userName(): string {
    return this.authService.session?.nome?.trim() || 'Usuario';
  }

  get userEmail(): string {
    return this.authService.session?.email?.trim().toLowerCase() || '';
  }

  get gravatarUrl(): string | null {
    if (!this.userEmail || this.gravatarFailed) {
      return null;
    }

    return `https://www.gravatar.com/avatar/${this.md5(this.userEmail)}?s=80&d=404`;
  }

  get userRole(): string {
    return this.authService.session?.perfil?.trim() || 'Usuario';
  }

  get showShellLayout(): boolean {
    return this.authService.isAuthenticated && !this.isAuthRoute;
  }

  constructor(
    readonly authService: AuthService,
    readonly backendStatusService: BackendStatusService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly toastr: ToastrService,
    private readonly pageTitleService: PageTitleService
  ) {
    this.updateViewportState();
    this.syncRouteState(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.syncRouteState(event.urlAfterRedirects));
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateViewportState();
  }

  logout(): void {
    this.showUserMenu = false;
    this.authService.logout();
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  toggleSidebar(): void {
    if (!this.isMobileViewport) {
      return;
    }

    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  closeSidebar(): void {
    this.mobileSidebarOpen = false;
  }

  onGravatarError(): void {
    this.gravatarFailed = true;
  }

  onMenuNavigate(): void {
    this.showUserMenu = false;
    this.closeSidebar();
  }

  changePassword(): void {
    this.showUserMenu = false;
    this.showChangePasswordModal = true;
    this.resetPasswordForm();
  }

  get mustChangePassword(): boolean {
    return !!this.authService.session?.mustChangePassword;
  }

  submitChangePassword(): void {
    if (this.passwordForm.novaSenha.trim().length < 8) {
      this.toastr.error('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (this.passwordForm.novaSenha !== this.passwordForm.confirmarNovaSenha) {
      this.toastr.error('A confirmacao da senha nao confere.');
      return;
    }

    this.changingPassword = true;
    this.authService.changePassword({
      senhaAtual: this.mustChangePassword ? undefined : this.passwordForm.senhaAtual,
      novaSenha: this.passwordForm.novaSenha,
    }).subscribe({
      next: () => {
        this.changingPassword = false;
        this.showChangePasswordModal = false;
        this.resetPasswordForm();
        this.toastr.success('Senha alterada com sucesso.');
      },
      error: (error) => {
        this.changingPassword = false;
        this.toastr.error(error?.error?.message ?? 'Nao foi possivel alterar a senha.');
      },
    });
  }

  closeChangePasswordModal(): void {
    if (this.mustChangePassword) {
      return;
    }

    this.showChangePasswordModal = false;
    this.resetPasswordForm();
  }

  retryBackendConnection(): void {
    if (this.checkingBackendStatus) {
      return;
    }

    this.checkingBackendStatus = true;
    this.backendStatusService.checkHealth().subscribe({
      next: (isHealthy) => {
        this.checkingBackendStatus = false;

        if (!isHealthy) {
          return;
        }

        this.backendStatusService.markAvailable();
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      },
      error: () => {
        this.checkingBackendStatus = false;
      },
    });
  }

  private syncRouteState(url: string): void {
    this.isAuthRoute = url.startsWith('/auth');
    this.showUserMenu = false;
    this.mobileSidebarOpen = false;
    this.showChangePasswordModal = !this.isAuthRoute && this.mustChangePassword;
    this.gravatarFailed = false;
    this.pageTitleService.setPageTitle(this.resolveRouteTitle());
  }

  private resolveRouteTitle(): string | null {
    let currentRoute = this.route.firstChild;

    while (currentRoute?.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    return currentRoute?.snapshot.data['title'] ?? null;
  }

  private resetPasswordForm(): void {
    this.showCurrentPassword = false;
    this.showNewPassword = false;
    this.showConfirmPassword = false;
    this.passwordForm = {
      senhaAtual: '',
      novaSenha: '',
      confirmarNovaSenha: '',
    };
  }

  private updateViewportState(): void {
    this.isMobileViewport = typeof window !== 'undefined' && window.innerWidth <= 992;

    if (!this.isMobileViewport) {
      this.mobileSidebarOpen = false;
    }
  }

  private md5(value: string): string {
    function cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
      a = add32(add32(a, q), add32(x, t));
      return add32((a << s) | (a >>> (32 - s)), b);
    }

    function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
      return cmn((b & c) | (~b & d), a, b, x, s, t);
    }

    function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
      return cmn((b & d) | (c & ~d), a, b, x, s, t);
    }

    function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
      return cmn(b ^ c ^ d, a, b, x, s, t);
    }

    function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
      return cmn(c ^ (b | ~d), a, b, x, s, t);
    }

    function md5cycle(state: number[], block: number[]): void {
      let [a, b, c, d] = state;

      a = ff(a, b, c, d, block[0], 7, -680876936);
      d = ff(d, a, b, c, block[1], 12, -389564586);
      c = ff(c, d, a, b, block[2], 17, 606105819);
      b = ff(b, c, d, a, block[3], 22, -1044525330);
      a = ff(a, b, c, d, block[4], 7, -176418897);
      d = ff(d, a, b, c, block[5], 12, 1200080426);
      c = ff(c, d, a, b, block[6], 17, -1473231341);
      b = ff(b, c, d, a, block[7], 22, -45705983);
      a = ff(a, b, c, d, block[8], 7, 1770035416);
      d = ff(d, a, b, c, block[9], 12, -1958414417);
      c = ff(c, d, a, b, block[10], 17, -42063);
      b = ff(b, c, d, a, block[11], 22, -1990404162);
      a = ff(a, b, c, d, block[12], 7, 1804603682);
      d = ff(d, a, b, c, block[13], 12, -40341101);
      c = ff(c, d, a, b, block[14], 17, -1502002290);
      b = ff(b, c, d, a, block[15], 22, 1236535329);

      a = gg(a, b, c, d, block[1], 5, -165796510);
      d = gg(d, a, b, c, block[6], 9, -1069501632);
      c = gg(c, d, a, b, block[11], 14, 643717713);
      b = gg(b, c, d, a, block[0], 20, -373897302);
      a = gg(a, b, c, d, block[5], 5, -701558691);
      d = gg(d, a, b, c, block[10], 9, 38016083);
      c = gg(c, d, a, b, block[15], 14, -660478335);
      b = gg(b, c, d, a, block[4], 20, -405537848);
      a = gg(a, b, c, d, block[9], 5, 568446438);
      d = gg(d, a, b, c, block[14], 9, -1019803690);
      c = gg(c, d, a, b, block[3], 14, -187363961);
      b = gg(b, c, d, a, block[8], 20, 1163531501);
      a = gg(a, b, c, d, block[13], 5, -1444681467);
      d = gg(d, a, b, c, block[2], 9, -51403784);
      c = gg(c, d, a, b, block[7], 14, 1735328473);
      b = gg(b, c, d, a, block[12], 20, -1926607734);

      a = hh(a, b, c, d, block[5], 4, -378558);
      d = hh(d, a, b, c, block[8], 11, -2022574463);
      c = hh(c, d, a, b, block[11], 16, 1839030562);
      b = hh(b, c, d, a, block[14], 23, -35309556);
      a = hh(a, b, c, d, block[1], 4, -1530992060);
      d = hh(d, a, b, c, block[4], 11, 1272893353);
      c = hh(c, d, a, b, block[7], 16, -155497632);
      b = hh(b, c, d, a, block[10], 23, -1094730640);
      a = hh(a, b, c, d, block[13], 4, 681279174);
      d = hh(d, a, b, c, block[0], 11, -358537222);
      c = hh(c, d, a, b, block[3], 16, -722521979);
      b = hh(b, c, d, a, block[6], 23, 76029189);
      a = hh(a, b, c, d, block[9], 4, -640364487);
      d = hh(d, a, b, c, block[12], 11, -421815835);
      c = hh(c, d, a, b, block[15], 16, 530742520);
      b = hh(b, c, d, a, block[2], 23, -995338651);

      a = ii(a, b, c, d, block[0], 6, -198630844);
      d = ii(d, a, b, c, block[7], 10, 1126891415);
      c = ii(c, d, a, b, block[14], 15, -1416354905);
      b = ii(b, c, d, a, block[5], 21, -57434055);
      a = ii(a, b, c, d, block[12], 6, 1700485571);
      d = ii(d, a, b, c, block[3], 10, -1894986606);
      c = ii(c, d, a, b, block[10], 15, -1051523);
      b = ii(b, c, d, a, block[1], 21, -2054922799);
      a = ii(a, b, c, d, block[8], 6, 1873313359);
      d = ii(d, a, b, c, block[15], 10, -30611744);
      c = ii(c, d, a, b, block[6], 15, -1560198380);
      b = ii(b, c, d, a, block[13], 21, 1309151649);
      a = ii(a, b, c, d, block[4], 6, -145523070);
      d = ii(d, a, b, c, block[11], 10, -1120210379);
      c = ii(c, d, a, b, block[2], 15, 718787259);
      b = ii(b, c, d, a, block[9], 21, -343485551);

      state[0] = add32(a, state[0]);
      state[1] = add32(b, state[1]);
      state[2] = add32(c, state[2]);
      state[3] = add32(d, state[3]);
    }

    function md5blk(input: string): number[] {
      const blocks: number[] = [];
      for (let i = 0; i < 64; i += 4) {
        blocks[i >> 2] = input.charCodeAt(i)
          + (input.charCodeAt(i + 1) << 8)
          + (input.charCodeAt(i + 2) << 16)
          + (input.charCodeAt(i + 3) << 24);
      }
      return blocks;
    }

    function md51(input: string): number[] {
      const length = input.length;
      const state = [1732584193, -271733879, -1732584194, 271733878];
      let i: number;

      for (i = 64; i <= length; i += 64) {
        md5cycle(state, md5blk(input.substring(i - 64, i)));
      }

      input = input.substring(i - 64);
      const tail = new Array(16).fill(0);

      for (i = 0; i < input.length; i += 1) {
        tail[i >> 2] |= input.charCodeAt(i) << ((i % 4) << 3);
      }

      tail[i >> 2] |= 0x80 << ((i % 4) << 3);

      if (i > 55) {
        md5cycle(state, tail);
        tail.fill(0);
      }

      tail[14] = length * 8;
      md5cycle(state, tail);
      return state;
    }

    function rhex(num: number): string {
      const hexChars = '0123456789abcdef';
      let output = '';

      for (let j = 0; j < 4; j += 1) {
        output += hexChars[(num >> (j * 8 + 4)) & 0x0f] + hexChars[(num >> (j * 8)) & 0x0f];
      }

      return output;
    }

    function hex(input: number[]): string {
      return input.map(rhex).join('');
    }

    function add32(a: number, b: number): number {
      return (a + b) & 0xffffffff;
    }

    return hex(md51(value));
  }
}
