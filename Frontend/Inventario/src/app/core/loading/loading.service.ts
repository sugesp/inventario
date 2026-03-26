import { Injectable } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private pendingRequests = 0;

  constructor(private readonly spinner: NgxSpinnerService) {}

  show(): void {
    this.pendingRequests++;
    this.spinner.show();
  }

  hide(): void {
    this.pendingRequests = Math.max(this.pendingRequests - 1, 0);

    if (this.pendingRequests === 0) {
      this.spinner.hide();
    }
  }
}
