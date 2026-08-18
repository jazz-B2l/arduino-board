'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/bench/AppShell'
import { Programmation } from '@/components/bench/pages/Programmation'

export default function ProgrammationPage() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeConvId = localStorage.getItem('bench_active_conversation_id')
      if (activeConvId) {
        router.replace(`/programmation/${activeConvId}`)
      } else {
        setIsRedirecting(false)
      }
    }
  }, [router])

  if (isRedirecting) {
    return (
      <AppShell>
        <div className="flex-1 bg-bench-bg" />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Programmation />
    </AppShell>
  )
}
