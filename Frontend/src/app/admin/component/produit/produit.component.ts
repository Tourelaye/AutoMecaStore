import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { ProduitService, Produit, SousCategorie } from '../../../core/services/produit.service';
import { CategorieService } from '../../../core/services/categorie.service';
import { Categorie } from '../../../models/categorie.model';

@Component({
  selector: 'app-produit',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  templateUrl: './produit.component.html',
  styleUrl: './produit.component.css'
})
export class ProduitComponent implements OnInit {
  // Liste des produits
  produits: Produit[] = [];
  categories: Categorie[] = [];
  sousCategories: SousCategorie[] = [];
  
  // Backend URL pour les images
  private backendUrl = 'http://localhost:8000';
  
  // État du modal
  showModal = false;
  isEditing = false;
  editingProduitId: number | null = null;
  
  // Modal de suppression
  showDeleteModal = false;
  produitToDelete: Produit | null = null;
  
  // Menu dropdown
  activeMenu: number | null = null;
  
  // Formulaire avec tous les champs
  produitForm: any = {
    nom: '',
    description: '',
    prix: 0,
    stock: 0,
    categorie: null,
    sous_categorie: null,
    reference: '',
    marque: '',
    est_en_promo: false,
    prix_promo: null,
    pourcentage_reduction: null,
    date_debut_promo: null,
    date_fin_promo: null,
    vente_eclair: false,
    heure_debut_eclair: null,
    heure_fin_eclair: null,
    est_vedette: false,
    est_tendance: false,
    est_recommande: false,
    est_bestseller: false,
    image: null
  };

  // Upload image
  imageFile: File | null = null;
  imagePreview: string | null = null;
  imageFile2: File | null = null;
  imagePreview2: string | null = null;
  imageFile3: File | null = null;
  imagePreview3: string | null = null;
  imageFile4: File | null = null;
  imagePreview4: string | null = null;
  
  // Recherche
  searchQuery = '';
  searchFocused = false;
  
  // Loading state
  isLoading = false;
  
  // Message de succès/erreur
  message = '';
  messageType: 'success' | 'error' = 'success';
  notificationTimeout: any = null;
  
  constructor(
    private produitService: ProduitService,
    private categorieService: CategorieService
  ) {}
  
  ngOnInit(): void {
    this.loadProduits();
    this.loadCategories();
  }
  
  // Charger les produits depuis la base de données
  loadProduits(): void {
    console.log('=== CHARGEMENT PRODUITS ===');
    this.isLoading = true;
    this.produitService.getProduits().subscribe({
      next: (response) => {
        console.log('Réponse API:', response);
        if (Array.isArray(response)) {
          this.produits = response;
        } else {
          this.produits = response.results || [];
        }
        console.log('Produits chargés:', this.produits.length);
        console.log('Liste:', this.produits);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des produits:', error);
        this.showMessage('Erreur lors du chargement des produits', 'error');
        this.isLoading = false;
      }
    });
  }
  
  // Charger les catégories depuis la base de données
  loadCategories(): void {
    this.categorieService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories as any;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des catégories:', error);
        this.showMessage('Erreur lors du chargement des catégories', 'error');
      }
    });
  }

  // Charger les types de pièces selon la catégorie sélectionnée
  onCategoryChange(): void {
    const categorieId = this.produitForm.categorie ? (this.produitForm.categorie as any).id : null;

    console.log("Catégorie sélectionnée :", categorieId);

    // Réinitialiser le type de pièce
    this.produitForm.sous_categorie = null;
    this.sousCategories = [];

    if (categorieId) {
      this.produitService.getTypesPieces(categorieId).subscribe({
        next: (typesPieces) => {
          console.log("Types reçus depuis l'API :", typesPieces);
          this.sousCategories = typesPieces;
          console.log("Liste finale affichée :", this.sousCategories);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des types de pièces:', error);
        }
      });
    }
  }
  
  // Ouvrir le modal pour ajouter
  openAddModal(): void {
    this.isEditing = false;
    this.editingProduitId = null;
    this.resetForm();
    this.showModal = true;
  }
  
  // Toggle menu dropdown
  toggleMenu(produitId: number): void {
    this.activeMenu = this.activeMenu === produitId ? null : produitId;
  }
  
  // Modifier un produit
  editProduit(produit: Produit): void {
    this.activeMenu = null;
    this.isEditing = true;
    this.editingProduitId = produit.id;
    this.imageFile = null;
    this.imagePreview = null;
    this.imageFile2 = null;
    this.imagePreview2 = null;
    this.imageFile3 = null;
    this.imagePreview3 = null;
    this.imageFile4 = null;
    this.imagePreview4 = null;
    this.produitForm = {
      nom: produit.nom,
      description: produit.description,
      prix: produit.prix,
      stock: produit.stock,
      categorie: produit.categorie_detail || produit.categorie,
      sous_categorie: produit.sous_categorie_detail || produit.sous_categorie,
      reference: (produit as any).reference || '',
      marque: (produit as any).marque || '',
      est_en_promo: (produit as any).est_en_promo || false,
      prix_promo: (produit as any).prix_promo || null,
      pourcentage_reduction: (produit as any).pourcentage_reduction || null,
      date_debut_promo: (produit as any).date_debut_promo || null,
      date_fin_promo: (produit as any).date_fin_promo || null,
      vente_eclair: (produit as any).vente_eclair || false,
      heure_debut_eclair: (produit as any).heure_debut_eclair || null,
      heure_fin_eclair: (produit as any).heure_fin_eclair || null,
      est_vedette: (produit as any).est_vedette || false,
      est_tendance: (produit as any).est_tendance || false,
      est_recommande: (produit as any).est_recommande || false,
      est_bestseller: (produit as any).est_bestseller || false,
      image: (produit as any).image || null
    };
    
    // Charger les sous-catégories si une catégorie est sélectionnée
    if (this.produitForm.categorie) {
      this.onCategoryChange();
      // Restaurer la sous-catégorie après chargement
      if (this.produitForm.sous_categorie) {
        this.produitForm.sous_categorie = this.produitForm.sous_categorie;
      }
    }
    
    this.showModal = true;
  }
  
  // Supprimer un produit
  deleteProduit(produit: Produit): void {
    this.activeMenu = null;
    this.produitToDelete = produit;
    this.showDeleteModal = true;
  }

  // Confirmer la suppression
  confirmDelete(): void {
    if (this.produitToDelete) {
      this.produitService.deleteProduit(this.produitToDelete.id).subscribe({
        next: () => {
          // Animation de suppression
          const index = this.produits.findIndex(p => p.id === this.produitToDelete!.id);
          if (index !== -1) {
            // Ajouter une classe d'animation avant suppression
            this.produits[index] = { ...this.produits[index], deleting: true } as any;
            
            // Attendre la fin de l'animation avant suppression
            setTimeout(() => {
              this.produits = this.produits.filter(p => p.id !== this.produitToDelete!.id);
              this.showMessage('Produit supprimé avec succès !', 'success');
            }, 300);
          }
          this.showDeleteModal = false;
          this.produitToDelete = null;
        },
        error: (error) => {
          console.error('Erreur suppression:', error);
          this.showMessage(`Erreur ${error.status}: ${error.error?.detail || 'Suppression impossible'}`, 'error');
          this.showDeleteModal = false;
          this.produitToDelete = null;
        }
      });
    }
  }

  // Annuler la suppression
  cancelDelete(): void {
    this.showDeleteModal = false;
    this.produitToDelete = null;
  }
  
  // Fermer le modal
  closeModal(): void {
    this.showModal = false;
    this.isEditing = false;
    this.editingProduitId = null;
    this.resetForm();
  }

  // Gestion de l'upload d'image
  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.imageFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onImageSelected2(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.imageFile2 = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview2 = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onImageSelected3(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.imageFile3 = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview3 = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onImageSelected4(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.imageFile4 = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview4 = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.imageFile = null;
    this.imagePreview = null;
    this.produitForm.image = null;
  }

  removeImage2(): void {
    this.imageFile2 = null;
    this.imagePreview2 = null;
  }

  removeImage3(): void {
    this.imageFile3 = null;
    this.imagePreview3 = null;
  }

  removeImage4(): void {
    this.imageFile4 = null;
    this.imagePreview4 = null;
  }

  // Réinitialiser le formulaire
  resetForm(): void {
    this.produitForm = {
      nom: '',
      description: '',
      prix: 0,
      stock: 0,
      categorie: null,
      sous_categorie: null,
      reference: '',
      marque: '',
      est_en_promo: false,
      prix_promo: null,
      pourcentage_reduction: null,
      date_debut_promo: null,
      date_fin_promo: null,
      vente_eclair: false,
      heure_debut_eclair: null,
      heure_fin_eclair: null,
      est_vedette: false,
      est_tendance: false,
      est_recommande: false,
      est_bestseller: false,
      image: null
    };
    this.imageFile = null;
    this.imagePreview = null;
    this.imageFile2 = null;
    this.imagePreview2 = null;
    this.imageFile3 = null;
    this.imagePreview3 = null;
    this.imageFile4 = null;
    this.imagePreview4 = null;
    this.sousCategories = [];
  }
  
  // Sauvegarder le produit (créer ou mettre à jour)
  saveProduit(): void {
    console.log('=== SAUVEGARDE PRODUIT ===');
    console.log('Mode:', this.isEditing ? 'MODIFICATION' : 'CREATION');
    console.log('Form data:', this.produitForm);
    console.log('Image file:', this.imageFile);
    console.log('Image preview:', this.imagePreview);

    if (!this.produitForm.nom || !this.produitForm.prix) {
      this.showMessage('Veuillez remplir le nom et le prix', 'error');
      return;
    }

    // Si une nouvelle image est sélectionnée, utiliser FormData
    if (this.imageFile || this.imageFile2 || this.imageFile3 || this.imageFile4) {
      const formData = new FormData();
      formData.append('nom', this.produitForm.nom!);
      formData.append('description', this.produitForm.description || '');
      formData.append('prix', String(Number(this.produitForm.prix)));
      formData.append('stock', String(Number(this.produitForm.stock) || 0));
      if (this.produitForm.categorie) {
        formData.append('categorie', String((this.produitForm.categorie as any).id));
      }
      if (this.produitForm.sous_categorie) {
        formData.append('sous_categorie', String((this.produitForm.sous_categorie as any).id));
      }
      if (this.produitForm.reference) {
        formData.append('reference', this.produitForm.reference);
      }
      if (this.produitForm.marque) {
        formData.append('marque', this.produitForm.marque);
      }
      formData.append('est_en_promo', String(this.produitForm.est_en_promo || false));
      if (this.produitForm.est_en_promo && this.produitForm.prix_promo) {
        formData.append('prix_promo', String(Number(this.produitForm.prix_promo)));
      }
      if (this.produitForm.pourcentage_reduction) {
        formData.append('pourcentage_reduction', String(Number(this.produitForm.pourcentage_reduction)));
      }
      if (this.produitForm.est_en_promo && this.produitForm.date_debut_promo) {
        formData.append('date_debut_promo', this.produitForm.date_debut_promo);
      }
      if (this.produitForm.est_en_promo && this.produitForm.date_fin_promo) {
        formData.append('date_fin_promo', this.produitForm.date_fin_promo);
      }
      formData.append('vente_eclair', String(this.produitForm.vente_eclair || false));
      if (this.produitForm.vente_eclair && this.produitForm.heure_debut_eclair) {
        formData.append('heure_debut_eclair', this.produitForm.heure_debut_eclair);
      }
      if (this.produitForm.vente_eclair && this.produitForm.heure_fin_eclair) {
        formData.append('heure_fin_eclair', this.produitForm.heure_fin_eclair);
      }
      formData.append('est_vedette', String(this.produitForm.est_vedette || false));
      formData.append('est_tendance', String(this.produitForm.est_tendance || false));
      formData.append('est_recommande', String(this.produitForm.est_recommande || false));
      formData.append('est_bestseller', String(this.produitForm.est_bestseller || false));
      if (this.imageFile) {
        formData.append('image', this.imageFile);
      }
      if (this.imageFile2) {
        formData.append('image_2', this.imageFile2);
      }
      if (this.imageFile3) {
        formData.append('image_3', this.imageFile3);
      }
      if (this.imageFile4) {
        formData.append('image_4', this.imageFile4);
      }
      formData.append('is_active', 'true'); // S'assurer que le produit est actif

      console.log('FormData avec images:', formData);

      if (this.isEditing && this.editingProduitId) {
        // Modification avec image - utiliser PATCH pour éviter de remplacer tout le produit
        formData.append('is_active', 'true'); // S'assurer que le produit reste actif
        this.produitService.patchProduitWithImage(this.editingProduitId, formData).subscribe({
          next: (updatedProduit) => {
            console.log('=== PRODUIT MIS À JOUR AVEC IMAGE ===');
            console.log('Produit retourné par API:', updatedProduit);
            console.log('ID:', updatedProduit.id);
            console.log('Nom:', updatedProduit.nom);
            console.log('Image:', updatedProduit.image);
            
            // Recharger la liste complète depuis le serveur pour s'assurer que tout est à jour
            this.loadProduits();
            
            this.showModal = false;
            this.showMessage('Produit mis à jour avec succès !', 'success');
          },
          error: (error) => {
            console.error('=== ERREUR API MISE À JOUR ===');
            console.error('Status:', error.status);
            console.error('Message:', error.message);
            console.error('Error body:', error.error);
            this.showMessage(`Erreur ${error.status}: ${error.error?.detail || error.message}`, 'error');
          }
        });
      } else {
        // Création avec image
        this.produitService.createProduitWithImage(formData).subscribe({
          next: (newProduit) => {
            console.log('=== PRODUIT CRÉÉ AVEC IMAGE ===');
            console.log('Produit retourné par API:', newProduit);
            console.log('ID:', newProduit.id);
            console.log('Nom:', newProduit.nom);
            console.log('Image:', newProduit.image);
            
            // Recharger la liste complète depuis le serveur pour s'assurer que tout est à jour
            this.loadProduits();
            
            this.showModal = false;
            this.showMessage('Produit ajouté avec succès !', 'success');
          },
          error: (error) => {
            console.error('=== ERREUR API CRÉATION ===');
            console.error('Status:', error.status);
            console.error('Message:', error.message);
            console.error('Error body:', error.error);
            this.showMessage(`Erreur ${error.status}: ${error.error?.detail || error.message}`, 'error');
          }
        });
      }
    } else {
      // Sans nouvelle image, utiliser JSON
      const produitData: any = {
        nom: this.produitForm.nom!,
        description: this.produitForm.description || '',
        prix: Number(this.produitForm.prix),
        stock: Number(this.produitForm.stock) || 0,
        categorie: this.produitForm.categorie ? (this.produitForm.categorie as any).id : null,
        sous_categorie: this.produitForm.sous_categorie ? (this.produitForm.sous_categorie as any).id : null,
        reference: this.produitForm.reference || null,
        marque: this.produitForm.marque || null,
        est_en_promo: this.produitForm.est_en_promo || false,
        prix_promo: this.produitForm.est_en_promo ? Number(this.produitForm.prix_promo) : null,
        pourcentage_reduction: this.produitForm.pourcentage_reduction ? Number(this.produitForm.pourcentage_reduction) : null,
        date_debut_promo: this.produitForm.est_en_promo && this.produitForm.date_debut_promo ? this.produitForm.date_debut_promo : null,
        date_fin_promo: this.produitForm.est_en_promo && this.produitForm.date_fin_promo ? this.produitForm.date_fin_promo : null,
        vente_eclair: this.produitForm.vente_eclair || false,
        heure_debut_eclair: this.produitForm.vente_eclair && this.produitForm.heure_debut_eclair ? this.produitForm.heure_debut_eclair : null,
        heure_fin_eclair: this.produitForm.vente_eclair && this.produitForm.heure_fin_eclair ? this.produitForm.heure_fin_eclair : null,
        est_vedette: this.produitForm.est_vedette || false,
        est_tendance: this.produitForm.est_tendance || false,
        est_recommande: this.produitForm.est_recommande || false,
        est_bestseller: this.produitForm.est_bestseller || false,
        gestionnaire_stock: null,
        is_active: true // S'assurer que le produit est actif
      };

      // Ne pas envoyer l'image lors d'une modification sans nouvelle image
      // L'image existante sera préservée automatiquement par Django

      console.log('Données envoyées:', produitData);

      if (this.isEditing && this.editingProduitId) {
        // Modification sans image
        this.produitService.updateProduit(this.editingProduitId, produitData).subscribe({
          next: (updatedProduit) => {
            console.log('Produit mis à jour:', updatedProduit);
            const index = this.produits.findIndex(p => p.id === this.editingProduitId);
            if (index !== -1) {
              this.produits[index] = updatedProduit;
            }
            this.showModal = false;
            this.showMessage('Produit mis à jour avec succès !', 'success');
          },
          error: (error) => {
            console.error('=== ERREUR API ===');
            console.error('Status:', error.status);
            console.error('Message:', error.message);
            console.error('Error body:', error.error);
            this.showMessage(`Erreur ${error.status}: ${error.error?.detail || error.message}`, 'error');
          }
        });
      } else {
        // Création sans image
        this.produitService.createProduit(produitData).subscribe({
          next: (newProduit) => {
            console.log('Produit créé:', newProduit);
            this.produits.unshift(newProduit);
            this.showModal = false;
            this.showMessage('Produit ajouté avec succès !', 'success');
          },
          error: (error) => {
            console.error('=== ERREUR API ===');
            console.error('Status:', error.status);
            console.error('Message:', error.message);
            console.error('Error body:', error.error);
            this.showMessage(`Erreur ${error.status}: ${error.error?.detail || error.message}`, 'error');
          }
        });
      }
    }
  }
  
  // Rechercher des produits
  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.produitService.rechercherProduits(this.searchQuery).subscribe({
        next: (produits) => {
          this.produits = produits;
        },
        error: (error) => {
          console.error('Erreur lors de la recherche:', error);
        }
      });
    } else {
      this.loadProduits();
    }
  }
  
  // Afficher un message
  showMessage(msg: string, type: 'success' | 'error'): void {
    // Annuler le timeout précédent s'il existe
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    
    this.message = msg;
    this.messageType = type;
    
    // Fermeture automatique après 4 secondes
    this.notificationTimeout = setTimeout(() => {
      this.hideNotification();
    }, 4000);
  }
  
  // Cacher la notification avec animation
  hideNotification(): void {
    const notificationElement = document.querySelector('.notification');
    if (notificationElement) {
      notificationElement.classList.add('hiding');
      setTimeout(() => {
        this.message = '';
      }, 300);
    } else {
      this.message = '';
    }
  }

  // Fermer la notification au clic
  closeNotification(): void {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    this.hideNotification();
  }

  // Compter les produits en stock
  getInStockCount(): number {
    return this.produits.filter(p => p.stock > 5).length;
  }

  // Compter les produits en stock critique
  getLowStockCount(): number {
    return this.produits.filter(p => p.stock > 0 && p.stock <= 5).length;
  }
  
  // Obtenir le statut du stock
  getStockStatus(stock: number): string {
    if (stock === 0) return 'out';
    if (stock <= 5) return 'low';
    return 'in';
  }
  
  // Obtenir le texte du statut
  getStockLabel(stock: number): string {
    if (stock === 0) return 'Rupture';
    if (stock <= 5) return 'Critique';
    return 'En Stock';
  }

  // Helper pour obtenir l'URL complète de l'image
  getImageUrl(produit: Produit): string {
    if (produit.image_url) {
      // Si image_url commence par http, c'est déjà une URL complète
      if (produit.image_url.startsWith('http')) {
        return produit.image_url;
      }
      // Sinon, ajouter l'URL du backend
      return `${this.backendUrl}${produit.image_url}`;
    }
    if (produit.image) {
      // Si image commence par http, c'est déjà une URL complète
      if (produit.image.startsWith('http')) {
        return produit.image;
      }
      // Sinon, ajouter l'URL du backend
      return `${this.backendUrl}${produit.image}`;
    }
    return '';
  }

  // Helper pour obtenir l'URL complète de l'image du formulaire
  getFormImageUrl(): string {
    if (this.imagePreview) {
      return this.imagePreview;
    }
    if (this.produitForm.image) {
      const imagePath = this.produitForm.image;
      if (imagePath.startsWith('http')) {
        return imagePath;
      }
      return `${this.backendUrl}${imagePath}`;
    }
    return '';
  }
}
