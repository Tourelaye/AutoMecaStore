import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoidLourdsListComponen } from './poid-lourds-list.component';

describe('PoidLourdsListComponent', () => {
  let component: PoidLourdsListComponen;
  let fixture: ComponentFixture<PoidLourdsListComponen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoidLourdsListComponen]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoidLourdsListComponen);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
