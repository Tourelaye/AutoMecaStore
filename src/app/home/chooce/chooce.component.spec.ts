import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChooceComponent } from './chooce.component';

describe('ChooceComponent', () => {
  let component: ChooceComponent;
  let fixture: ComponentFixture<ChooceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChooceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChooceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
