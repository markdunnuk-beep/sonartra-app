import { useEffect, useState } from 'react'

export const ADMIN_SIDEBAR_STORAGE_KEY = 'sonartra.admin.sidebar.collapsed'

export function parseAdminSidebarPreference(value: string | null | undefined): boolean {
  return value === 'true'
}

export function serializeAdminSidebarPreference(collapsed: boolean): string {
  return collapsed ? 'true' : 'false'
}

export function useAdminSidebarPreference() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hasHydrated, setHasHydrated] = useState(false)

  useEffect(() => {
    const storedPreference = window.localStorage.getItem(ADMIN_SIDEBAR_STORAGE_KEY)
    setIsCollapsed(parseAdminSidebarPreference(storedPreference))
    setHasHydrated(true)
  }, [])

  useEffect(() => {
    if (!hasHydrated) {
      return
    }

    window.localStorage.setItem(ADMIN_SIDEBAR_STORAGE_KEY, serializeAdminSidebarPreference(isCollapsed))
  }, [hasHydrated, isCollapsed])

  return {
    hasHydrated,
    isCollapsed,
    setIsCollapsed,
    toggleCollapsed() {
      setIsCollapsed((currentValue) => !currentValue)
    },
  }
}
