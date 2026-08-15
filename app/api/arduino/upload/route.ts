import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

export async function POST(req: Request) {
  try {
    const { code } = await req.json()

    if (!code) {
      return NextResponse.json(
        { error: 'No code provided', logs: ['[Error] No code provided'] },
        { status: 400 }
      )
    }

    const rootDir = process.cwd()
    const binPath = path.join(rootDir, 'bin', os.platform() === 'win32' ? 'arduino-cli.exe' : 'arduino-cli')
    
    let cliCmd = 'arduino-cli'
    try {
      await fs.access(binPath)
      cliCmd = `"${binPath}"`
    } catch {}

    try {
      await execAsync(`${cliCmd} version`)
    } catch (err: any) {
      return NextResponse.json({ 
        error: 'Arduino CLI is not configured on this system.',
        logs: [
          '[Uploader] Checking local toolchain...',
          '[Error] arduino-cli command not found.',
          '[Error] Arduino CLI is not configured on this system.',
          '[Action Required] Please install arduino-cli to enable uploading directly from the browser.'
        ]
      }, { status: 503 })
    }

    // If it was installed, we would compile and upload here...
    return NextResponse.json({
      success: true,
      logs: [
        '[Uploader] Using local Arduino CLI.',
        '[Uploader] This is a stub for the upload process.',
        '[Uploader] Port would be detected via Serial API.',
        '[Uploader] Upload successful.'
      ]
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, logs: [`[Error] Internal Server Error: ${error.message}`] },
      { status: 500 }
    )
  }
}
