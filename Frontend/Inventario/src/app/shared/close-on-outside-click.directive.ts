import { Directive, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[appCloseOnOutsideClick]',
})
export class CloseOnOutsideClickDirective {
  @Output() appCloseOnOutsideClick = new EventEmitter<void>();

  private pointerStartedOutside = false;

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    this.pointerStartedOutside = event.target === event.currentTarget;
  }

  @HostListener('mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    const pointerEndedOutside = event.target === event.currentTarget;

    if (this.pointerStartedOutside && pointerEndedOutside) {
      this.appCloseOnOutsideClick.emit();
    }

    this.pointerStartedOutside = false;
  }
}
