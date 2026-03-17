import { Building2, ClipboardCheck, LayoutDashboard, Lock, Settings, UserSquare2 } from 'lucide-react';

export interface SidebarLink {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  startsWith?: string;
  locked?: boolean;
  badge?: string;
}

export function getSidebarLinks(hasCompletedAssessment: boolean): SidebarLink[] {
  const links: SidebarLink[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/assessment', label: 'Assessment', icon: ClipboardCheck },
  ];

  if (hasCompletedAssessment) {
    links.push({ href: '/results/individual', label: 'Individual Results', icon: UserSquare2, startsWith: '/results/individual' });
  }

  links.push({ href: '/organisation', label: 'Organisation', icon: Building2, startsWith: '/organisation', locked: true, badge: 'Premium' });
  links.push({ href: '/settings', label: 'Settings', icon: Settings });

  return links;
}

export const LockedNavIcon = Lock;
