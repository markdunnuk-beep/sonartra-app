import { Building2, ClipboardCheck, LayoutDashboard, Lock, Settings, Shield, UserSquare2 } from 'lucide-react';

export interface SidebarLink {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  startsWith?: string;
  locked?: boolean;
  badge?: string;
}

export function getSidebarLinks(hasCompletedAssessment: boolean, adminHref?: string | null): SidebarLink[] {
  const links: SidebarLink[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/individual/assessments', label: 'Assessments', icon: ClipboardCheck, startsWith: '/individual/assessments' },
    { href: '/individual/results', label: 'Results', icon: UserSquare2, startsWith: '/individual/results' },
  ];

  if (adminHref) {
    links.push({ href: adminHref, label: 'Admin', icon: Shield, startsWith: adminHref });
  }

  links.push({ href: '/organisation', label: 'Organisation', icon: Building2, startsWith: '/organisation', locked: true, badge: 'Premium' });
  links.push({ href: '/settings', label: 'Settings', icon: Settings });

  return links;
}

export const LockedNavIcon = Lock;
