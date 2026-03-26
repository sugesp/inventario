import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContratosListComponent } from './contratos-list.component';

describe('ContratosListComponent', () => {
  let component: ContratosListComponent;
  let fixture: ComponentFixture<ContratosListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ContratosListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ContratosListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
