import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AditivosComponent } from './aditivos.component';

describe('AditivosComponent', () => {
  let component: AditivosComponent;
  let fixture: ComponentFixture<AditivosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AditivosComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AditivosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
