import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, UserResponse } from '../../core/services/auth.service';
import { DashboardService, CategoryItem } from '../../core/services/dashboard.service';
import { ToastService } from '../../core/services/toast.service';
import { NotificationBellComponent } from '../../shared/components/notification-bell/notification-bell.component';

export interface IconPreset {
  id: string;
  name: string;
  symbol: string;
}

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NotificationBellComponent],
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.css'
})
export class CategoriasComponent implements OnInit {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  currentUser: UserResponse | null = null;
  categories: CategoryItem[] = [];
  loading: boolean = true;

  // Sidebar states
  isCollapsed: boolean = false;
  isTxOpen: boolean = false;

  // View Filtering
  activeTab: 'EXPENSE' | 'INCOME' = 'EXPENSE';
  searchTerm: string = '';

  // Cached Filtered Lists
  filteredCategories: CategoryItem[] = [];

  // Modal State: Create / Edit
  isModalOpen: boolean = false;
  isEditing: boolean = false;
  editingCategoryId: number | null = null;
  catName: string = '';
  catType: 'EXPENSE' | 'INCOME' = 'EXPENSE';
  catIcon: string = 'tag';
  catColor: string = '#38bdf8';
  submittingCategory: boolean = false;

  // Modal State: Delete & Reassign
  isDeleteModalOpen: boolean = false;
  categoryToDelete: CategoryItem | null = null;
  reassignTargetName: string = '';
  submittingDelete: boolean = false;

  // Curated Icon Catalog
  iconCatalog: IconPreset[] = [
    { id: 'utensils', name: 'Comida & Restaurantes', symbol: '🍔' },
    { id: 'car', name: 'Transporte & Auto', symbol: '🚗' },
    { id: 'home', name: 'Vivienda & Alquiler', symbol: '🏠' },
    { id: 'bolt', name: 'Servicios & Energía', symbol: '⚡' },
    { id: 'heart-pulse', name: 'Salud & Medicina', symbol: '💊' },
    { id: 'graduation-cap', name: 'Educación & Libros', symbol: '🎓' },
    { id: 'gamepad', name: 'Ocio & Videojuegos', symbol: '🎮' },
    { id: 'laptop', name: 'Tecnología & Cloud', symbol: '💻' },
    { id: 'shopping-bag', name: 'Compras & Ropa', symbol: '🛍️' },
    { id: 'paw', name: 'Mascotas & Veterinaria', symbol: '🐾' },
    { id: 'dumbbell', name: 'Gimnasio & Deporte', symbol: '🏋️' },
    { id: 'plane', name: 'Viajes & Vacaciones', symbol: '✈️' },
    { id: 'wallet', name: 'Salario & Nómina', symbol: '💵' },
    { id: 'gift', name: 'Aguinaldo / Regalo', symbol: '🎁' },
    { id: 'award', name: 'Bono 14 & Logros', symbol: '🏆' },
    { id: 'trending-up', name: 'Inversiones & Fondos', symbol: '📈' },
    { id: 'briefcase', name: 'Negocio & Ventas', symbol: '💼' },
    { id: 'coins', name: 'Ahorro & Monedas', symbol: '🪙' },
    { id: 'tag', name: 'General / Varios', symbol: '🏷️' }
  ];

  // Curated Financial Color Palette
  colorPalette: string[] = [
    '#10b981', // Emerald
    '#38bdf8', // Cyan
    '#6366f1', // Indigo
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#f43f5e', // Rose
    '#f59e0b', // Amber
    '#14b8a6', // Teal
    '#64748b'  // Slate
  ];

  ngOnInit(): void {
    this.loadUserDataAndCategories();
  }

  loadUserDataAndCategories(): void {
    this.loading = true;
    this.authService.getCurrentUser().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.currentUser = res.data;
        }
        this.fetchCategories();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  fetchCategories(): void {
    this.dashboardService.getCategories().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.categories = res.data;
          this.applyFilter();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.toastService.showError('Error', err.error?.message || 'No se pudieron cargar las categorías.');
        this.cdr.detectChanges();
      }
    });
  }

  // Filter tab change
  setTab(tab: 'EXPENSE' | 'INCOME'): void {
    this.activeTab = tab;
    this.applyFilter();
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilter();
  }

  applyFilter(): void {
    const term = (this.searchTerm || '').trim().toLowerCase();
    this.filteredCategories = this.categories.filter(cat => {
      const matchesTab = cat.type === this.activeTab;
      const matchesSearch = !term || (cat.name || '').toLowerCase().includes(term);
      return matchesTab && matchesSearch;
    });
  }

  // Counts for tabs
  get totalExpensesCount(): number {
    return this.categories.filter(c => c.type === 'EXPENSE').length;
  }

  get totalIncomesCount(): number {
    return this.categories.filter(c => c.type === 'INCOME').length;
  }

  // Icon Symbol Helper
  getIconSymbol(iconId: string): string {
    const item = this.iconCatalog.find(i => i.id === iconId);
    return item ? item.symbol : '🏷️';
  }

  // Create / Edit Modal
  openCreateModal(): void {
    this.isEditing = false;
    this.editingCategoryId = null;
    this.catName = '';
    this.catType = this.activeTab;
    this.catIcon = this.activeTab === 'INCOME' ? 'wallet' : 'utensils';
    this.catColor = this.activeTab === 'INCOME' ? '#10b981' : '#38bdf8';
    this.isModalOpen = true;
  }

  openEditModal(category: CategoryItem): void {
    this.isEditing = true;
    this.editingCategoryId = category.id;
    this.catName = category.name;
    this.catType = category.type;
    this.catIcon = category.icon || 'tag';
    this.catColor = category.color || '#38bdf8';
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditing = false;
    this.editingCategoryId = null;
  }

  selectIcon(iconId: string): void {
    this.catIcon = iconId;
  }

  selectColor(color: string): void {
    this.catColor = color;
  }

  saveCategory(): void {
    if (!this.catName || !this.catName.trim()) {
      this.toastService.showWarning('Campo Requerido', 'Ingresa el nombre de la categoría.');
      return;
    }

    this.submittingCategory = true;
    if (this.isEditing && this.editingCategoryId) {
      this.dashboardService.updateCategory(this.editingCategoryId, {
        name: this.catName.trim(),
        icon: this.catIcon,
        color: this.catColor
      }).subscribe({
        next: (res) => {
          this.submittingCategory = false;
          this.toastService.showSuccess('Categoría Actualizada', 'Los cambios se aplicaron exitosamente.');
          this.closeModal();
          this.fetchCategories();
        },
        error: (err) => {
          this.submittingCategory = false;
          this.toastService.showError('Error', err.error?.message || 'No se pudo actualizar la categoría.');
          this.cdr.detectChanges();
        }
      });
    } else {
      this.dashboardService.createCategory({
        name: this.catName.trim(),
        type: this.catType,
        icon: this.catIcon,
        color: this.catColor
      }).subscribe({
        next: (res) => {
          this.submittingCategory = false;
          this.toastService.showSuccess('Categoría Creada', `"${this.catName.trim()}" añadida a tu catálogo.`);
          this.closeModal();
          this.fetchCategories();
        },
        error: (err) => {
          this.submittingCategory = false;
          this.toastService.showError('Error', err.error?.message || 'No se pudo crear la categoría.');
          this.cdr.detectChanges();
        }
      });
    }
  }

  // Delete & Reassignment Flow
  openDeleteModal(category: CategoryItem): void {
    this.categoryToDelete = category;
    this.reassignTargetName = '';
    // Find first other category of same type as default target
    const others = this.getReassignOptions(category);
    if (others.length > 0) {
      this.reassignTargetName = others[0].name;
    }
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.categoryToDelete = null;
    this.reassignTargetName = '';
  }

  getReassignOptions(currentCat: CategoryItem): CategoryItem[] {
    return this.categories.filter(c => c.type === currentCat.type && c.id !== currentCat.id);
  }

  confirmDelete(): void {
    if (!this.categoryToDelete) return;

    if (this.categoryToDelete.transactionCount > 0 && !this.reassignTargetName) {
      this.toastService.showWarning('Reasignación Requerida', 'Elige una categoría de destino para proteger tus transacciones.');
      return;
    }

    this.submittingDelete = true;
    this.dashboardService.deleteCategory(this.categoryToDelete.id, this.reassignTargetName).subscribe({
      next: (res) => {
        this.submittingDelete = false;
        this.toastService.showSuccess('Categoría Eliminada', res.message || 'La categoría fue eliminada con éxito.');
        this.closeDeleteModal();
        this.fetchCategories();
      },
      error: (err) => {
        this.submittingDelete = false;
        this.toastService.showError('Error', err.error?.message || 'No se pudo eliminar la categoría.');
        this.cdr.detectChanges();
      }
    });
  }

  // Sidebar Controls
  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  toggleTxSubmenu(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isTxOpen = !this.isTxOpen;
    this.cdr.detectChanges();
  }

  toggleTransactions(): void {
    this.toggleTxSubmenu();
  }

  logout(): void {
    this.authService.logout();
  }
}
