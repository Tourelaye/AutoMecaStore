import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VehiculeClientService } from '../../../core/services/vehicule-client.service';
import { VehiculeClient } from '../../../models/vehicule-client.model';

@Component({
  selector: 'app-mes-vehicules',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './mes-vehicules.component.html',
  styleUrls: ['./mes-vehicules.component.css']
})
export class MesVehiculesComponent implements OnInit {
  vehicules: VehiculeClient[] = [];
  form: FormGroup;
  isLoading = false;
  error = '';
  editing: VehiculeClient | null = null;

  constructor(
    private vehiculeService: VehiculeClientService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      marque: ['', Validators.required],
      modele: ['', Validators.required],
      annee: ['', [Validators.required, Validators.min(1900), Validators.max(2100)]],
      motorisation: [''],
      carburant: [''],
      version: [''],
      immatriculation: [''],
      actif: [false]
    });
  }

  ngOnInit(): void {
    this.loadVehicules();
  }

  loadVehicules(): void {
    this.isLoading = true;
    this.vehiculeService.getVehicules().subscribe({
      next: (data) => {
        this.vehicules = data;
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Erreur lors du chargement des véhicules';
        this.isLoading = false;
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const data: VehiculeClient = this.form.value;
    if (this.editing?.id) {
      this.vehiculeService.updateVehicule(this.editing.id, data).subscribe({
        next: () => {
          this.resetForm();
          this.loadVehicules();
        },
        error: () => this.error = 'Erreur lors de la modification'
      });
    } else {
      this.vehiculeService.createVehicule(data).subscribe({
        next: () => {
          this.resetForm();
          this.loadVehicules();
        },
        error: () => this.error = 'Erreur lors de l\'ajout'
      });
    }
  }

  edit(v: VehiculeClient): void {
    this.editing = v;
    this.form.patchValue(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  delete(id: number | undefined): void {
    if (!id) return;
    if (confirm('Supprimer ce véhicule ?')) {
      this.vehiculeService.deleteVehicule(id).subscribe({
        next: () => this.loadVehicules(),
        error: () => this.error = 'Erreur lors de la suppression'
      });
    }
  }

  setActif(id: number | undefined): void {
    if (!id) return;
    this.vehiculeService.setActif(id).subscribe({
      next: () => this.loadVehicules()
    });
  }

  resetForm(): void {
    this.editing = null;
    this.form.reset({ actif: false });
    this.error = '';
  }

  cancelEdit(): void {
    this.resetForm();
  }
}
