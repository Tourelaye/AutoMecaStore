import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VeloListComponen } from './velo-list.component';

describe('PoidLourdsListComponent', () => {
  let component: VeloListComponen;
  let fixture: ComponentFixture<VeloListComponen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VeloListComponen]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VeloListComponen);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
