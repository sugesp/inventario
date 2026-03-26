import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpenhosDetailComponent } from './empenhos-detail.component';

describe('EmpenhosDetailComponent', () => {
  let component: EmpenhosDetailComponent;
  let fixture: ComponentFixture<EmpenhosDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmpenhosDetailComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EmpenhosDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
