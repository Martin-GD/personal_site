import type { Metadata } from "next"

import { AdminFootprints } from "./admin-footprints"

export const metadata: Metadata = {
  title: "Footprint Admin | Mingdao Gong",
  robots: "noindex, nofollow"
}

export default function FootprintAdminPage() {
  return <AdminFootprints />
}
