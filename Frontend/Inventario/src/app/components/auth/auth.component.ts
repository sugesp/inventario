import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../auth/auth.service';
import { LoginPayload, PreRegisterPayload } from '../../auth/auth.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
})
export class AuthComponent {
  private preRegisterOverlayPointerDownOutside = false;
  loading = false;
  preRegisterLoading = false;
  showPassword = false;
  showPreRegisterPassword = false;
  showPreRegisterModal = false;
  readonly appTitle = environment.title?.trim() || 'Inventario';
  readonly appEyebrow = 'Sistema de Inventário';

  loginForm: LoginPayload = {
    cpf: '',
    senha: '',
  };

  preRegisterForm: PreRegisterPayload & { confirmarSenha: string } = {
    nome: '',
    email: '',
    cpf: '',
    senha: '',
    confirmarSenha: '',
  };

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly toastr: ToastrService
  ) {
    if (this.authService.isAuthenticated) {
      this.router.navigate(['/dashboard']);
    }
  }

  onCpfInput(value: string): void {
    this.loginForm.cpf = this.formatCpf(value);
  }

  onPreRegisterCpfInput(value: string): void {
    this.preRegisterForm.cpf = this.formatCpf(value);
  }

  submitLogin(): void {
    this.loading = true;
    const payload: LoginPayload = {
      ...this.loginForm,
      cpf: this.onlyDigits(this.loginForm.cpf),
    };

    this.authService.login(payload).subscribe({
      next: (response) => {
        this.loading = false;
        this.toastr.success(
          response.mustChangePassword
            ? 'Login realizado. Você precisa alterar a senha padrão para continuar.'
            : 'Login realizado com sucesso.'
        );
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.loading = false;
        this.toastr.error(error?.error?.message ?? 'Não foi possível realizar login.');
      },
    });
  }

  submitPreRegister(): void {
    if (this.preRegisterForm.senha.trim() !== this.preRegisterForm.confirmarSenha.trim()) {
      this.toastr.error('A confirmação de senha não confere.');
      return;
    }

    this.preRegisterLoading = true;
    const payload: PreRegisterPayload = {
      nome: this.preRegisterForm.nome.trim(),
      email: this.preRegisterForm.email.trim(),
      cpf: this.onlyDigits(this.preRegisterForm.cpf),
      senha: this.preRegisterForm.senha.trim(),
    };

    this.authService.preRegister(payload).subscribe({
      next: () => {
        this.preRegisterLoading = false;
        this.toastr.success('Pré-cadastro realizado. Aguarde a aprovação de um administrador.');
        this.loginForm.cpf = this.preRegisterForm.cpf;
        this.preRegisterForm = {
          nome: '',
          email: '',
          cpf: '',
          senha: '',
          confirmarSenha: '',
        };
        this.showPreRegisterModal = false;
      },
      error: (error) => {
        this.preRegisterLoading = false;
        this.toastr.error(error?.error?.message ?? 'Não foi possível realizar o pré-cadastro.');
      },
    });
  }

  openPreRegisterModal(): void {
    this.showPreRegisterModal = true;
  }

  closePreRegisterModal(): void {
    if (this.preRegisterLoading) {
      return;
    }

    this.showPreRegisterModal = false;
  }

  onPreRegisterOverlayPointerDown(event: MouseEvent): void {
    this.preRegisterOverlayPointerDownOutside = event.target === event.currentTarget;
  }

  onPreRegisterOverlayPointerUp(event: MouseEvent): void {
    const endedOutside = event.target === event.currentTarget;
    if (this.preRegisterOverlayPointerDownOutside && endedOutside) {
      this.closePreRegisterModal();
    }

    this.preRegisterOverlayPointerDownOutside = false;
  }

  private formatCpf(value: string): string {
    const digits = this.onlyDigits(value).slice(0, 11);

    if (digits.length <= 3) {
      return digits;
    }

    if (digits.length <= 6) {
      return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }

    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }

    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  private onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
  }
}
