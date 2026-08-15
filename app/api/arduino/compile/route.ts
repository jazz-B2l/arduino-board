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

    // Try to run arduino-cli to check if it's installed
    try {
      await execAsync(`${cliCmd} version`)
    } catch (err: any) {
      // Graceful degradation when CLI is not installed (expected)
      return NextResponse.json({ 
        error: 'Arduino CLI is not configured on this system.',
        logs: [
          '[Compiler] Checking local toolchain...',
          '[Error] arduino-cli command not found.',
          '[Error] Arduino CLI is not configured on this system.',
          '[Action Required] Please install arduino-cli and add it to your system PATH to enable real compilation.'
        ]
      }, { status: 503 })
    }

    // If arduino-cli is installed, try real compilation
    const tmpDirBase = await fs.mkdtemp(path.join(os.tmpdir(), 'arduino-'))
    const sketchDir = path.join(tmpDirBase, 'sketch')
    await fs.mkdir(sketchDir)
    const sketchPath = path.join(sketchDir, 'sketch.ino')
    
    await fs.writeFile(sketchPath, code)

    try {
      // Default to uno, would be dynamic in production
      const { stdout, stderr } = await execAsync(`${cliCmd} compile --fqbn arduino:avr:uno ${sketchPath}`)
      return NextResponse.json({
        success: true,
        logs: [
          '[Compiler] Starting compilation for arduino:avr:uno...',
          ...stdout.split('\n').filter(Boolean),
          ...stderr.split('\n').filter(Boolean),
          '[Compiler] Compilation successful.'
        ]
      })
    } catch (compileErr: any) {
      return NextResponse.json({
        error: 'Compilation failed',
        logs: [
          '[Compiler] Starting compilation...',
          ...(compileErr.stdout ? compileErr.stdout.split('\n').filter(Boolean) : []),
          ...(compileErr.stderr ? compileErr.stderr.split('\n').filter(Boolean) : []),
          `[Error] Compilation exited with error.`
        ]
      }, { status: 400 })
    } finally {
      // Cleanup temp files
      await fs.rm(tmpDirBase, { recursive: true, force: true }).catch(() => {})
    }

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, logs: [`[Error] Internal Server Error: ${error.message}`] },
      { status: 500 }
    )
  }
}
