'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  SparklesIcon, 
  SendIcon, 
  LoaderIcon, 
  CodeIcon, 
  CheckIcon, 
  CopyIcon, 
  WrenchIcon, 
  ChevronDownIcon, 
  Trash2Icon, 
  MenuIcon, 
  X as XIcon, 
  Plus as PlusIcon, 
  MessageSquare as MessageSquareIcon, 
  Edit2 as Edit2Icon, 
  AlertTriangle as AlertTriangleIcon, 
  Cpu as CpuIcon,
  BookOpenIcon,
  ZapIcon
} from 'lucide-react'
import { useBench } from '../BenchContext'
import { useAuth } from '@/components/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '../LanguageContext'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  provider?: 'gemini' | 'groq'
}

interface Conversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

interface AIAssistantProps {
  code: string
  onCodeUpdate: (newCode: string, instant?: boolean) => void
  initialConversationId?: string
}

const DEFAULT_MESSAGE: Omit<Message, 'timestamp'> = {
  role: 'assistant',
  content: "HELLO_SENTINEL",
  provider: 'gemini'
}

const SUGGESTIONS = [
  { label: "Generate Arduino code", prompt: "Write an Arduino C++ sketch to blink an LED on pin 13 when a button is pressed on pin 2.", icon: <FileCode2IconWrapper /> },
  { label: "Debug a sensor", prompt: "Help me debug an ultrasonic HC-SR04 sensor that is returning constant zero readings over serial.", icon: <WrenchIcon size={14} className="text-emerald-500" /> },
  { label: "Explain an error", prompt: "Explain the compiler error: 'Compilation error: 'BUTTON_PIN' was not declared in this scope'.", icon: <AlertTriangleIcon size={14} className="text-amber-500" /> },
  { label: "Optimize your code", prompt: "Optimize this telemetry loop to send data faster and reduce global variable memory usage.", icon: <CpuIcon size={14} className="text-purple-500" /> }
]

function FileCode2IconWrapper() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
      <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
      <path d="m10 13-2 2 2 2"/>
      <path d="m14 17 2-2-2-2"/>
    </svg>
  )
}

function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 p-2 animate-pulse">
      <div className="h-6 bg-bench-subtle rounded w-full" />
      <div className="h-6 bg-bench-subtle rounded w-5/6" />
      <div className="h-6 bg-bench-subtle rounded w-3/4" />
      <div className="h-6 bg-bench-subtle rounded w-4/5" />
    </div>
  )
}

function MessagesSkeleton() {
  return (
    <div className="space-y-5 animate-pulse p-2">
      <div className="flex gap-2">
        <div className="w-8 h-8 rounded bg-bench-subtle shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-3.5 bg-bench-subtle rounded w-1/4" />
          <div className="h-3 bg-bench-subtle rounded w-5/6" />
          <div className="h-3 bg-bench-subtle rounded w-2/3" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <div className="space-y-2 flex-1 flex flex-col items-end">
          <div className="h-3 bg-bench-subtle rounded w-3/4" />
          <div className="h-3 bg-bench-subtle rounded w-1/2" />
        </div>
        <div className="w-8 h-8 rounded bg-bench-subtle shrink-0" />
      </div>
    </div>
  )
}

// Deterministic title generator for the first prompt
function generateTitle(message: string, defaultTitle: string): string {
  let text = message.trim().split('\n')[0].split(/[.!?]/)[0]
  const prefixes = [
    /^(please\s+)?write\s+(a\s+)?/i,
    /^(please\s+)?create\s+(a\s+)?/i,
    /^how\s+do\s+i\s+/i,
    /^how\s+to\s+/i,
    /^i\s+want\s+to\s+/i,
    /^can\s+you\s+help\s+me\s+with\s+/i,
    /^can\s+you\s+/i,
    /^help\s+me\s+/i,
  ]
  for (const prefix of prefixes) {
    text = text.replace(prefix, '')
  }
  text = text.replace(/[^\w\s\u00C0-\u017F-]/g, '').trim()
  if (text.length > 30) {
    text = text.substring(0, 27) + '...'
  }
  if (text) {
    text = text.charAt(0).toUpperCase() + text.slice(1)
  }
  return text || defaultTitle;
}

export function AIAssistant({ code, onCodeUpdate, initialConversationId }: AIAssistantProps) {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const { 
    boardName, 
    thresholds,
    cachedConversations,
    setCachedConversations,
    cachedMessages,
    setCachedMessages
  } = useBench()
  const { user, loading } = useAuth()

  const [provider, setProvider] = useState<'gemini' | 'groq'>('gemini')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // UI states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [chatsLoading, setChatsLoading] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameTitle, setRenameTitle] = useState('')

  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-grow textarea height as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  // 1. Fetch conversations list
  const fetchConversations = async (background = false) => {
    if (!user) return
    if (!background) setChatsLoading(true)
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false })
      
      if (error) throw error
      const convs = data || []
      setConversations(convs)
      setCachedConversations(convs)
    } catch (e: any) {
      console.error('Error fetching conversations:', e.message)
    } finally {
      if (!background) setChatsLoading(false)
    }
  }

  // 2. Fetch messages for active conversation
  const fetchMessages = async (convId: string, background = false) => {
    if (!user) return
    if (!background) setMessagesLoading(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
      
      if (error) throw error

      const mapped = (data || []).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: m.metadata?.provider || 'gemini'
      }))

      const finalMessages = mapped.length > 0 ? mapped : [{ ...DEFAULT_MESSAGE, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]
      setMessages(finalMessages)
      setCachedMessages(convId, finalMessages)
    } catch (e: any) {
      console.error('Error fetching messages:', e.message)
      setToast({ message: 'Failed to load message history.', type: 'error' })
    } finally {
      if (!background) setMessagesLoading(false)
    }
  }

  // Trigger loading list when user state updates
  useEffect(() => {
    if (!loading && user) {
      if (cachedConversations.length > 0) {
        setConversations(cachedConversations)
        fetchConversations(true)
      } else {
        fetchConversations(false)
      }
    }
  }, [user, loading, cachedConversations])

  // Trigger loading chat details when ID in dynamic route changes
  useEffect(() => {
    if (initialConversationId) {
      const cached = cachedMessages[initialConversationId]
      if (cached) {
        setMessages(cached)
        setMessagesLoading(false)
        fetchMessages(initialConversationId, true)
      } else {
        fetchMessages(initialConversationId, false)
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('bench_active_conversation_id', initialConversationId)
      }
    } else {
      setMessages([{ ...DEFAULT_MESSAGE, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
    }
  }, [initialConversationId, user])

  // Rename a conversation title
  const handleRenameConfirm = async (id: string) => {
    if (!renameTitle.trim()) {
      setRenamingId(null)
      return
    }
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ title: renameTitle.trim(), updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      setConversations(prev =>
        prev.map(c => (c.id === id ? { ...c, title: renameTitle.trim() } : c))
      )
      setToast({ message: t('chat.toast.renamed'), type: 'success' })
    } catch (e: any) {
      console.error('Error renaming:', e.message)
      setToast({ message: t('chat.toast.renameFailed'), type: 'error' })
    } finally {
      setRenamingId(null)
    }
  }

  // Delete a conversation
  const handleDeleteConfirm = async (id: string) => {
    if (!confirm(t('chat.confirmDelete'))) return

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)

      if (error) throw error

      setConversations(prev => prev.filter(c => c.id !== id))
      setToast({ message: t('chat.toast.deleted'), type: 'info' })

      if (initialConversationId === id) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('bench_active_conversation_id')
        }
        router.push('/programmation')
      }
    } catch (e: any) {
      console.error('Error deleting:', e.message)
      setToast({ message: t('chat.toast.deleteFailed'), type: 'error' })
    }
  }

  // Send message flow
  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input
    if (!text.trim() || isLoading || !user) return

    setIsLoading(true)
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMessage: Message = { role: 'user', content: text, timestamp }
    
    // Add user message to UI immediately
    setMessages(prev => {
      const next = prev.filter(m => m.content !== DEFAULT_MESSAGE.content)
      return [...next, userMessage]
    })
    if (initialConversationId) {
      setCachedMessages(initialConversationId, [
        ...messages.filter(m => m.content !== DEFAULT_MESSAGE.content),
        userMessage
      ])
    }
    if (!textToSend) setInput('')

    let activeConvId = initialConversationId
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error(t('chat.authError'))
      }

      // Step 1: Create conversation if we are in "New Chat" mode
      if (!activeConvId) {
        const generatedTitle = generateTitle(text, t('chat.newChat'))
        const { data: newConv, error: convErr } = await supabase
          .from('conversations')
          .insert({ title: generatedTitle, user_id: user.id })
          .select()
          .single()

        if (convErr) throw convErr
        activeConvId = newConv.id

        // Force adding conversation to local list
        setConversations(prev => [newConv, ...prev])
      }

      // Step 2: Save user's message
      const { error: msgErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConvId,
          role: 'user',
          content: text
        })

      if (msgErr) throw msgErr

      // Step 3: Call AI endpoint with history
      // We pull current history inside the database context
      const chatHistory = [...messages.filter(m => m.content !== DEFAULT_MESSAGE.content), userMessage]

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chatHistory: chatHistory.map(h => ({ role: h.role, content: h.content })),
          provider,
          boardName,
          thresholds,
          currentCode: code,
          lang
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || t('chat.toast.loadFailed'))
      }

      const aiContent = data.content
      
      // Step 4: Save AI response
      const { error: aiMsgErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConvId,
          role: 'assistant',
          content: aiContent,
          metadata: { provider }
        })

      if (aiMsgErr) throw aiMsgErr

      // Step 5: Update conversation updated_at trigger
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeConvId)

      // Step 6: Render response in UI
      const finalAssistantMessage: Message = { role: 'assistant', content: aiContent, timestamp, provider }
      setMessages(prev => {
        const next = [...prev, finalAssistantMessage]
        if (initialConversationId) {
          setCachedMessages(initialConversationId, next)
        }
        return next
      })
      
      // Refresh list to pull updated_at ordering
      fetchConversations(true)

      // Step 7: Redirect to unique chat URL if it was a new chat
      if (!initialConversationId) {
        setCachedMessages(activeConvId, [...messages.filter(m => m.content !== DEFAULT_MESSAGE.content), userMessage, finalAssistantMessage])
        router.push(`/programmation/${activeConvId}`)
      }
    } catch (err: any) {
      console.error('Error sending message:', err.message)
      setToast({ message: err.message || 'Error occurred.', type: 'error' })
      const errorMsg: Message = { role: 'assistant', content: `Error: ${err.message || 'Could not save or call AI service.'}`, timestamp, provider }
      setMessages(prev => {
        const next = [...prev, errorMsg]
        if (initialConversationId) {
          setCachedMessages(initialConversationId, next)
        }
        return next
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const renderContent = (content: string, isUser: boolean) => {
    if (isUser) {
      return <div className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{content}</div>
    }

    const parts = content.split(/(```[a-zA-Z0-9+#-]*[\s\S]*?```)/g);
    
    return (
      <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-bench-text w-full min-w-0">
        {parts.map((part, idx) => {
          if (part.startsWith('```')) {
            const codeText = part.replace(/```[a-zA-Z0-9+#-]*\n?/, '').replace(/```$/, '').trim();
            return (
              <div key={idx} className="flex flex-col rounded-md overflow-hidden bg-bench-bg border border-bench-border my-1 shadow-inner w-full min-w-0">
                <div className="flex items-center justify-between px-3 py-1.5 bg-bench-header-bg border-b border-bench-border text-xs font-mono text-bench-muted">
                  <span className="flex items-center gap-1.5"><CodeIcon size={14} /> C++</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => copyToClipboard(codeText)}
                      className="hover:text-bench-text transition-colors flex items-center gap-1 cursor-pointer"
                      title={t('chat.copy')}
                    >
                      {copiedCode === codeText ? <CheckIcon size={14} className="text-emerald-500" /> : <CopyIcon size={14} />}
                      {copiedCode === codeText ? t('chat.copied') : t('chat.copy')}
                    </button>
                    <button 
                      onClick={() => {
                        onCodeUpdate(codeText, true)
                        setToast({ message: t('chat.toast.codeLoaded'), type: "success" })
                      }}
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-500 transition-colors flex items-center gap-1 font-bold ml-2 cursor-pointer"
                      title={t('chat.insert')}
                    >
                      <SparklesIcon size={14} /> {t('chat.insert')}
                    </button>
                  </div>
                </div>
                <pre className="p-3 overflow-x-auto text-[13px] font-mono text-bench-text select-text bg-bench-bg">
                  <code>{codeText}</code>
                </pre>
              </div>
            )
          }
          if (part.trim()) {
            return <div key={idx} className="break-words whitespace-pre-wrap">{part}</div>
          }
          return null
        })}
      </div>
    )
  }

  const activeChatTitle = conversations.find(c => c.id === initialConversationId)?.title || t('chat.newChat')

  return (
    <div className="flex flex-col h-full bg-bench-surface relative">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`absolute top-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded shadow-lg text-xs font-semibold z-50 animate-fade-in ${
          toast.type === 'error' ? 'bg-red-500 text-white' : toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Sidebar Drawer Backdrop */}
      {isSidebarOpen && (
        <div 
          className="absolute inset-0 bg-black/50 z-30 transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar Drawer Panel */}
      <div 
        className={`absolute top-0 bottom-0 start-0 w-[245px] bg-bench-header-bg border-e border-bench-border z-40 flex flex-col transition-transform duration-300 transform select-none ${
          isSidebarOpen ? 'translate-x-0' : (lang === 'ar' ? 'translate-x-full' : '-translate-x-full')
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-bench-border bg-bench-surface">
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-bench-text">{t('chat.title')}</span>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 rounded hover:bg-bench-subtle text-bench-muted hover:text-bench-text transition-colors cursor-pointer"
          >
            <XIcon size={14} />
          </button>
        </div>

        <div className="p-3 border-b border-bench-border">
          <button
            onClick={() => {
              setIsSidebarOpen(false)
              if (typeof window !== 'undefined') {
                localStorage.removeItem('bench_active_conversation_id')
              }
              router.push('/programmation')
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-bench-border hover:border-blue-500/50 bg-bench-surface hover:bg-bench-subtle text-xs font-mono font-bold text-bench-text transition-all cursor-pointer"
          >
            <PlusIcon size={14} /> {t('chat.newChat')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
          <span className="text-[9px] font-mono tracking-wider text-bench-muted/60 uppercase block px-2 mb-1">{t('chat.recentChats')}</span>
          {chatsLoading ? (
            <SidebarSkeleton />
          ) : conversations.length === 0 ? (
            <div className="text-[10px] text-bench-muted/80 text-center py-6 font-mono">{t('chat.noRecentChats')}</div>
          ) : (
            conversations.map(chat => {
              const isActive = initialConversationId === chat.id
              const isRenaming = renamingId === chat.id
              
              return (
                <div 
                  key={chat.id}
                  className={`group relative flex items-center justify-between rounded-lg px-2.5 py-2 transition-all text-xs font-mono border ${
                    isActive 
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 font-semibold' 
                      : 'border-transparent hover:bg-bench-subtle text-bench-muted hover:text-bench-text'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquareIcon size={13} className="shrink-0 text-bench-muted/80" />
                    {isRenaming ? (
                      <input
                        value={renameTitle}
                        onChange={(e) => setRenameTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameConfirm(chat.id)
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        onBlur={() => handleRenameConfirm(chat.id)}
                        className="bg-bench-input-bg border border-blue-500 rounded px-1.5 py-0.5 text-xs text-bench-text w-full focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span 
                        onClick={() => {
                          setIsSidebarOpen(false)
                          router.push(`/programmation/${chat.id}`)
                        }}
                        className="truncate cursor-pointer select-none"
                        title={chat.title}
                      >
                        {chat.title}
                      </span>
                    )}
                  </div>

                  {!isRenaming && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 ml-1 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setRenamingId(chat.id)
                          setRenameTitle(chat.title)
                        }}
                        className="p-0.5 rounded hover:bg-bench-bg hover:text-blue-500 text-bench-muted/60 transition-colors cursor-pointer"
                        title={t('chat.rename')}
                      >
                        <Edit2Icon size={11} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteConfirm(chat.id)
                        }}
                        className="p-0.5 rounded hover:bg-bench-bg hover:text-red-500 text-bench-muted/60 transition-colors cursor-pointer"
                        title={t('chat.delete')}
                      >
                        <Trash2Icon size={11} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Main Chat Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-bench-border bg-bench-header-bg select-none">
        <div className="flex items-center gap-2 min-w-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 rounded-md text-bench-muted hover:text-bench-text hover:bg-bench-subtle transition-colors cursor-pointer mr-1 shrink-0"
            title={t('chat.historyTitle')}
          >
            <MenuIcon size={16} />
          </button>
          
          <div className="flex flex-col min-w-0">
            <h2 className="text-xs font-semibold text-bench-text leading-tight truncate" title={activeChatTitle}>
              {activeChatTitle}
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] text-bench-muted font-mono mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {provider === 'gemini' ? 'Gemini 2.5' : 'GPT-OSS 20B'}
            </div>
          </div>
        </div>
        
        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex items-center bg-bench-bg hover:bg-bench-subtle border border-bench-border rounded-md px-2 py-1 transition-colors cursor-pointer focus-within:border-purple-500/50">
            <select 
              value={provider} 
              onChange={(e) => setProvider(e.target.value as 'gemini' | 'groq')}
              className="bg-transparent text-xs text-bench-text font-medium outline-none cursor-pointer appearance-none pr-5 z-10 w-full"
            >
              <option value="gemini" className="bg-bench-surface text-bench-text">Gemini 2.5</option>
              <option value="groq" className="bg-bench-surface text-bench-text">GPT-OSS 20B</option>
            </select>
            <ChevronDownIcon size={14} className="text-bench-muted absolute right-2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Prompts Quick Actions Sub-header Bar */}
      <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-bench-border bg-bench-surface select-none overflow-x-auto scrollbar-none shrink-0">
        <span className="text-[10px] text-bench-muted font-mono mr-1 uppercase tracking-wider shrink-0">{t('chat.quickAsk')}</span>
        
        <button
          onClick={() => handleSend(lang === 'ar' ? ("يرجى شرح ما يفعله كود أردوينو هذا ووصف وظائف الكتل الرئيسية:\n\n" + code) : ("Please explain what this Arduino code does and describe the main block functionalities:\n\n" + code))}
          disabled={isLoading || !code.trim()}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md border text-[10px] font-mono font-medium transition-all cursor-pointer bg-blue-50/50 hover:bg-blue-50 text-blue-600 border-blue-200/60 hover:border-blue-300 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-500/20 dark:hover:border-blue-500/35 hover:dark:bg-blue-950/30 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          title={t('chat.explainCode')}
        >
          <BookOpenIcon size={12} /> {t('chat.explainCode')}
        </button>

        <button
          onClick={() => handleSend(lang === 'ar' ? ("تحقق من كود أردوينو هذا للبحث عن أي أخطاء ترجمة أو مشاكل منطقية وإصلاحها:\n\n" + code) : ("Check this Arduino code for any compile errors, bugs, or logic issues and fix them:\n\n" + code))}
          disabled={isLoading || !code.trim()}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md border text-[10px] font-mono font-medium transition-all cursor-pointer bg-red-50/50 hover:bg-red-50 text-red-600 border-red-200/60 hover:border-red-300 dark:bg-red-950/20 dark:text-red-400 dark:border-red-500/20 dark:hover:border-red-500/35 hover:dark:bg-red-950/30 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          title={t('chat.fixErrors')}
        >
          <WrenchIcon size={12} /> {t('chat.fixErrors')}
        </button>

        <button
          onClick={() => handleSend(lang === 'ar' ? ("قم بتحسين أداء كود أردوينو هذا وتقليل استهلاك الذاكرة:\n\n" + code) : ("Optimize the performance and memory usage of this Arduino code:\n\n" + code))}
          disabled={isLoading || !code.trim()}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md border text-[10px] font-mono font-medium transition-all cursor-pointer bg-emerald-50/50 hover:bg-emerald-50 text-emerald-600 border-emerald-200/60 hover:border-emerald-300 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-500/20 dark:hover:border-emerald-500/35 hover:dark:bg-emerald-950/30 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          title={t('chat.optimizeCode')}
        >
          <ZapIcon size={12} /> {t('chat.optimizeCode')}
        </button>
      </div>

      {/* Chat Messages Panel */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 select-text bg-bench-surface scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {messagesLoading ? (
          <MessagesSkeleton />
        ) : messages.length === 1 && messages[0].content === DEFAULT_MESSAGE.content && !initialConversationId ? (
          /* Empty/Initial state with Suggestions */
          <div className="h-full flex flex-col justify-center items-center py-6 px-2 select-none">
            <div className="text-center max-w-sm mb-8">
              <h3 className="text-sm font-bold text-bench-text mb-1">{t('chat.welcomeTitle')}</h3>
              <p className="text-[11px] text-bench-muted">{t('chat.welcomeDesc')}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
              {[
                { label: t('chat.sug.generate'), prompt: t('chat.sug.prompt.generate'), icon: SUGGESTIONS[0].icon },
                { label: t('chat.sug.debug'), prompt: t('chat.sug.prompt.debug'), icon: SUGGESTIONS[1].icon },
                { label: t('chat.sug.explain'), prompt: t('chat.sug.prompt.explain'), icon: SUGGESTIONS[2].icon },
                { label: t('chat.sug.optimize'), prompt: t('chat.sug.prompt.optimize'), icon: SUGGESTIONS[3].icon }
              ].map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(sug.prompt)}
                  className="flex flex-col items-start gap-2 p-3 text-left rounded-xl border border-bench-border bg-bench-bg hover:bg-bench-subtle hover:border-blue-500/35 hover:shadow-[0_0_12px_rgba(59,130,246,0.05)] transition-all cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-bench-surface border border-bench-border">
                    {sug.icon}
                  </div>
                  <span className="text-[11px] font-semibold text-bench-text">{sug.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Normal Message List rendering */
          messages.map((msg, index) => {
            const isUser = msg.role === 'user'

            return (
              <div key={index} className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
                {!isUser && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-md overflow-hidden flex items-center justify-center bg-bench-header-bg border border-bench-border flex-shrink-0">
                      {msg.provider === 'groq' ? (
                        <img src="/groq-logo.png" alt="GPT-OSS 20B" className="w-full h-full object-cover" />
                      ) : (
                        <img src="/gemini-logo.png" alt="Gemini" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-bench-muted font-mono">{t('chat.copilot')}</span>
                    {msg.timestamp && <span className="text-[9px] text-bench-muted/60 font-mono ml-1">{msg.timestamp}</span>}
                  </div>
                )}
                
                <div 
                  className={`max-w-[95%] w-full min-w-0 ${isUser ? 'max-w-[90%] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 rounded-2xl rounded-tr-sm px-4 py-3 border border-indigo-200 dark:border-indigo-500/20 shadow-sm' : 'text-bench-text'}`}
                >
                  {renderContent(msg.content === 'HELLO_SENTINEL' ? t('chat.defaultWelcome') : msg.content, isUser)}
                </div>

                {isUser && msg.timestamp && (
                  <span className="text-[9px] text-bench-muted/60 font-mono mt-1 pr-1">{msg.timestamp}</span>
                )}
              </div>
            )
          })
        )}
        
        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-md overflow-hidden flex items-center justify-center bg-bench-header-bg border border-bench-border shrink-0">
              {provider === 'groq' ? (
                <img src="/groq-logo.png" alt="Groq" className="w-full h-full object-cover" />
              ) : (
                <img src="/gemini-logo.png" alt="Gemini" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="bg-bench-bg border border-bench-border rounded-xl px-4 py-3 text-bench-muted flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-bench-muted rounded-full animate-bounce delay-0" />
              <span className="w-1.5 h-1.5 bg-bench-muted rounded-full animate-bounce delay-150" />
              <span className="w-1.5 h-1.5 bg-bench-muted rounded-full animate-bounce delay-300" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Panel */}
      <div className="p-4 border-t border-bench-border bg-bench-header-bg">
        <div className="relative">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-end gap-3 bg-bench-input-bg rounded-xl border border-bench-border focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20 transition-all px-4 py-3"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              disabled={isLoading}
              placeholder={isLoading ? t('chat.loading') : t('chat.placeholder')}
              rows={1}
              className="flex-1 bg-transparent border-none outline-none text-[15px] text-bench-text placeholder-bench-muted/60 py-1 resize-none max-h-40 min-h-[28px] overflow-y-auto"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed mb-0.5 flex-shrink-0 cursor-pointer"
            >
              {isLoading ? (
                <LoaderIcon size={16} className="animate-spin" />
              ) : (
                <SendIcon size={16} className="ml-0.5" />
              )}
            </button>
          </form>
        </div>
      </div>

    </div>
  )
}
