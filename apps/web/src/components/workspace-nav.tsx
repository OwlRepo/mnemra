'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@repo/ui'
import { BriefcaseBusiness, Database, MessageSquareText, Settings, Ticket, Users } from 'lucide-react'

export function workspaceNavItems(workspaceId: string) {
  return [
    { label: 'Overview', href: `/workspaces/${workspaceId}`, icon: <BriefcaseBusiness className="size-4" />, exact: true },
    { label: 'Knowledge Bases', href: `/workspaces/${workspaceId}/knowledge-bases`, icon: <Database className="size-4" /> },
    { label: 'Members', href: `/workspaces/${workspaceId}/members`, icon: <Users className="size-4" /> },
    { label: 'Chat', href: `/workspaces/${workspaceId}/chat`, icon: <MessageSquareText className="size-4" /> },
    { label: 'Tickets', href: `/workspaces/${workspaceId}/tickets`, icon: <Ticket className="size-4" /> },
    { label: 'Settings', href: `/workspaces/${workspaceId}/settings`, icon: <Settings className="size-4" /> },
  ]
}

export function WorkspaceNav({ workspaceId, collapsed }: { workspaceId: string; collapsed: boolean }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {workspaceNavItems(workspaceId).map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname === item.href || pathname?.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-card text-foreground' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
            )}
          >
            {item.icon}
            <span className={collapsed ? 'sr-only' : undefined}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
