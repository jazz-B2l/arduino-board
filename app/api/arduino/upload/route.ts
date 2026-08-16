import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

const BOARD_FQBNS: Record<string, string> = {
  'Arduino Uno': 'arduino:avr:uno',
  'Arduino Mega 2560': 'arduino:avr:mega',
  'Arduino Nano': 'arduino:avr:nano',
  'Arduino Leonardo': 'arduino:avr:leonardo',
  'Arduino Micro': 'arduino:avr:micro',
  'Arduino Due': 'arduino:sam:arduino_due_x_dbg',
  'Arduino Zero': 'arduino:samd:arduino_zero_native',
  'ESP32 DevKit': 'esp32:esp32:esp32',
  'Generic Serial Device': 'arduino:avr:uno' // default fallback
}

export async function POST(req: Request) {
  try {
    const { code, board, port } = await req.json()

    if (!code) {
      return NextResponse.json(
        { error: 'No code provided', logs: ['[Error] No code provided'] },
        { status: 400 }
      )
    }

    const targetBoard = board || 'Arduino Uno'
    const fqbn = BOARD_FQBNS[targetBoard] || 'arduino:avr:uno'
    let targetPort = port

    const rootDir = process.cwd()
    const binPath = path.join(rootDir, 'bin', os.platform() === 'win32' ? 'arduino-cli.exe' : 'arduino-cli')
    
    let cliCmd = 'arduino-cli'
    try {
      await fs.access(binPath)
      cliCmd = `"${binPath}"`
    } catch {}

    // Check version
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

    // Auto-detect port if not provided
    if (!targetPort) {
      try {
        const { stdout: portsOut } = await execAsync(`${cliCmd} board list --format json`)
        const parsed = JSON.parse(portsOut)
        const detected = parsed.detected_ports || []
        
        if (detected.length === 1) {
          targetPort = detected[0].port?.address
        } else if (detected.length > 1) {
          return NextResponse.json({
            error: 'Multiple serial ports detected. Please select a specific port to upload.',
            logs: [
              '[Uploader] Auto-detecting upload ports...',
              `[Error] Found ${detected.length} active ports. Please select one explicitly from the dropdown.`
            ]
          }, { status: 400 })
        } else {
          return NextResponse.json({
            error: 'No serial port detected. Connect your Arduino board.',
            logs: [
              '[Uploader] Auto-detecting upload ports...',
              '[Error] No serial devices found.'
            ]
          }, { status: 400 })
        }
      } catch (err: any) {
        return NextResponse.json({
          error: 'No target COM port specified and port auto-detection failed.',
          logs: ['[Error] Port detection failed.']
        }, { status: 400 })
      }
    }

    const tmpDirBase = await fs.mkdtemp(path.join(os.tmpdir(), 'arduino-'))
    const sketchDir = path.join(tmpDirBase, 'sketch')
    await fs.mkdir(sketchDir)
    const sketchPath = path.join(sketchDir, 'sketch.ino')
    
    await fs.writeFile(sketchPath, code)

    try {
      // 1. Compile
      const { stdout: compileOut } = await execAsync(`${cliCmd} compile --fqbn ${fqbn} ${sketchPath}`)
      
      // 2. Upload
      const { stdout: uploadOut } = await execAsync(`${cliCmd} upload -p ${targetPort} --fqbn ${fqbn} ${sketchPath}`)
      
      return NextResponse.json({
        success: true,
        logs: [
          `[Uploader] Starting compile for ${targetBoard}...`,
          ...compileOut.split('\n').filter(Boolean),
          `[Uploader] Sketch compiled successfully. Flashing to port ${targetPort}...`,
          ...uploadOut.split('\n').filter(Boolean),
          `[Uploader] Upload successful on port ${targetPort}!`
        ]
      })
    } catch (err: any) {
      return NextResponse.json({
        error: 'Upload sequence failed',
        logs: [
          `[Uploader] Executing sequence...`,
          ...(err.stdout ? err.stdout.split('\n').filter(Boolean) : []),
          ...(err.stderr ? err.stderr.split('\n').filter(Boolean) : []),
          `[Error] Upload exited with error. If the device is connected in the dashboard, click "Disconnect" to release the port lock, then retry.`
        ]
      }, { status: 400 })
    } finally {
      await fs.rm(tmpDirBase, { recursive: true, force: true }).catch(() => {})
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, logs: [`[Error] Internal Server Error: ${error.message}`] },
      { status: 500 }
    )
  }
}
