'use client'

import { AppShell } from '@/components/bench/AppShell'
import { Programmation } from '@/components/bench/pages/Programmation'
import { useParams } from 'next/navigation'

export default function ProgrammationChatPage() {
  const params = useParams()
  const conversationId = params?.conversationId as string

  return (
    <AppShell>
      <Programmation initialConversationId={conversationId} />
    </AppShell>
  )
}
