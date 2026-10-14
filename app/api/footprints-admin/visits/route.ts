import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

import { isAdminAuthenticated } from "@/lib/footprints-admin"

interface FootprintVisit {
  id: string
  adcode: string
  city: string
  province: string
  date: string
  note: string
  image: string
  coordinates: [number, number]
}

interface FootprintData {
  year: "all"
  mode: string
  visits: FootprintVisit[]
}

const dataPath = path.join(process.cwd(), "public", "data", "china_footprints_2026.json")
const imageRoot = path.join(process.cwd(), "public", "images", "footprints")

const unauthorized = () => NextResponse.json({ error: "Authentication required." }, { status: 401 })

const readFootprintData = async () => JSON.parse(await readFile(dataPath, "utf8")) as FootprintData

const slugify = (value: string) => value
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "") || "city"

const extensionForImage = (file: File) => {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif"
  }
  return extensions[file.type]
}

const parseCoordinate = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || !value.trim()) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const isValidDate = (date: string) => {
  const parsed = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
}

const writeFootprintData = async (data: FootprintData) => {
  const temporaryPath = `${dataPath}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, "utf8")
  await rename(temporaryPath, dataPath)
}

export async function GET() {
  if (!(await isAdminAuthenticated())) return unauthorized()

  try {
    const data = await readFootprintData()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Unable to read footprint data." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return unauthorized()

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 })
  }

  const city = String(formData.get("city") || "").trim()
  const province = String(formData.get("province") || "").trim()
  const date = String(formData.get("date") || "").trim()
  const adcode = String(formData.get("adcode") || "").trim()
  const note = String(formData.get("note") || "").trim()
  const longitude = parseCoordinate(formData.get("longitude"))
  const latitude = parseCoordinate(formData.get("latitude"))

  if (!city || !province || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidDate(date)) {
    return NextResponse.json({ error: "City, province, and a valid date are required." }, { status: 400 })
  }
  if (longitude === null || latitude === null || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    return NextResponse.json({ error: "Valid longitude and latitude are required." }, { status: 400 })
  }

  const year = Number(date.slice(0, 4))
  const imageEntry = formData.get("image")
  const imageFile = imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null
  const extension = imageFile ? extensionForImage(imageFile) : undefined

  if (imageFile && (!extension || imageFile.size > 12 * 1024 * 1024)) {
    return NextResponse.json({ error: "Use a JPG, PNG, WEBP, or GIF image under 12 MB." }, { status: 400 })
  }

  try {
    const data = await readFootprintData()
    const baseId = `${slugify(city)}_${year}`
    const usedIds = new Set(data.visits.map(visit => visit.id))
    let id = baseId
    let suffix = 2
    while (usedIds.has(id)) {
      id = `${baseId}_${suffix}`
      suffix += 1
    }

    let image = ""
    let savedImagePath = ""
    if (imageFile && extension) {
      const yearDirectory = path.join(imageRoot, String(year))
      await mkdir(yearDirectory, { recursive: true })
      savedImagePath = path.join(yearDirectory, `${id}.${extension}`)
      await writeFile(savedImagePath, Buffer.from(await imageFile.arrayBuffer()))
      image = `/images/footprints/${year}/${id}.${extension}`
    }

    const record: FootprintVisit = {
      id,
      adcode,
      city,
      province,
      date,
      note,
      image,
      coordinates: [longitude, latitude]
    }

    data.visits.push(record)

    try {
      await writeFootprintData(data)
    } catch (error) {
      if (savedImagePath) await unlink(savedImagePath).catch(() => {})
      throw error
    }

    revalidatePath("/")
    return NextResponse.json({ record }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Unable to save the footprint record." }, { status: 500 })
  }
}
