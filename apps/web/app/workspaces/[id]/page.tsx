'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppShell, Badge, Card, PageSection, useToast } from '@repo/ui'
import { Database, MessageSquareText, Settings, Ticket, Users } from 'lucide-react'
import { logout } from '@/lib/api/auth'
import { isUnauthorized } from '@/lib/api/handle-unauthorized'
import { getWorkspace, listWorkspaces } from '@/lib/api/workspaces'
import { WorkspaceNav } from '@/components/workspace-nav'

type Workspace = {
  id: string
  name: string
}

type WorkspaceMembership = {
  id: string
  role: 'owner' | 'admin' | 'member'
}

const quickLinks = (workspaceId: string) => [
  {
    label: 'Knowledge Bases',
    href: `/workspaces/${workspaceId}/knowledge-bases`,
    description: 'Manage the sources your assistant retrieves from.',
    icon: <Database className="size-5" />,
  },
  {
    label: 'Members',
    href: `/workspaces/${workspaceId}/members`,
    description: 'Invite teammates and manage roster access.',
    icon: <Users className="size-5" />,
  },
  {
    label: 'Chat',
    href: `/workspaces/${workspaceId}/chat`,
    description: 'Ask grounded questions against this workspace.',
    icon: <MessageSquareText className="size-5" />,
  },
  {
    label: 'Tickets',
    href: `/workspaces/${workspaceId}/tickets`,
    description: 'Draft and review tickets from support calls.',
    icon: <Ticket className="size-5" />,
  },
  {
    label: 'Settings',
    href: `/workspaces/${workspaceId}/settings`,
    description: 'Workspace-level configuration.',
    icon: <Settings className="size-5" />,
  },
]

export default function WorkspaceOverviewPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const toastRef = React.useRef(toast)
  const workspaceId = params.id
  const [workspace, setWorkspace] = React.useState<Workspace | null>(null)
  const [membership, setMembership] = React.useState<WorkspaceMembership | null>(null)

  React.useEffect(() => {
    toastRef.current = toast
  }, [toast])

  const loadPage = React.useCallback(async () => {
    try {
      const [workspaceData, memberships] = await Promise.all([getWorkspace(workspaceId), listWorkspaces()])
      setWorkspace(workspaceData)
      const membershipItems = Array.isArray(memberships?.items) ? memberships.items : []
      setMembership(membershipItems.find((entry: WorkspaceMembership) => entry.id === workspaceId) ?? null)
    } catch (err) {
      if (isUnauthorized(err)) {
        router.push('/login')
        return
      }

      toastRef.current({
        variant: 'error',
        title: 'Failed to load workspace',
        description: err instanceof Error ? err.message : 'Try again in a moment.',
      })
    }
  }, [router, workspaceId])

  React.useEffect(() => {
    void loadPage()
  }, [loadPage])

  const handleLogout = React.useCallback(async () => {
    try {
      await logout()
    } finally {
      router.push('/login')
    }
  }, [router])

  return (
    <AppShell
      sidebarHeader={({ collapsed }) => (
        <Link href="/workspaces" className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            {workspace?.name?.[0]?.toUpperCase() ?? 'W'}
          </span>
          {!collapsed ? <span className="truncate">{workspace?.name ?? 'Workspace'}</span> : null}
        </Link>
      )}
      navigation={({ collapsed }) => <WorkspaceNav workspaceId={workspaceId} collapsed={collapsed} />}
      title={workspace?.name ?? 'Workspace'}
      badge={membership ? <Badge variant={membership.role === 'member' ? 'secondary' : 'success'}>{membership.role}</Badge> : null}
      onLogout={handleLogout}
    >
      <div className="mx-auto w-full max-w-5xl space-y-8 px-6 py-10">
        <PageSection eyebrow={<Badge variant="outline">Workspace</Badge>} title="Where to next" description="Jump into any area of this workspace.">
          <div className="grid gap-4 md:grid-cols-2">
            {quickLinks(workspaceId).map((link) => (
              <Link key={link.href} href={link.href}>
                <Card variant="elevated" className="flex items-start gap-4 p-6 transition-colors hover:bg-card/80">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent/20 text-accent-foreground">{link.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold">{link.label}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </PageSection>
      </div>
    </AppShell>
  )
}
