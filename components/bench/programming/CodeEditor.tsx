'use client'

import Editor from '@monaco-editor/react'
import { useTheme } from '../ThemeContext'

interface CodeEditorProps {
  code: string
  onChange: (value: string) => void
}

export function CodeEditor({ code, onChange }: CodeEditorProps) {
  const { theme } = useTheme()

  return (
    <Editor
      height="100%"
      language="cpp"
      theme={theme === 'light' ? 'vs' : 'vs-dark'}
      value={code}
      onChange={(value) => onChange(value || '')}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
        wordWrap: 'on',
        padding: { top: 16 },
        scrollBeyondLastLine: false,
        lineNumbersMinChars: 3,
        glyphMargin: false,
        folding: true,
      }}
      loading={<div className="flex items-center justify-center h-full text-bench-muted text-sm">Loading Editor...</div>}
    />
  )
}
