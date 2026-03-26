import {
  AfterViewInit,
  Component,
  ElementRef,
  forwardRef,
  HostListener,
  Input,
  ViewChild,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';

export type SearchableSelectValue = string | number | null;

export interface SearchableSelectOption {
  value: SearchableSelectValue;
  label: string;
  depth?: number;
}

@Component({
  selector: 'app-searchable-select',
  templateUrl: './searchable-select.component.html',
  styleUrl: './searchable-select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
  ],
})
export class SearchableSelectComponent implements ControlValueAccessor, Validator, AfterViewInit {
  @Input() options: SearchableSelectOption[] = [];
  @Input() placeholder = 'Selecione';
  @Input() searchPlaceholder = 'Digite para pesquisar';
  @Input() emptyOptionLabel: string | null = null;
  @Input() required = false;

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  value: SearchableSelectValue = null;
  searchTerm = '';
  isOpen = false;
  disabled = false;

  private onChange: (value: SearchableSelectValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private onValidatorChange: () => void = () => undefined;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    this.focusSearchInput();
  }

  get filteredOptions(): SearchableSelectOption[] {
    const normalizedSearch = this.normalize(this.searchTerm);
    if (!normalizedSearch) {
      return this.options;
    }

    return this.options.filter((option) => this.normalize(option.label).includes(normalizedSearch));
  }

  get selectedOption(): SearchableSelectOption | undefined {
    return this.options.find((option) => option.value === this.value);
  }

  writeValue(value: SearchableSelectValue): void {
    this.value = value ?? null;
  }

  registerOnChange(fn: (value: SearchableSelectValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }

  validate(_: AbstractControl): ValidationErrors | null {
    if (this.required && (this.value === null || this.value === '')) {
      return { required: true };
    }

    return null;
  }

  toggleDropdown(): void {
    if (this.disabled) {
      return;
    }

    this.isOpen = !this.isOpen;
    this.onTouched();
    this.searchTerm = '';
    this.focusSearchInput();
  }

  handleOptionMouseDown(event: MouseEvent, option: SearchableSelectOption): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectOption(option);
  }

  handleClearMouseDown(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.clearSelection();
  }

  selectOption(option: SearchableSelectOption): void {
    this.value = option.value;
    this.onChange(this.value);
    this.onTouched();
    this.closeDropdown();
  }

  clearSelection(): void {
    this.value = null;
    this.onChange(this.value);
    this.onTouched();
    this.closeDropdown();
  }

  closeDropdown(): void {
    this.isOpen = false;
    this.searchTerm = '';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }

  private focusSearchInput(): void {
    if (!this.isOpen) {
      return;
    }

    window.setTimeout(() => {
      this.searchInput?.nativeElement.focus();
    });
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
