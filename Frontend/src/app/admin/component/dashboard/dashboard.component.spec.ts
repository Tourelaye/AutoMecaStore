import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from './dashboard.service';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let dashboardService: jasmine.SpyObj<DashboardService>;

  beforeEach(async () => {
    dashboardService = jasmine.createSpyObj('DashboardService', ['getStats']);
    dashboardService.getStats.and.returnValue(of({
      caCumule: 100,
      commissions: 10,
      fournisseursTotal: 2,
      fournisseursActifs: 1,
      fournisseursAttente: 1,
      clientsTotal: 5,
      produitsTotal: 3,
      produitsActifs: 2,
      attenteValidation: 1,
      commandesJour: 2,
      commandesMois: 4,
      reclamationsActives: 0,
      rupturesStock: 0,
      produitsSignales: 0,
      fournisseursSuspendus: 0,
      commissionRate: '10%',
      evolutionPct: 10,
      categories: [],
      chart: [],
      topFournisseurs: [],
      topProduits: []
    }));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [{ provide: DashboardService, useValue: dashboardService }]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('reloads the dashboard for the selected period', () => {
    component.selectPeriod('30 jours');

    expect(component.selectedPeriod).toBe('30 jours');
    expect(dashboardService.getStats).toHaveBeenCalledWith('30 jours');
  });
});
