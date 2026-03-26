import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AditivosListComponent } from './aditivos-list.component';

describe('AditivosListComponent', () => {
  let component: AditivosListComponent;
  let fixture: ComponentFixture<AditivosListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AditivosListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AditivosListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
