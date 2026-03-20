import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { sendChat } from '../api/client'

const SUGGESTIONS = [
  'What are my top 5 losers and do they still have a strong thesis?',
  'Which positions have the best analyst ratings across all three sources?',
  'What are my biggest positions by market value?',
  'Which stocks have dropped the most today?',
  'Summarize the recent news across all my positions',
  'Which positions should I consider trimming based on their thesis?',
]

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const submit = async (text) => {
    const message = (text || input).trim()
    if (!message || loading) return

    const userMsg = { role: 'user', content: message }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      // Send only role+content to backend (not display metadata)
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const res = await sendChat(message, history)
      setMessages([...newMessages, { role: 'assistant', content: res.data.reply }])
    } catch {
      setMessages([...newMessages, {
        role: 'assistant',
        content: '⚠️ Something went wrong. Please try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-white">Portfolio Chat</h1>
        <p className="text-slate-400 text-sm mt-1">
          Ask anything about your positions, thesis, news, or performance.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="text-slate-500 text-sm">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="px-3 py-2 text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:border-indigo-500 hover:text-white transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 border border-slate-700 text-slate-200'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 mt-4">
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-slate-600 hover:text-slate-400 mb-2 block"
          >
            Clear conversation
          </button>
        )}
        <div className="flex gap-2 items-end bg-slate-800 border border-slate-700 rounded-xl p-3 focus-within:border-indigo-500 transition-colors">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your portfolio... (⌘+Enter to send)"
            className="flex-1 bg-transparent text-white text-sm resize-none focus:outline-none placeholder-slate-500"
          />
          <button
            onClick={() => submit()}
            disabled={!input.trim() || loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
