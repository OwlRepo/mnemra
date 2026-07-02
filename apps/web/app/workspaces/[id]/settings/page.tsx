'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppShell, Badge, EmptyState, PageSection, useToast } from '@repo/ui'
import { Settings } from 'lucide-react'
import { logout } from '@/lib/api/auth'
import { isUnauthorized } from '@/lib/api/handle-unauthorized'
import { getWorkspace } from '@/lib/api/workspaces'
import { WorkspaceNav } from '@/components/workspace-nav'

type Workspace = { id: string; name: string }

export default function SettingsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const workspaceId = params.id
  const [workspace, setWorkspace] = React.useState<Workspace | null>(null)

  React.useEffect(() => {
    const loadPage = async () => {
      try {
        setWorkspace(await getWorkspace(workspaceId))
      } catch (err) {
        if (isUnauthorized(err)) {
          router.push('/login')
          return
        }
        toast({
          variant: 'error',
          title: 'Failed to load workspace',
          description: err instanceof Error ? err.message : 'Try again in a moment.',
        })
      }
    }
    void loadPage()
  }, [router, toast, workspaceId])

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
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">{workspace?.name?.[0]?.toUpperCase() ?? 'W'}</span>
          {!collapsed ? <span className="truncate">{workspace?.name ?? 'Workspace'}</span> : null}
        </Link>
      )}
      navigation={({ collapsed }) => <WorkspaceNav workspaceId={workspaceId} collapsed={collapsed} />}
      title="Settings"
      description="Workspace-level configuration."
      onLogout={handleLogout}
    >
      <div className="mx-auto w-full max-w-3xl space-y-8 px-6 py-10">
        <PageSection eyebrow={<Badge variant="outline">Workspace</Badge>} title={workspace?.name ?? 'Workspace'} description={`Workspace ID: ${workspaceId}`}>
          <EmptyState icon={<Settings className="size-5" />} title="More settings coming soon" description="Workspace name changes, danger-zone actions, and integrations will land here." />
        </PageSection>
      </div>
    </AppShell>
  )
}
