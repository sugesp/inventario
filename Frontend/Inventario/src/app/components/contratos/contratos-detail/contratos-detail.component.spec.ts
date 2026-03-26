import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContratosDetailComponent } from './contratos-detail.component';

describe('ContratosDetailComponent', () => {
  let component: ContratosDetailComponent;
  let fixture: ComponentFixture<ContratosDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ContratosDetailComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ContratosDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
