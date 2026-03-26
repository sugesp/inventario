import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpenhosComponent } from './empenhos.component';

describe('EmpenhosComponent', () => {
  let component: EmpenhosComponent;
  let fixture: ComponentFixture<EmpenhosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmpenhosComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EmpenhosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
