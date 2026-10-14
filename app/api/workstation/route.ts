import { readFile, stat } from "node:fs/promises"
import path from "node:path"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const projectFile = path.resolve(process.cwd(), "public", "data", "ha_workstation_daily_duration.json")
    const siblingFile = path.resolve(process.cwd(), "..", "ha_workstation_daily_duration.json")
    const candidates = await Promise.all([projectFile, siblingFile].map(async file => {
      try {
        const metadata = await stat(file)
        return { file, modifiedAt: metadata.mtimeMs }
      } catch {
        return null
      }
    }))
    const available = candidates.filter((candidate): candidate is { file: string; modifiedAt: number } => candidate !== null)
    const latest = available.sort((a, b) => b.modifiedAt - a.modifiedAt)[0]
    if (!latest) throw new Error("No workstation data file")

    const data = JSON.parse(await readFile(latest.file, "utf8"))
    return Response.json(data, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return Response.json({ error: "Workstation data unavailable" }, { status: 500 })
  }
}
