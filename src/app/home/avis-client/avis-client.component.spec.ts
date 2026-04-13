import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvisClientComponent } from './avis-client.component';

describe('AvisClientComponent', () => {
  let component: AvisClientComponent;
  let fixture: ComponentFixture<AvisClientComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvisClientComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvisClientComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
