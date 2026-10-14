'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, X, Send, Loader2 } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function AiChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Ola! Eu sou a Ana, sua assistente financeira. Posso consultar dados de clientes, receitas, custos, inadimplencia e muito mais. Como posso ajudar?',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: trimmed }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      // Send history without the welcome message
      const history = updatedMessages
        .slice(1)
        .slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Desculpe, ocorreu um erro: ${data.error || 'Erro desconhecido'}`,
          },
        ])
        return
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Desculpe, nao consegui me conectar ao servidor. Tente novamente.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    },
    [sendMessage],
  )

  // Collapsed state: floating button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#F0C239] shadow-lg transition-transform hover:scale-110 hover:shadow-xl"
        aria-label="Abrir assistente financeira"
      >
        <Sparkles size={22} className="text-black" />
      </button>
    )
  }

  // Expanded state: chat window
  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[400px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between bg-black px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0C239]">
            <Sparkles size={16} className="text-black" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Ana</h3>
            <p className="text-[10px] text-gray-400">
              Assistente Financeira
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          aria-label="Fechar assistente"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#F0C239]">
                <Sparkles size={12} className="text-black" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#F0C239] text-gray-900'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <MessageContent content={msg.content} />
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#F0C239]">
              <Sparkles size={12} className="text-black" />
            </div>
            <div className="rounded-2xl bg-gray-100 px-4 py-3">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white px-3 py-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte algo..."
            disabled={isLoading}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-[#F0C239] focus:bg-white disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0C239] text-black transition-all hover:bg-[#d4aa2e] disabled:opacity-40 disabled:hover:bg-[#F0C239]"
            aria-label="Enviar mensagem"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Sub-component for rendering message content with basic formatting ---

function MessageContent({ content }: { content: string }) {
  // Split by double newlines for paragraphs, render bold **text**
  const paragraphs = content.split('\n')
  return (
    <>
      {paragraphs.map((para, i) => {
        if (!para.trim()) return <br key={i} />
        // Bold: **text**
        const parts = para.split(/(\*\*[^*]+\*\*)/)
        return (
          <p key={i} className={i > 0 ? 'mt-1' : ''}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={j} className="font-semibold">
                    {part.slice(2, -2)}
                  </strong>
                )
              }
              return <span key={j}>{part}</span>
            })}
          </p>
        )
      })}
    </>
  )
}
