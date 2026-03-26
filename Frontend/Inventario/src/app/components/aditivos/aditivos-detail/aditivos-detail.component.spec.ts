import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AditivosDetailComponent } from './aditivos-detail.component';

describe('AditivosDetailComponent', () => {
  let component: AditivosDetailComponent;
  let fixture: ComponentFixture<AditivosDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AditivosDetailComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AditivosDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
