import { NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId') || 'default'
    const userId = searchParams.get('userId')

    let messages
    if (userId) {
      const stmt = db.prepare('SELECT role, content, timestamp, provider FROM messages WHERE user_id = ? ORDER BY id ASC')
      messages = stmt.all(userId)
    } else {
      const stmt = db.prepare('SELECT role, content, timestamp, provider FROM messages WHERE session_id = ? ORDER BY id ASC')
      messages = stmt.all(sessionId)
    }

    return NextResponse.json({ messages })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId') || 'default'
    const userId = searchParams.get('userId')

    if (userId) {
      const stmt = db.prepare('DELETE FROM messages WHERE user_id = ?')
      stmt.run(userId)
    } else {
      const stmt = db.prepare('DELETE FROM messages WHERE session_id = ?')
      stmt.run(sessionId)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { message, provider, boardName, thresholds, currentCode, sessionId = 'default', userId } = await req.json()

    if (!message || typeof message !== 'object') {
      // For backwards compatibility, if they pass the old format
      if (message === undefined && (req as any).body?.messages) {
         return NextResponse.json({ error: 'Please update your client to send a single message object.' }, { status: 400 })
      }
    }

    const { role: userRole, content: userContent, timestamp: userTimestamp } = message
    const MAX_MESSAGES_PER_USER = 100

    // Prune oldest messages if the user reaches the history limit
    if (userId) {
      const pruneStmt = db.prepare(`
        DELETE FROM messages 
        WHERE user_id = ? 
          AND id NOT IN (
            SELECT id FROM messages 
            WHERE user_id = ? 
            ORDER BY id DESC 
            LIMIT ?
          )
      `)
      // Keep only top 99 messages so adding the user message makes exactly 100
      pruneStmt.run(userId, userId, MAX_MESSAGES_PER_USER - 1)
    }

    // Save user message to database
    const insertStmt = db.prepare('INSERT INTO messages (session_id, user_id, role, content, timestamp, provider) VALUES (?, ?, ?, ?, ?, ?)')
    insertStmt.run(sessionId, userId || null, userRole, userContent, userTimestamp, null)

    // Fetch the full history to provide context to the AI
    let chatHistory: {role: string, content: string}[]
    if (userId) {
      const getHistoryStmt = db.prepare('SELECT role, content FROM messages WHERE user_id = ? ORDER BY id ASC')
      chatHistory = getHistoryStmt.all(userId) as {role: string, content: string}[]
    } else {
      const getHistoryStmt = db.prepare('SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC')
      chatHistory = getHistoryStmt.all(sessionId) as {role: string, content: string}[]
    }

    const currentProvider = provider || 'gemini'

    const systemPrompt = `You are an expert AI programming assistant embedded in the "Banc d'Essai" (Test Bench) system dashboard.
Your job is to assist the user in writing and refactoring Arduino C++ code for their test bench.

Hardware Context:
- Connected Board: ${boardName || 'Generic Arduino'}
- Sensors & Thresholds: ${JSON.stringify(thresholds || {})}

Current Editor Code:
\`\`\`cpp
${currentCode || '// Empty editor'}
\`\`\`

Guidelines:
1. Always generate clean, syntactically correct Arduino C++ code.
2. Only write standard code compatible with the active board.
3. If writing code, wrap it in a standard markdown code block: \`\`\`cpp ... \`\`\`
4. When writing a telemetry loop, format the frames as either CSV (e.g. "value1,value2,value3") or JSON (e.g. "{\\"rpm\\": 2000}") matching the expectations of the TableauDeBord.
5. If the user clicks the "Test communication" button, it sends "HANDSHAKE" via serial. The board must respond with "ARDUINO,READY" and flash LED 13 twice to verify connection. Include this logic if they ask about handshakes.

Keep responses concise, professional, and in English.`

    let aiContent = ''

    if (currentProvider === 'groq') {
      const apiKey = process.env.GROQ_API_KEY
      if (!apiKey) {
        return NextResponse.json({ error: 'Groq API Key is not configured in .env.local' }, { status: 500 })
      }

      const groqMessages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.map(msg => ({
          role: msg.role === 'model' ? 'assistant' : msg.role,
          content: msg.content
        }))
      ]

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: groqMessages,
          temperature: 0.2
        })
      })

      const data = await response.json()
      if (!response.ok) {
        return NextResponse.json({ error: data.error?.message || 'Groq API error' }, { status: response.status })
      }

      aiContent = data.choices[0]?.message?.content || ''
    } else {
      // Gemini provider
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) {
        return NextResponse.json({ error: 'Gemini API Key is not configured in .env.local' }, { status: 500 })
      }

      const contents = chatHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))

      if (contents.length > 0 && contents[0].role === 'model') {
        contents.shift()
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: {
            temperature: 0.2
          }
        })
      })

      const data = await response.json()
      if (!response.ok) {
        return NextResponse.json({ error: data.error?.message || 'Gemini API error' }, { status: response.status })
      }

      aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    }

    // Save AI response to database
    const aiTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    
    // Prune before inserting assistant response so total messages remains <= MAX_MESSAGES_PER_USER
    if (userId) {
      const pruneStmt = db.prepare(`
        DELETE FROM messages 
        WHERE user_id = ? 
          AND id NOT IN (
            SELECT id FROM messages 
            WHERE user_id = ? 
            ORDER BY id DESC 
            LIMIT ?
          )
      `)
      pruneStmt.run(userId, userId, MAX_MESSAGES_PER_USER - 1)
    }

    insertStmt.run(sessionId, userId || null, 'assistant', aiContent, aiTimestamp, currentProvider)

    return NextResponse.json({ content: aiContent, timestamp: aiTimestamp })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
