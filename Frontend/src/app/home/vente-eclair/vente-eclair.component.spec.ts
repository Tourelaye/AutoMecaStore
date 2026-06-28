import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VenteEclairComponent } from './vente-eclair.component';

describe('VenteEclairComponent', () => {
  let component: VenteEclairComponent;
  let fixture: ComponentFixture<VenteEclairComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VenteEclairComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VenteEclairComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
