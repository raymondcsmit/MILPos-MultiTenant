// Sidebar route metadata
export interface MenuInfo {
    path: string;
    title: string;
    icon: string;
    class: string;
    submenu: MenuInfo[];
    hasClaims?: string[];
  }
  