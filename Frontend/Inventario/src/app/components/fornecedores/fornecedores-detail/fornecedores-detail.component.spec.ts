import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FornecedoresDetailComponent } from './fornecedores-detail.component';

describe('FornecedoresDetailComponent', () => {
  let component: FornecedoresDetailComponent;
  let fixture: ComponentFixture<FornecedoresDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FornecedoresDetailComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FornecedoresDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
