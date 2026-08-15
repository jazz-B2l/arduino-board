import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { messages, provider, boardName, thresholds, currentCode } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages array' }, { status: 400 })
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

    if (currentProvider === 'groq') {
      const apiKey = process.env.GROQ_API_KEY
      if (!apiKey) {
        return NextResponse.json({ error: 'Groq API Key is not configured in .env.local' }, { status: 500 })
      }

      const groqMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => ({
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

      return NextResponse.json({
        content: data.choices[0]?.message?.content || ''
      })
    } else {
      // Gemini provider
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) {
        return NextResponse.json({ error: 'Gemini API Key is not configured in .env.local' }, { status: 500 })
      }

      // Map roles for Gemini: 'user' or 'model'
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))

      // If contents array starts with 'model', Gemini throws an error. It must start with 'user'.
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

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      return NextResponse.json({ content })
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
