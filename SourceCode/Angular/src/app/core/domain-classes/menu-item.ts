export interface MenuItem {
  id: string;
  title: string;
  path: string;
  icon: string;
  cssClass: string;
  order: number;
  parentId: string | null;
  isActive: boolean;
  isVisible: boolean;
  children: MenuItem[];
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}
