import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvisReclamationComponent } from './avis-reclamation.component';

describe('AvisReclamationComponent', () => {
  let component: AvisReclamationComponent;
  let fixture: ComponentFixture<AvisReclamationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvisReclamationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvisReclamationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
