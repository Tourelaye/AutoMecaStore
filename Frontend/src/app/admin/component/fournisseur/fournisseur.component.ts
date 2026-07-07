import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import {
  FournisseurService,
  Fournisseur,
  FournisseurStatus,
  FournisseurPayload
} from './fournisseur.service';

type ModalMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-fournisseur',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fournisseur.component.html',
  styleUrls: ['./fournisseur.component.css']
})
export class FournisseurComponent implements OnInit {
  loading = true;
  fournisseurs: Fournisseur[] = [];
  filtered: Fournisseur[] = [];

  searchTerm = '';
  statusFilter: 'tous' | FournisseurStatus = 'tous';

  statusOptions: { value: 'tous' | FournisseurStatus; label: string }[] = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'actif', label: 'Actif' },
    { value: 'suspendu', label: 'Suspendu' },
    { value: 'requis_validation', label: 'Requis validation' }
  ];

  // --- Modale (création / édition / lecture seule) ---
  showModal = false;
  modalMode: ModalMode = 'create';
  submitting = false;
  form: FournisseurPayload = this.emptyForm();
  editingId: string | null = null;
  viewingFournisseur: Fournisseur | null = null;

  // --- Suppression ---
  pendingDeleteId: string | null = null;

  constructor(private fournisseurService: FournisseurService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.fournisseurService.getAll().subscribe(list => {
      this.fournisseurs = list;
      this.applyFilters();
      this.loading = false;
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.fournisseurs.filter(f => {
      const matchesStatus = this.statusFilter === 'tous' || f.status === this.statusFilter;
      const matchesSearch =
        !term ||
        f.name.toLowerCase().includes(term) ||
        f.email.toLowerCase().includes(term) ||
        f.siret.includes(term);
      return matchesStatus && matchesSearch;
    });
  }

  statusLabel(status: FournisseurStatus): string {
    return status === 'actif' ? 'ACTIF' : status === 'suspendu' ? 'SUSPENDU' : 'REQUIS_VALIDATION';
  }

  initials(name: string): string {
    return name.trim().charAt(0).toUpperCase();
  }

  // --- Ouverture de la modale selon le mode ---
  openCreate(): void {
    this.modalMode = 'create';
    this.editingId = null;
    this.viewingFournisseur = null;
    this.form = this.emptyForm();
    this.showModal = true;
  }

  openEdit(f: Fournisseur): void {
    this.modalMode = 'edit';
    this.editingId = f.id;
    this.viewingFournisseur = null;
    this.form = {
      name: f.name, rep: f.rep, siret: f.siret,
      email: f.email, phone: f.phone, address: f.address, bio: f.bio
    };
    this.showModal = true;
  }

  openProfile(f: Fournisseur): void {
    this.modalMode = 'view';
    this.viewingFournisseur = f;
    this.editingId = null;
    this.showModal = true;
  }

  closeModal(): void {
    if (this.submitting) return;
    this.showModal = false;
  }

  submitForm(ngForm: NgForm): void {
    if (this.modalMode === 'view') {
      this.closeModal();
      return;
    }
    if (ngForm.invalid) {
      Object.values(ngForm.controls).forEach(c => c.markAsTouched());
      return;
    }
    this.submitting = true;

    if (this.modalMode === 'edit' && this.editingId) {
      const id = this.editingId;
      this.fournisseurService.update(id, this.form).subscribe(updated => {
        this.fournisseurs = this.fournisseurs.map(f => (f.id === id ? { ...f, ...updated } : f));
        this.applyFilters();
        this.submitting = false;
        this.showModal = false;
      });
    } else {
      this.fournisseurService.create(this.form).subscribe(created => {
        this.fournisseurs = [created, ...this.fournisseurs];
        this.applyFilters();
        this.submitting = false;
        this.showModal = false;
      });
    }
  }

  private emptyForm(): FournisseurPayload {
    return { name: '', rep: '', siret: '', email: '', phone: '', address: '', bio: '' };
  }

  // --- Suppression ---
  askDelete(id: string): void {
    this.pendingDeleteId = id;
  }

  cancelDelete(): void {
    this.pendingDeleteId = null;
  }

  confirmDelete(): void {
    if (!this.pendingDeleteId) return;
    const id = this.pendingDeleteId;
    this.fournisseurService.delete(id).subscribe(() => {
      this.fournisseurs = this.fournisseurs.filter(f => f.id !== id);
      this.applyFilters();
      this.pendingDeleteId = null;
    });
  }

  trackById(_index: number, item: Fournisseur): string {
    return item.id;
  }
}