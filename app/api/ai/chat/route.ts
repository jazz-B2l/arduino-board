import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    // 1. Authenticate user using JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid session token' }, { status: 401 })
    }

    // 2. Parse request body
    const { chatHistory, provider, boardName, thresholds, currentCode } = await req.json()

    if (!chatHistory || !Array.isArray(chatHistory)) {
      return NextResponse.json({ error: 'Invalid request: chatHistory is required.' }, { status: 400 })
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
5. If the user clicks the "Test communication" button, it sends "HANDSHAKE" via serial. The board must respond with "ARDUINO,READY". It should try to find an unoccupied light (pin) from a list of test pins (like 13, 12, 11...) that does not conflict with active sensors/buttons (tracked in an OCCUPIED_PINS array), blink it twice, and print "ARDUINO,READY". If all test pins are occupied, it should still succeed by printing "ARDUINO,READY" without blinking.

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
          role: msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : 'user',
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
          model: 'llama-3.3-70b-versatile',
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

      // Convert history to Gemini format (roles must alternate user/model)
      const contents = chatHistory.map(msg => ({
        role: msg.role === 'model' || msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))

      // Ensure history doesn't start with a model message
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

    return NextResponse.json({ content: aiContent })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
