import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoidLourdsListComponent } from './poid-lourds-list.component';

describe('PoidLourdsListComponent', () => {
  let component: PoidLourdsListComponent;
  let fixture: ComponentFixture<PoidLourdsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoidLourdsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoidLourdsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
