import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VeloListComponent } from './velo-list.component';

describe('VeloListComponent', () => {
  let component: VeloListComponent;
  let fixture: ComponentFixture<VeloListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VeloListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VeloListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
