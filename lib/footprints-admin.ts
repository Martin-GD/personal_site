import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"

const ADMIN_COOKIE = "gmd_footprints_admin"
const SESSION_TTL_SECONDS = 60 * 60 * 8

const getAdminPassword = () => process.env.FOOTPRINT_ADMIN_PASSWORD?.trim() || ""

const getSessionSecret = () => process.env.FOOTPRINT_ADMIN_SESSION_SECRET?.trim() || getAdminPassword()

const signTimestamp = (timestamp: string) => createHmac("sha256", getSessionSecret()).update(timestamp).digest("hex")

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export const isAdminPasswordConfigured = () => Boolean(getAdminPassword())

export const isAdminPasswordValid = (password: string) => {
  const configuredPassword = getAdminPassword()
  return Boolean(configuredPassword) && safeEqual(password, configuredPassword)
}

export const createAdminSession = async () => {
  const timestamp = String(Date.now())
  const store = await cookies()
  store.set(ADMIN_COOKIE, `${timestamp}.${signTimestamp(timestamp)}`, {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  })
}

export const clearAdminSession = async () => {
  const store = await cookies()
  store.delete(ADMIN_COOKIE)
}

export const isAdminAuthenticated = async () => {
  if (!isAdminPasswordConfigured()) return false

  const token = (await cookies()).get(ADMIN_COOKIE)?.value
  if (!token) return false

  const [timestamp, signature] = token.split(".")
  const issuedAt = Number(timestamp)
  if (!timestamp || !signature || !Number.isFinite(issuedAt)) return false
  if (Date.now() - issuedAt > SESSION_TTL_SECONDS * 1000) return false

  return safeEqual(signature, signTimestamp(timestamp))
}
