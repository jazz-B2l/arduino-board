'use client'

import { useState, useRef, useEffect } from 'react'
import { SparklesIcon, SendIcon, LoaderIcon, CodeIcon, MoreVerticalIcon, CheckIcon, CopyIcon, WrenchIcon, BookOpenIcon, ChevronDownIcon } from 'lucide-react'
import { useBench } from '../BenchContext'



interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

interface AIAssistantProps {
  code: string
  onCodeUpdate: (newCode: string) => void
}

export function AIAssistant({ code, onCodeUpdate }: AIAssistantProps) {
  const { boardName, thresholds } = useBench()
  const [provider, setProvider] = useState<'gemini' | 'groq'>('gemini')
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I am your Arduino AI assistant. I have access to your active board and sensor thresholds. Ask me to write or edit your sketch!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

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

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input
    if (!text.trim() || isLoading) return

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMessage: Message = { role: 'user', content: text, timestamp }
    setMessages(prev => [...prev, userMessage])
    if (!textToSend) setInput('')
    setIsLoading(true)

    try {
      const chatHistory = [...messages, userMessage]
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatHistory.map(m => ({ role: m.role, content: m.content })),
          provider,
          boardName,
          thresholds,
          currentCode: code
        })
      })

      const data = await res.json()
      const respTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      if (res.ok && data.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content, timestamp: respTime }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error || 'Failed to get response.'}`, timestamp: respTime }])
      }
    } catch (err: any) {
      const respTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: Could not connect to AI service.`, timestamp: respTime }])
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

    const parts = content.split(/(```(?:cpp|arduino)?[\s\S]*?```)/g);
    
    return (
      <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-slate-300">
        {parts.map((part, idx) => {
          if (part.startsWith('```')) {
            const codeText = part.replace(/```(?:cpp|arduino)?\n?/, '').replace(/```$/, '').trim();
            return (
              <div key={idx} className="flex flex-col rounded-md overflow-hidden bg-[#090d16] border border-slate-800 my-1">
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#0f1422] border-b border-slate-800 text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5"><CodeIcon size={14} /> C++</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => copyToClipboard(codeText)}
                      className="hover:text-slate-200 transition-colors flex items-center gap-1"
                      title="Copy"
                    >
                      {copiedCode === codeText ? <CheckIcon size={14} className="text-emerald-400" /> : <CopyIcon size={14} />}
                      {copiedCode === codeText ? 'Copied' : 'Copy'}
                    </button>
                    <button 
                      onClick={() => {
                        onCodeUpdate(codeText)
                        alert("Code snippet loaded into the editor!")
                      }}
                      className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 font-bold ml-2"
                      title="Insert"
                    >
                      <SparklesIcon size={14} /> Insert
                    </button>
                  </div>
                </div>
                <pre className="p-3 overflow-x-auto text-[13px] font-mono text-slate-200 select-text">
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

  return (
    <div className="flex flex-col h-full bg-[#0d1220]">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60 bg-[#0d1220]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden shadow-sm shadow-purple-900/50 flex items-center justify-center flex-shrink-0">
            {provider === 'gemini' ? (
              <img src="/gemini-logo.png" alt="Gemini" className="w-full h-full object-cover" />
            ) : (
              <img src="/groq-logo.png" alt="Groq" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-slate-200 leading-tight">Arduino Copilot</h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {provider === 'gemini' ? 'Gemini 1.5' : 'Groq 8B'}
            </div>
          </div>
        </div>
        
        {/* Right Actions */}
        <div className="relative flex items-center bg-slate-900/80 hover:bg-slate-800 border border-slate-700/50 rounded-md px-2 py-1 transition-colors cursor-pointer focus-within:border-purple-500/50">
          <select 
            value={provider} 
            onChange={(e) => setProvider(e.target.value as 'gemini' | 'groq')}
            className="bg-transparent text-xs text-slate-300 font-medium outline-none cursor-pointer appearance-none pr-5 z-10 w-full"
          >
            <option value="gemini" className="bg-slate-900">Gemini 1.5</option>
            <option value="groq" className="bg-slate-900">Groq 8B</option>
          </select>
          <ChevronDownIcon size={14} className="text-slate-400 absolute right-2 pointer-events-none" />
        </div>
      </div>

      {/* Quick Actions Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/60 bg-[#0d1220]">
        <button 
          onClick={() => handleSend("Explain the current code in the editor")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
        >
          <BookOpenIcon size={16} /> Explain Code
        </button>
        <button 
          onClick={() => handleSend("Fix any potential errors in the current code")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
        >
          <WrenchIcon size={16} /> Fix Errors
        </button>
      </div>

      {/* Chat Messages Panel */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 select-text bg-[#0a0f18] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user'

          return (
            <div key={index} className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
              {!isUser && (
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-md overflow-hidden flex items-center justify-center shadow-sm flex-shrink-0">
                    {provider === 'gemini' ? (
                      <img src="/gemini-logo.png" alt="Gemini" className="w-full h-full object-cover" />
                    ) : (
                      <img src="/groq-logo.png" alt="Groq" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-400">Copilot</span>
                  {msg.timestamp && <span className="text-[10px] text-slate-600 ml-1">{msg.timestamp}</span>}
                </div>
              )}
              
              <div 
                className={`max-w-[90%] ${isUser ? 'bg-indigo-600/15 text-indigo-100 rounded-2xl rounded-tr-sm px-4 py-3 border border-indigo-500/20 shadow-sm' : 'text-slate-300 w-full'}`}
              >
                {renderContent(msg.content, isUser)}
              </div>

              {isUser && msg.timestamp && (
                <span className="text-[10px] text-slate-600 mt-1">{msg.timestamp}</span>
              )}
            </div>
          )
        })}
        
        {isLoading && (
          <div className="flex flex-col gap-1.5 items-start">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-md overflow-hidden flex items-center justify-center shadow-sm flex-shrink-0">
                {provider === 'gemini' ? (
                  <img src="/gemini-logo.png" alt="Gemini" className="w-full h-full object-cover" />
                ) : (
                  <img src="/groq-logo.png" alt="Groq" className="w-full h-full object-cover" />
                )}
              </div>
              <span className="text-xs font-medium text-slate-400">Copilot</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-sm px-2">
              <LoaderIcon size={16} className="animate-spin" /> Thinking...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Panel */}
      <div className="p-4 border-t border-slate-800/80 bg-[#0d1220]">
        <div className="relative">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-end gap-3 bg-[#121826] rounded-xl border border-slate-700/50 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20 transition-all px-4 py-3"
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
              placeholder="Ask Copilot anything..."
              rows={1}
              className="flex-1 bg-transparent border-none outline-none text-[15px] text-slate-200 placeholder-slate-500 py-1 resize-none max-h-40 min-h-[28px] overflow-y-auto"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed mb-0.5 flex-shrink-0"
            >
              <SendIcon size={16} className="ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

