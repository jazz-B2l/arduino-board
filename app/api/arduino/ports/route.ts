import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

export async function GET() {
  try {
    const rootDir = process.cwd()
    const binPath = path.join(rootDir, 'bin', os.platform() === 'win32' ? 'arduino-cli.exe' : 'arduino-cli')
    
    let cliCmd = 'arduino-cli'
    try {
      await fs.access(binPath)
      cliCmd = `"${binPath}"`
    } catch {}

    // Check if CLI is executable
    try {
      await execAsync(`${cliCmd} version`)
    } catch (err: any) {
      return NextResponse.json({ 
        ports: [], 
        error: 'Arduino CLI is not configured on this host.'
      }, { status: 503 })
    }

    // Run board list to scan connected devices
    const { stdout } = await execAsync(`${cliCmd} board list --format json`)
    const parsed = JSON.parse(stdout)
    
    const ports = (parsed.detected_ports || []).map((p: any) => ({
      address: p.port?.address || '',
      label: p.port?.label || '',
      protocol: p.port?.protocol_label || 'Serial Port',
      vid: p.port?.properties?.vid || '',
      pid: p.port?.properties?.pid || '',
    }))

    return NextResponse.json({ success: true, ports })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, ports: [], error: error.message },
      { status: 500 }
    )
  }
}
