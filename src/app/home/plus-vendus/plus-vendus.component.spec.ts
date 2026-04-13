import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlusVendusComponent } from './plus-vendus.component';

describe('PlusVendusComponent', () => {
  let component: PlusVendusComponent;
  let fixture: ComponentFixture<PlusVendusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlusVendusComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlusVendusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
