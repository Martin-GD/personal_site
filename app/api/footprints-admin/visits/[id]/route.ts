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

const extensionForImage = (file: File) => {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif"
  }
  return extensions[file.type]
}

const readFootprintData = async () => JSON.parse(await readFile(dataPath, "utf8")) as FootprintData

const writeFootprintData = async (data: FootprintData) => {
  const temporaryPath = `${dataPath}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, "utf8")
  await rename(temporaryPath, dataPath)
}

const localImagePath = (image: string) => {
  if (!image.startsWith("/images/footprints/")) return ""
  return path.join(process.cwd(), "public", image.slice(1))
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) return unauthorized()

  const { id } = await params
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 })
  }

  const removeImage = formData.get("removeImage") === "true"
  const imageEntry = formData.get("image")
  const imageFile = imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null
  const extension = imageFile ? extensionForImage(imageFile) : undefined

  if (!removeImage && !imageFile) {
    return NextResponse.json({ error: "Choose a replacement image or select remove image." }, { status: 400 })
  }
  if (imageFile && (!extension || imageFile.size > 12 * 1024 * 1024)) {
    return NextResponse.json({ error: "Use a JPG, PNG, WEBP, or GIF image under 12 MB." }, { status: 400 })
  }

  try {
    const data = await readFootprintData()
    const index = data.visits.findIndex(visit => visit.id === id)
    if (index === -1) return NextResponse.json({ error: "Footprint record not found." }, { status: 404 })

    const current = data.visits[index]
    let image = current.image
    let savedImagePath = ""

    if (removeImage) {
      image = ""
    } else if (imageFile && extension) {
      const yearDirectory = path.join(imageRoot, current.date.slice(0, 4))
      await mkdir(yearDirectory, { recursive: true })
      savedImagePath = path.join(yearDirectory, `${id}.${extension}`)
      await writeFile(savedImagePath, Buffer.from(await imageFile.arrayBuffer()))
      image = `/images/footprints/${current.date.slice(0, 4)}/${id}.${extension}`
    }

    const record = { ...current, image }
    data.visits[index] = record

    try {
      await writeFootprintData(data)
    } catch (error) {
      if (savedImagePath) await unlink(savedImagePath).catch(() => {})
      throw error
    }

    const oldImagePath = localImagePath(current.image)
    if (oldImagePath && oldImagePath !== savedImagePath && (removeImage || savedImagePath)) {
      await unlink(oldImagePath).catch(() => {})
    }

    revalidatePath("/")
    return NextResponse.json({ record })
  } catch {
    return NextResponse.json({ error: "Unable to update the footprint record." }, { status: 500 })
  }
}
