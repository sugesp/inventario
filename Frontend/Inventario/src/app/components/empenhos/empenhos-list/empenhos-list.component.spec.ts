import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpenhosListComponent } from './empenhos-list.component';

describe('EmpenhosListComponent', () => {
  let component: EmpenhosListComponent;
  let fixture: ComponentFixture<EmpenhosListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmpenhosListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EmpenhosListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
