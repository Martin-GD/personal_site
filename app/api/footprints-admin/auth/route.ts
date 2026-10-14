import { NextResponse } from "next/server"

import {
  clearAdminSession,
  createAdminSession,
  isAdminAuthenticated,
  isAdminPasswordConfigured,
  isAdminPasswordValid
} from "@/lib/footprints-admin"

export async function GET() {
  return NextResponse.json({
    authenticated: await isAdminAuthenticated(),
    configured: isAdminPasswordConfigured()
  })
}

export async function POST(request: Request) {
  if (!isAdminPasswordConfigured()) {
    return NextResponse.json({ error: "Admin password is not configured." }, { status: 500 })
  }

  let body: { password?: string }
  try {
    body = await request.json() as { password?: string }
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  if (!body.password || !isAdminPasswordValid(body.password)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 })
  }

  await createAdminSession()
  return NextResponse.json({ authenticated: true })
}

export async function DELETE() {
  await clearAdminSession()
  return NextResponse.json({ authenticated: false })
}
