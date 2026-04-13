import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VogueComponent } from './vogue.component';

describe('VogueComponent', () => {
  let component: VogueComponent;
  let fixture: ComponentFixture<VogueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VogueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VogueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
