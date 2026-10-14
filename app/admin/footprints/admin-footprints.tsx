"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"

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

const emptyForm = {
  city: "",
  province: "",
  date: "",
  adcode: "",
  longitude: "",
  latitude: "",
  note: ""
}

const formatDate = (date: string) => new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Shanghai"
}).format(new Date(`${date}T12:00:00+08:00`))

export const AdminFootprints = () => {
  const [configured, setConfigured] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [visits, setVisits] = useState<FootprintVisit[]>([])
  const [form, setForm] = useState(emptyForm)
  const [image, setImage] = useState<File | null>(null)
  const [editingVisit, setEditingVisit] = useState<FootprintVisit | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [query, setQuery] = useState("")
  const [yearFilter, setYearFilter] = useState("all")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const loadVisits = async () => {
    const response = await fetch("/api/footprints-admin/visits", { cache: "no-store" })
    if (!response.ok) throw new Error("Unable to load footprint data.")
    const data = await response.json() as { visits: FootprintVisit[] }
    setVisits(data.visits)
  }

  useEffect(() => {
    document.body.classList.add("admin-mode")
    fetch("/api/footprints-admin/auth", { cache: "no-store" })
      .then(response => response.json() as Promise<{ configured: boolean; authenticated: boolean }>)
      .then(data => {
        setConfigured(data.configured)
        setAuthenticated(data.authenticated)
        if (data.authenticated) return loadVisits()
        return undefined
      })
      .catch(() => setLoginError("Unable to contact the admin service."))
      .finally(() => setChecking(false))

    return () => document.body.classList.remove("admin-mode")
  }, [])

  const years = useMemo(
    () => [...new Set(visits.map(visit => visit.date.slice(0, 4)))].sort((left, right) => right.localeCompare(left)),
    [visits]
  )

  const filteredVisits = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return [...visits]
      .filter(visit => yearFilter === "all" || visit.date.startsWith(yearFilter))
      .filter(visit => !normalizedQuery || `${visit.city} ${visit.province} ${visit.id}`.toLowerCase().includes(normalizedQuery))
      .sort((left, right) => right.date.localeCompare(left.date))
  }, [query, visits, yearFilter])

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError("")
    const response = await fetch("/api/footprints-admin/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password })
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { error?: string }
      setLoginError(data.error || "Incorrect password.")
      return
    }
    setPassword("")
    setAuthenticated(true)
    await loadVisits()
  }

  const handleLogout = async () => {
    await fetch("/api/footprints-admin/auth", { method: "DELETE" })
    setAuthenticated(false)
    setVisits([])
  }

  const handleFormChange = (name: keyof typeof emptyForm, value: string) => {
    setForm(current => ({ ...current, [name]: value }))
  }

  const startEditing = (visit: FootprintVisit) => {
    setEditingVisit(visit)
    setImage(null)
    setRemoveImage(false)
    setMessage("")
    setError("")
    const input = document.querySelector<HTMLInputElement>("#footprint-edit-image")
    if (input) input.value = ""
    window.requestAnimationFrame(() => {
      document.querySelector(".admin-footprints-form-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  const cancelEditing = () => {
    setEditingVisit(null)
    setImage(null)
    setRemoveImage(false)
    setMessage("")
    setError("")
  }

  const handleUpdateImage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingVisit) return

    setSaving(true)
    setMessage("")
    setError("")
    const formData = new FormData()
    if (image) formData.append("image", image)
    formData.append("removeImage", String(removeImage))

    try {
      const response = await fetch(`/api/footprints-admin/visits/${encodeURIComponent(editingVisit.id)}`, {
        method: "PATCH",
        body: formData
      })
      const data = await response.json() as { record?: FootprintVisit; error?: string }
      if (!response.ok || !data.record) throw new Error(data.error || "Unable to update the image.")
      setVisits(current => current.map(visit => visit.id === data.record!.id ? data.record! : visit))
      setEditingVisit(data.record)
      setImage(null)
      setRemoveImage(false)
      const input = document.querySelector<HTMLInputElement>("#footprint-edit-image")
      if (input) input.value = ""
      setMessage(`${data.record.city} image updated.`)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update the image.")
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage("")
    setError("")

    const formData = new FormData()
    Object.entries(form).forEach(([key, value]) => formData.append(key, value))
    if (image) formData.append("image", image)

    try {
      const response = await fetch("/api/footprints-admin/visits", { method: "POST", body: formData })
      const data = await response.json() as { record?: FootprintVisit; error?: string }
      if (!response.ok || !data.record) throw new Error(data.error || "Unable to save the record.")
      setVisits(current => [...current, data.record!])
      setForm(emptyForm)
      setImage(null)
      const input = document.querySelector<HTMLInputElement>("#footprint-image")
      if (input) input.value = ""
      setMessage(`${data.record.city} added to ${data.record.date.slice(0, 4)}.`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save the record.")
    } finally {
      setSaving(false)
    }
  }

  if (checking) {
    return <main className="admin-footprints-shell"><div className="admin-footprints-loading">CHECKING ACCESS</div></main>
  }

  if (!configured) {
    return <main className="admin-footprints-shell"><div className="admin-footprints-message"><span>ADMIN CONFIGURATION</span><h1>Set FOOTPRINT_ADMIN_PASSWORD first.</h1></div></main>
  }

  if (!authenticated) {
    return (
      <main className="admin-footprints-shell admin-footprints-login">
        <div className="admin-footprints-login-mark">G</div>
        <div className="admin-footprints-login-copy">
          <span>PRIVATE ACCESS / FOOTPRINTS</span>
          <h1>City archive</h1>
          <p>Manage places, dates, coordinates, and city images.</p>
        </div>
        <form className="admin-footprints-login-form" onSubmit={handleLogin}>
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoFocus required />
          <button type="submit">Enter archive</button>
          {loginError ? <p className="admin-footprints-error">{loginError}</p> : null}
        </form>
      </main>
    )
  }

  return (
    <main className="admin-footprints-shell">
      <div className="admin-footprints-topbar">
        <div>
          <span>PRIVATE ACCESS / FOOTPRINTS</span>
          <h1>City archive</h1>
        </div>
        <button type="button" className="admin-footprints-logout" onClick={handleLogout}>Log out</button>
      </div>

      <div className="admin-footprints-grid">
        <section className="admin-footprints-panel admin-footprints-form-panel">
          {editingVisit ? (
            <>
              <div className="admin-footprints-panel-heading">
                <span>01 / EDIT RECORD</span>
                <strong>{editingVisit.city}</strong>
              </div>
              <form className="admin-footprints-form" onSubmit={handleUpdateImage}>
                <div className="admin-footprints-edit-preview">
                  {editingVisit.image ? <img src={editingVisit.image} alt={`${editingVisit.city} current image`} /> : <span>NO IMAGE</span>}
                  <strong>{formatDate(editingVisit.date)} · {editingVisit.province}</strong>
                </div>
                <label>New city image<input id="footprint-edit-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => { setImage(event.target.files?.[0] || null); setRemoveImage(false) }} /></label>
                <label className="admin-footprints-check"><input type="checkbox" checked={removeImage} onChange={event => { setRemoveImage(event.target.checked); if (event.target.checked) setImage(null) }} /> Remove current image</label>
                <button className="admin-footprints-submit" type="submit" disabled={saving}>{saving ? "Saving..." : "Update city image"}</button>
                <button className="admin-footprints-cancel" type="button" onClick={cancelEditing}>Back to add city</button>
                {message ? <p className="admin-footprints-success">{message}</p> : null}
                {error ? <p className="admin-footprints-error">{error}</p> : null}
              </form>
            </>
          ) : (
            <>
              <div className="admin-footprints-panel-heading">
                <span>01 / NEW RECORD</span>
                <strong>ADD CITY</strong>
              </div>
              <form className="admin-footprints-form" onSubmit={handleSave}>
                <div className="admin-footprints-form-row">
                  <label>City<input value={form.city} onChange={event => handleFormChange("city", event.target.value)} required /></label>
                  <label>Province<input value={form.province} onChange={event => handleFormChange("province", event.target.value)} required /></label>
                </div>
                <div className="admin-footprints-form-row">
                  <label>Date<input type="date" value={form.date} onChange={event => handleFormChange("date", event.target.value)} required /></label>
                  <label>Adcode<input inputMode="numeric" value={form.adcode} onChange={event => handleFormChange("adcode", event.target.value)} /></label>
                </div>
                <div className="admin-footprints-form-row">
                  <label>Longitude<input type="number" step="any" min="-180" max="180" value={form.longitude} onChange={event => handleFormChange("longitude", event.target.value)} required /></label>
                  <label>Latitude<input type="number" step="any" min="-90" max="90" value={form.latitude} onChange={event => handleFormChange("latitude", event.target.value)} required /></label>
                </div>
                <label>Note<textarea rows={3} value={form.note} onChange={event => handleFormChange("note", event.target.value)} /></label>
                <label>City image<input id="footprint-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => setImage(event.target.files?.[0] || null)} /></label>
                <button className="admin-footprints-submit" type="submit" disabled={saving}>{saving ? "Saving..." : "Save city record"}</button>
                {message ? <p className="admin-footprints-success">{message}</p> : null}
                {error ? <p className="admin-footprints-error">{error}</p> : null}
              </form>
            </>
          )}
        </section>

        <section className="admin-footprints-panel admin-footprints-list-panel">
          <div className="admin-footprints-panel-heading">
            <span>02 / ALL RECORDS</span>
            <strong>{visits.length} CITIES</strong>
          </div>
          <div className="admin-footprints-filters">
            <input aria-label="Search cities" placeholder="Search city or province" value={query} onChange={event => setQuery(event.target.value)} />
            <select aria-label="Filter by year" value={yearFilter} onChange={event => setYearFilter(event.target.value)}>
              <option value="all">All years</option>
              {years.map(year => <option value={year} key={year}>{year}</option>)}
            </select>
          </div>
          <div className="admin-footprints-table-wrap">
            <table className="admin-footprints-table">
              <thead><tr><th>Place</th><th>Date</th><th>Coordinates</th><th>Image</th><th>Action</th></tr></thead>
              <tbody>
                {filteredVisits.map(visit => (
                  <tr key={visit.id}>
                    <td><strong>{visit.city}</strong><span>{visit.province}</span></td>
                    <td>{formatDate(visit.date)}</td>
                    <td>{visit.coordinates.map(value => value.toFixed(4)).join(", ")}</td>
                    <td>{visit.image ? <img src={visit.image} alt="" /> : <span className="admin-footprints-no-image">—</span>}</td>
                    <td><button type="button" className="admin-footprints-row-action" onClick={() => startEditing(visit)}>{visit.image ? "Edit photo" : "Add photo"}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
