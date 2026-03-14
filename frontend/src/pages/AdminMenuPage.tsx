import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { MenuCategory, MenuItem, Restaurant } from '../components/types'
import { useAuth } from '../components/AuthContext'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

interface AdminMenuResponse {
  restaurant: Restaurant
  categories: MenuCategory[]
}

const DEFAULT_ALLERGENS = ['gluten', 'nuts', 'dairy', 'eggs', 'soy', 'shellfish']
const DEFAULT_TAGS = ['vegan', 'vegetarian', 'spicy', 'gluten-free', 'kids', 'chef special']

interface BulkCategory {
  categoryName: string
  items: { name: string; price: number }[]
}

function parseBulkMenuText(text: string): BulkCategory[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const result: BulkCategory[] = []
  let current: BulkCategory | null = null

  for (const line of lines) {
    const emIdx = line.indexOf('—')
    const enIdx = line.indexOf('–')
    const dashIdx = emIdx >= 0 ? emIdx : enIdx >= 0 ? enIdx : -1

    if (dashIdx > 0) {
      const name = line.slice(0, dashIdx).trim()
      const afterDash = line.slice(dashIdx + 1).trim()
      const priceStr = afterDash.replace(/[₪$€£\s]/g, '').replace(',', '.')
      const price = parseFloat(priceStr)
      if (name && !Number.isNaN(price) && price > 0 && current) {
        current.items.push({ name, price })
        continue
      }
    }

    if (line) {
      current = { categoryName: line, items: [] }
      result.push(current)
    }
  }

  return result.filter((c) => c.items.length > 0)
}

function getCurrencySymbol(currency?: string) {
  switch ((currency ?? 'USD').toUpperCase()) {
    case 'EUR':
      return '€'
    case 'GBP':
      return '£'
    case 'ILS':
      return '₪'
    case 'USD':
    default:
      return '$'
  }
}

export default function AdminMenuPage() {
  const { restaurantId: routeRestaurantId } = useParams<{ restaurantId: string }>()
  const { restaurant: authRestaurant, token } = useAuth()
  const restaurantId = authRestaurant?._id ?? routeRestaurantId
  const [data, setData] = useState<AdminMenuResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [newItemImagePreview, setNewItemImagePreview] = useState<string | null>(null)
  const [editItemImagePreview, setEditItemImagePreview] = useState<string | null>(null)
  const [openActionsItemId, setOpenActionsItemId] = useState<string | null>(null)
  const [dragCategoryIndex, setDragCategoryIndex] = useState<number | null>(null)
  const [dragItemState, setDragItemState] = useState<{
    categoryId: string
    index: number
  } | null>(null)
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<string[]>([])
  const [pendingDelete, setPendingDelete] = useState<
    | {
        type: 'category'
        id: string
        name: string
      }
    | {
        type: 'item'
        id: string
        name: string
      }
    | null
  >(null)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [editingItem, setEditingItem] = useState<{
    item: MenuItem
    categoryId: string
  } | null>(null)
  const [addingItemForCategory, setAddingItemForCategory] = useState<{
    _id: string
    name: string
  } | null>(null)
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [bulkImportOpen, setBulkImportOpen] = useState(false)
  const [bulkImportText, setBulkImportText] = useState('')
  const [bulkImportProgress, setBulkImportProgress] = useState<{
    done: number
    total: number
  } | null>(null)

  const loadAdminMenu = async (opts?: { showFullscreenLoader?: boolean }) => {
    if (!restaurantId) return
    if (opts?.showFullscreenLoader) {
      setLoading(true)
    }
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}/admin-menu`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const json = (await res.json()) as AdminMenuResponse & { message?: string }
      if (!res.ok) {
        throw new Error(json.message ?? 'Failed to load admin menu')
      }
      setData(json)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      if (opts?.showFullscreenLoader) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    void loadAdminMenu({ showFullscreenLoader: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId])

  const addCategory = async (name: string) => {
    if (!restaurantId || !name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { message?: string }
        throw new Error(data.message ?? 'Failed to create category')
      }
      await loadAdminMenu()
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const addItem = async (categoryId: string, formData: FormData) => {
    const name = (formData.get('name') as string) ?? ''
    const description = (formData.get('description') as string) ?? ''
    const priceRaw = formData.get('price') as string
    const price = Number(priceRaw)

    const trimmedName = name.trim()
    const trimmedDescription = description.trim()
    if (!trimmedName || !trimmedDescription || !price) {
      // eslint-disable-next-line no-alert
      alert('Please fill in name, description, and a valid price.')
      return false
    }

    const defaultAllergens = formData.getAll('allergenDefaults') as string[]
    const allergensRaw = (formData.get('allergensCustom') as string) ?? ''
    const defaultTags = formData.getAll('tagDefaults') as string[]
    const tagsRaw = (formData.get('tagsCustom') as string) ?? ''

    const allergens =
      defaultAllergens.length === 0 && allergensRaw.trim().length === 0
        ? []
        : Array.from(
            new Set([
              ...defaultAllergens,
              ...allergensRaw
                .split(',')
                .map((a) => a.trim())
                .filter(Boolean),
            ])
          )

    const tags =
      defaultTags.length === 0 && tagsRaw.trim().length === 0
        ? []
        : Array.from(
            new Set([
              ...defaultTags,
              ...tagsRaw
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            ])
          )

    if (allergens.length === 0) {
      // eslint-disable-next-line no-alert
      alert('Please select at least one allergen or add a custom allergen.')
      return false
    }

    if (tags.length === 0) {
      // eslint-disable-next-line no-alert
      alert('Please select at least one tag or add a custom tag.')
      return false
    }

    formData.set('name', trimmedName)
    formData.set('description', trimmedDescription)
    formData.set('price', price.toString())
    formData.set('allergens', allergens.join(','))
    formData.set('tags', tags.join(','))

    try {
      setSaving(true)
      const res = await fetch(`${API_BASE}/api/categories/${categoryId}/items`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      })
      if (!res.ok) {
        const data = (await res.json()) as { message?: string }
        throw new Error(data.message ?? 'Failed to create item')
      }
      await loadAdminMenu()
      return true
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
      return false
    } finally {
      setSaving(false)
    }
  }

  const updateItemDetails = async (itemId: string, formData: FormData) => {
    const name = (formData.get('name') as string) ?? ''
    const description = (formData.get('description') as string) ?? ''
    const priceRaw = formData.get('price') as string
    const price = Number(priceRaw)

    if (!name.trim() || !description.trim() || !price) return

    const defaultAllergens = formData.getAll('allergenDefaults') as string[]
    const allergensRaw = (formData.get('allergensCustom') as string) ?? ''
    const defaultTags = formData.getAll('tagDefaults') as string[]
    const tagsRaw = (formData.get('tagsCustom') as string) ?? ''

    const allergens =
      defaultAllergens.length === 0 && allergensRaw.trim().length === 0
        ? []
        : Array.from(
            new Set([
              ...defaultAllergens,
              ...allergensRaw
                .split(',')
                .map((a) => a.trim())
                .filter(Boolean),
            ])
          )

    const tags =
      defaultTags.length === 0 && tagsRaw.trim().length === 0
        ? []
        : Array.from(
            new Set([
              ...defaultTags,
              ...tagsRaw
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            ])
          )

    formData.set('name', name)
    formData.set('description', description)
    formData.set('price', price.toString())
    formData.set('allergens', allergens.join(','))
    formData.set('tags', tags.join(','))

    const removeImageRaw = formData.get('removeImage') as string | null
    if (removeImageRaw === 'on' || removeImageRaw === 'true' || removeImageRaw === '1') {
      formData.set('removeImage', 'true')
    } else {
      formData.delete('removeImage')
    }

    const availableRaw = formData.get('available') as string | null
    if (availableRaw === 'on' || availableRaw === 'true' || availableRaw === '1') {
      formData.set('available', 'true')
    } else {
      formData.set('available', 'false')
    }

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      })
      if (!res.ok) {
        const data = (await res.json()) as { message?: string }
        throw new Error(data.message ?? 'Failed to update item')
      }
      await loadAdminMenu()
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const deleteItem = async (itemId: string) => {
    if (!itemId) return
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/items/${itemId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) {
        const data = (await res.json()) as { message?: string }
        throw new Error(data.message ?? 'Failed to delete item')
      }
      await loadAdminMenu()
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const reorderCategories = async (categories: MenuCategory[]) => {
    setSaving(true)
    try {
      await Promise.all(
        categories.map((cat, index) =>
          fetch(`${API_BASE}/api/categories/${cat._id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ position: index }),
          })
        )
      )
      await loadAdminMenu()
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const updateCategoryName = async (categoryId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) {
      // eslint-disable-next-line no-alert
      alert('Category name cannot be empty')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/categories/${categoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { message?: string }
        throw new Error(data.message ?? 'Failed to rename category')
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              categories: prev.categories.map((cat) =>
                cat._id === categoryId ? { ...cat, name: trimmed } : cat
              ),
            }
          : prev
      )
      setEditingCategoryId(null)
      setEditingCategoryName('')
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const reorderItems = async (_categoryId: string, items: MenuItem[]) => {
    setSaving(true)
    try {
      await Promise.all(
        items.map((item, index) =>
          fetch(`${API_BASE}/api/items/${item._id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ position: index }),
          })
        )
      )
      await loadAdminMenu()
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const deleteCategory = async (categoryId: string) => {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/categories/${categoryId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) {
        const data = (await res.json()) as { message?: string }
        throw new Error(data.message ?? 'Failed to delete category')
      }
      await loadAdminMenu()
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const bulkImport = async (parsed: BulkCategory[]) => {
    if (!restaurantId) return
    const totalItems = parsed.reduce((sum, c) => sum + c.items.length, 0)
    let done = 0
    setBulkImportProgress({ done: 0, total: totalItems })
    setSaving(true)
    try {
      for (const cat of parsed) {
        const catRes = await fetch(`${API_BASE}/api/restaurants/${restaurantId}/categories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ name: cat.categoryName }),
        })
        const catData = (await catRes.json()) as { _id: string; message?: string }
        if (!catRes.ok) {
          throw new Error(catData.message ?? `Failed to create category "${cat.categoryName}"`)
        }

        for (const item of cat.items) {
          const formData = new FormData()
          formData.set('name', item.name)
          formData.set('description', item.name)
          formData.set('price', item.price.toString())

          const itemRes = await fetch(`${API_BASE}/api/categories/${catData._id}/items`, {
            method: 'POST',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
          })
          if (!itemRes.ok) {
            const itemData = (await itemRes.json()) as { message?: string }
            throw new Error(itemData.message ?? `Failed to create item "${item.name}"`)
          }
          done++
          setBulkImportProgress({ done, total: totalItems })
        }
      }

      await loadAdminMenu()
      setBulkImportOpen(false)
      setBulkImportText('')
      setBulkImportProgress(null)
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
      setBulkImportProgress(null)
      await loadAdminMenu()
    } finally {
      setSaving(false)
    }
  }

  const handleAutoScroll = (clientY: number) => {
    const edgeThreshold = 80
    const maxScrollAmount = 40
    const viewportHeight = window.innerHeight

    if (clientY < edgeThreshold) {
      const intensity = (edgeThreshold - clientY) / edgeThreshold
      const amount = -Math.min(maxScrollAmount, Math.max(10, intensity * maxScrollAmount))
      window.scrollBy({ top: amount, behavior: 'smooth' })
    } else if (clientY > viewportHeight - edgeThreshold) {
      const intensity = (clientY - (viewportHeight - edgeThreshold)) / edgeThreshold
      const amount = Math.min(maxScrollAmount, Math.max(10, intensity * maxScrollAmount))
      window.scrollBy({ top: amount, behavior: 'smooth' })
    }
  }

  const toggleCategoryCollapsed = (categoryId: string) => {
    setCollapsedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-4 w-48 rounded-[4px]" style={{ backgroundColor: '#3D332B' }} />
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-[4px] p-5" style={{ backgroundColor: '#251E19', border: '1px solid #4A3F35' }}>
            <div className="h-4 w-32 rounded-[4px] mb-3" style={{ backgroundColor: '#3D332B' }} />
            <div className="h-[72px] rounded-[4px]" style={{ backgroundColor: '#3D332B' }} />
          </div>
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-[4px] px-5 py-4 text-sm" style={{ backgroundColor: 'rgba(139,38,53,0.1)', border: '1px solid rgba(139,38,53,0.3)', color: '#C96070', fontFamily: 'var(--font-body)' }}>
        {error ?? 'Failed to load restaurant menu.'}
      </div>
    )
  }

  const currencySymbol = getCurrencySymbol(data.restaurant.currency)

  return (
    <div
      className="pb-8"
      style={{ color: '#E8DFD4' }}
      onClick={() => setOpenActionsItemId(null)}
    >
      <div className="space-y-6">
        {/* Add category toolbar */}
        <section className="rounded-[4px] px-4 py-4" style={{ backgroundColor: '#251E19', border: '1px solid #4A3F35' }}>
          <div className="sm:hidden">
            {!addCategoryOpen ? (
              <div className="flex flex-col gap-2">
                <button type="button" className="btn-brass w-full" disabled={saving} onClick={() => setAddCategoryOpen(true)}>
                  + Add Category
                </button>
                <button type="button" className="btn-outline w-full" disabled={saving} onClick={() => setBulkImportOpen(true)}>
                  ⬆ Bulk Import
                </button>
              </div>
            ) : (
              <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); void addCategory((fd.get('name') as string) ?? ''); e.currentTarget.reset(); setAddCategoryOpen(false) }}>
                <input name="name" autoFocus className="input-academia" style={{ height: '2.75rem', fontSize: '14px' }} placeholder="New category name" />
                <div className="flex gap-2">
                  <button type="button" className="btn-outline flex-1 btn-brass-sm" onClick={() => setAddCategoryOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-brass flex-1 btn-brass-sm" disabled={saving}>Add</button>
                </div>
              </form>
            )}
          </div>
          <div className="hidden sm:block">
            <span className="overline-volume">Add Section</span>
            <form className="flex flex-col gap-2 sm:flex-row mt-2" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); void addCategory((fd.get('name') as string) ?? ''); e.currentTarget.reset() }}>
              <input name="name" className="input-academia flex-1" style={{ height: '2.75rem', fontSize: '14px' }} placeholder="New category name" />
              <button type="submit" className="btn-brass" disabled={saving}>Add Category</button>
              <button type="button" className="btn-outline" disabled={saving} onClick={() => setBulkImportOpen(true)}>⬆ Bulk Import</button>
            </form>
          </div>
        </section>

        <section className="space-y-5">
          {data.categories.length === 0 && (
            <p className="text-sm italic" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
              No categories yet. Add one above.
            </p>
          )}
          {data.categories.map((category, catIndex) => {
            const isCollapsed = collapsedCategoryIds.includes(category._id)
            return (
              <div
                key={category._id}
                className="rounded-[4px] p-4 transition-all duration-300 sm:p-5"
                style={{
                  backgroundColor: '#251E19',
                  border: `1px solid ${dragCategoryIndex === catIndex ? 'rgba(201,169,98,0.5)' : '#4A3F35'}`,
                }}
                draggable={editingCategoryId === category._id ? false : true}
                onDragStart={(e) => {
                  if (saving) return
                  e.dataTransfer.effectAllowed = 'move'
                  setDragCategoryIndex(catIndex)
                }}
                onDragOver={(e) => {
                  if (dragCategoryIndex === null) return
                  e.preventDefault()
                  handleAutoScroll(e.clientY)
                  if (dragCategoryIndex !== catIndex) {
                    setData((prev) => {
                      if (!prev) return prev
                      const categories = [...prev.categories]
                      const moved = categories.splice(dragCategoryIndex, 1)[0]
                      categories.splice(catIndex, 0, moved)
                      return { ...prev, categories }
                    })
                    setDragCategoryIndex(catIndex)
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragCategoryIndex !== null && !saving && data) {
                    void reorderCategories(data.categories)
                  }
                  setDragCategoryIndex(null)
                }}
                onDragEnd={() => setDragCategoryIndex(null)}
              >
                {/* Category header */}
                <div className="mb-4 flex items-start gap-3 pb-3" style={{ borderBottom: '1px solid #4A3F35' }}>
                  {/* Drag handle */}
                  <div className="flex-shrink-0 cursor-grab active:cursor-grabbing select-none text-base leading-none mt-0.5" style={{ color: '#4A3F35' }}>
                    ⠿
                  </div>

                  {/* Name / rename input */}
                  <div className="min-w-0 flex-1">
                    {editingCategoryId === category._id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          className="input-academia max-w-xs"
                          style={{ height: '2.5rem', fontSize: '13px' }}
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          autoFocus
                          placeholder="Category name"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void updateCategoryName(category._id, editingCategoryName)
                            if (e.key === 'Escape') { setEditingCategoryId(null); setEditingCategoryName('') }
                          }}
                        />
                        <button type="button" className="btn-brass btn-brass-sm shrink-0" style={{ height: '2.5rem', fontSize: '0.55rem' }} disabled={saving} onClick={() => void updateCategoryName(category._id, editingCategoryName)}>Save</button>
                        <button type="button" className="btn-ghost shrink-0" style={{ height: '2.5rem', fontSize: '0.55rem' }} onClick={() => { setEditingCategoryId(null); setEditingCategoryName('') }}>Cancel</button>
                      </div>
                    ) : (
                      <h2 className="break-words text-lg" style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}>
                        {category.name}
                      </h2>
                    )}
                  </div>

                  {/* Action toolbar */}
                  {editingCategoryId !== category._id && (
                    <div className="flex flex-shrink-0 items-center gap-1">
                      {/* Collapse toggle */}
                      <button type="button" title={isCollapsed ? 'Expand' : 'Collapse'}
                        className="flex h-8 w-8 items-center justify-center rounded-[4px] transition-colors duration-150"
                        style={{ color: '#4A3F35' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A962' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#4A3F35' }}
                        onClick={() => toggleCategoryCollapsed(category._id)}>
                        <svg className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
                        </svg>
                      </button>

                      {/* Rename */}
                      <button type="button" title="Rename" disabled={saving}
                        className="flex h-8 w-8 items-center justify-center rounded-[4px] transition-colors duration-150 disabled:opacity-40"
                        style={{ color: '#9C8B7A' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A962' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#9C8B7A' }}
                        onClick={() => { setEditingCategoryId(category._id); setEditingCategoryName(category.name) }}>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.5 2.5a1.414 1.414 0 012 2L5 13H3v-2L11.5 2.5z" />
                        </svg>
                      </button>

                      {/* Move up */}
                      <button type="button" title="Move up" disabled={catIndex === 0 || saving}
                        className="flex h-8 w-8 items-center justify-center rounded-[4px] transition-colors duration-150 disabled:opacity-30"
                        style={{ color: '#9C8B7A' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A962' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#9C8B7A' }}
                        onClick={() => { if (saving || !data || catIndex === 0) return; const cats = [...data.categories]; const m = cats.splice(catIndex, 1)[0]; cats.splice(catIndex - 1, 0, m); setData((prev) => (prev ? { ...prev, categories: cats } : prev)); void reorderCategories(cats) }}>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12V4M4 8l4-4 4 4" /></svg>
                      </button>

                      {/* Move down */}
                      <button type="button" title="Move down" disabled={catIndex === data.categories.length - 1 || saving}
                        className="flex h-8 w-8 items-center justify-center rounded-[4px] transition-colors duration-150 disabled:opacity-30"
                        style={{ color: '#9C8B7A' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A962' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#9C8B7A' }}
                        onClick={() => { if (saving || !data || catIndex === data.categories.length - 1) return; const cats = [...data.categories]; const m = cats.splice(catIndex, 1)[0]; cats.splice(catIndex + 1, 0, m); setData((prev) => (prev ? { ...prev, categories: cats } : prev)); void reorderCategories(cats) }}>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 4v8m4-4l-4 4-4-4" /></svg>
                      </button>

                      <span className="mx-1 h-5 w-px" style={{ backgroundColor: '#4A3F35' }} aria-hidden="true" />

                      {/* Add item */}
                      <button type="button" title="Add item" disabled={saving}
                        className="flex h-8 items-center gap-1.5 rounded-[4px] px-3 text-[11px] tracking-[0.1em] uppercase transition-all duration-150 disabled:opacity-60"
                        style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(180deg, #D4B872 0%, #C9A962 50%, #B8953F 100%)', color: '#1C1714' }}
                        onClick={() => setAddingItemForCategory({ _id: category._id, name: category.name })}>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 3v10M3 8h10" /></svg>
                        <span className="hidden sm:inline">Add Item</span>
                      </button>

                      {/* Delete category */}
                      <button type="button" title="Delete category" disabled={saving}
                        className="flex h-8 w-8 items-center justify-center rounded-[4px] transition-colors duration-150 disabled:opacity-40"
                        style={{ color: '#4A3F35' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#8B2635' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#4A3F35' }}
                        onClick={() => setPendingDelete({ type: 'category', id: category._id, name: category.name })}>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4h10M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" /></svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Items list */}
                <div className="text-xs">
                  <div
                    className={`overflow-hidden transform-gpu origin-top transition-all duration-200 ease-out ${
                      isCollapsed
                        ? 'max-h-0 scale-y-95 opacity-0 pointer-events-none'
                        : 'max-h-[1200px] scale-y-100 opacity-100'
                    }`}
                  >
                    {category.items && category.items.length > 0 ? (
                      <div className="rounded-[4px]" style={{ border: '1px solid #4A3F35' }}>
                        <div style={{ borderTop: '0' }}>
                          {category.items.map((item, itemIndex) => (
                        <div
                          key={item._id}
                          className={`relative flex flex-col gap-2 px-3 py-2.5 transition-colors duration-150 sm:flex-row sm:items-center sm:justify-between touch-manipulation ${openActionsItemId === item._id ? 'z-20' : ''}`}
                          style={{
                            backgroundColor: dragItemState?.categoryId === category._id && dragItemState?.index === itemIndex ? 'rgba(201,169,98,0.08)' : item.available === false ? 'rgba(139,38,53,0.06)' : 'transparent',
                            borderBottom: itemIndex < category.items.length - 1 ? '1px solid #3D332B' : 'none',
                            borderLeft: item.available === false ? '3px solid rgba(139,38,53,0.5)' : '3px solid transparent',
                          }}
                          draggable
                          onDragStart={(e) => {
                            if (saving) return
                            e.dataTransfer.effectAllowed = 'move'
                            setDragItemState({ categoryId: category._id, index: itemIndex })
                          }}
                          onDragOver={(e) => {
                            if (
                              !dragItemState ||
                              dragItemState.categoryId !== category._id ||
                              dragItemState.index === itemIndex
                            ) {
                              return
                            }
                            e.preventDefault()
                            handleAutoScroll(e.clientY)
                            setData((prev) => {
                              if (!prev) return prev
                              const categories = prev.categories.map((cat) => {
                                if (cat._id !== category._id || !cat.items) return cat
                                const items = [...cat.items]
                                const moved = items.splice(dragItemState.index, 1)[0]
                                items.splice(itemIndex, 0, moved)
                                return { ...cat, items }
                              })
                              return { ...prev, categories }
                            })
                            setDragItemState({ categoryId: category._id, index: itemIndex })
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            if (
                              dragItemState &&
                              dragItemState.categoryId === category._id &&
                              !saving
                            ) {
                              const updatedCategory = data.categories.find(
                                (c) => c._id === category._id
                              )
                              if (updatedCategory && updatedCategory.items) {
                                void reorderItems(category._id, updatedCategory.items)
                              }
                            }
                            setDragItemState(null)
                          }}
                          onDragEnd={() => setDragItemState(null)}
                        >
                          {/* Left: image, title/description, tags */}
                          <div className="flex flex-1 flex-col gap-2">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 hidden h-5 w-5 flex-shrink-0 items-center justify-center text-[9px] sm:flex" style={{ color: '#4A3F35' }}>
                                ⋮⋮
                              </div>
                              {item.imageUrl && (
                                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-[4px]" style={{ border: '1px solid #4A3F35' }}>
                                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover img-sepia" />
                                </div>
                              )}
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <div className="truncate text-sm" style={{ fontFamily: 'var(--font-heading)', color: item.available === false ? '#4A3F35' : '#E8DFD4', fontWeight: 400, textDecoration: item.available === false ? 'line-through' : 'none' }}>
                                    {item.name}
                                  </div>
                                  {item.available === false && (
                                    <span className="shrink-0 rounded-[2px] px-1.5 py-0.5 text-[9px] tracking-[0.1em] uppercase" style={{ fontFamily: 'var(--font-display)', backgroundColor: 'rgba(139,38,53,0.2)', color: '#C07080', border: '1px solid rgba(139,38,53,0.3)' }}>
                                      Unavailable
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] leading-snug" style={{ fontFamily: 'var(--font-body)', color: item.available === false ? '#3D332B' : '#9C8B7A' }}>
                                  {item.description}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(item.tags?.length ?? 0) > 0 || (item.allergens?.length ?? 0) > 0 ? (
                                <>
                                  {item.tags?.map((tag) => (
                                    <span key={tag} className="rounded-[4px] px-2 py-0.5 text-[10px]" style={{ backgroundColor: 'rgba(201,169,98,0.12)', color: '#C9A962', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
                                      {tag}
                                    </span>
                                  ))}
                                  {item.allergens?.map((allergen) => (
                                    <span key={allergen} className="rounded-[4px] px-2 py-0.5 text-[10px]" style={{ backgroundColor: 'rgba(139,38,53,0.12)', color: '#C07080', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
                                      {allergen}
                                    </span>
                                  ))}
                                </>
                              ) : (
                                <span className="text-[10px] italic" style={{ fontFamily: 'var(--font-body)', color: '#4A3F35' }}>
                                  No tags or allergens set
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: price and actions dropdown */}
                          <div className="mt-2 flex items-center justify-between gap-2 sm:mt-0 sm:w-auto sm:flex-col sm:items-end">
                            <div className="flex items-center gap-1 rounded-[4px] px-2.5 py-1 text-[11px]" style={{ fontFamily: 'var(--font-display)', background: item.available === false ? 'none' : 'linear-gradient(180deg, #D4B872 0%, #B8953F 100%)', backgroundColor: item.available === false ? '#3D332B' : undefined, color: item.available === false ? '#4A3F35' : '#1C1714', letterSpacing: '0.05em', textDecoration: item.available === false ? 'line-through' : 'none' }}>
                              <span>{currencySymbol}</span>
                              <span>{item.price.toFixed(2)}</span>
                            </div>
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="rounded-[4px] px-3 py-1.5 text-[10px] tracking-widest uppercase transition-colors duration-150"
                                style={{ fontFamily: 'var(--font-display)', border: '1px solid #4A3F35', color: '#9C8B7A', backgroundColor: 'transparent' }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A962'; e.currentTarget.style.borderColor = 'rgba(201,169,98,0.5)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = '#9C8B7A'; e.currentTarget.style.borderColor = '#4A3F35' }}
                                onClick={() => setOpenActionsItemId((prev) => prev === item._id ? null : item._id)}
                              >
                                Actions
                              </button>
                              {openActionsItemId === item._id && (
                                <div className="absolute right-0 z-30 mt-1 w-40 rounded-[4px] py-1 text-[11px]" style={{ backgroundColor: '#251E19', border: '1px solid #4A3F35', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                  <button
                                    type="button"
                                    className="block w-full px-3 py-2 text-left transition-colors duration-100 disabled:opacity-60"
                                    style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A962'; e.currentTarget.style.backgroundColor = 'rgba(201,169,98,0.07)' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = '#9C8B7A'; e.currentTarget.style.backgroundColor = 'transparent' }}
                                    disabled={saving}
                                    onClick={() => {
                                      if (saving) return
                                      const next = !(item.available ?? true)
                                      setSaving(true)
                                      void (async () => {
                                        try {
                                          const res = await fetch(
                                            `${API_BASE}/api/items/${item._id}`,
                                            {
                                              method: 'PATCH',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                ...(token
                                                  ? { Authorization: `Bearer ${token}` }
                                                  : {}),
                                              },
                                              body: JSON.stringify({ available: next }),
                                            }
                                          )
                                          if (!res.ok) {
                                            const json = (await res.json()) as { message?: string }
                                            throw new Error(
                                              json.message ?? 'Failed to update availability'
                                            )
                                          }
                                          setData((prev) =>
                                            prev
                                              ? {
                                                  ...prev,
                                                  categories: prev.categories.map((cat) =>
                                                    cat._id === category._id
                                                      ? {
                                                          ...cat,
                                                          items: cat.items.map((it) =>
                                                            it._id === item._id
                                                              ? { ...it, available: next }
                                                              : it
                                                          ),
                                                        }
                                                      : cat
                                                  ),
                                                }
                                              : prev
                                          )
                                        } catch (err) {
                                          // eslint-disable-next-line no-alert
                                          alert((err as Error).message)
                                        } finally {
                                          setSaving(false)
                                          setOpenActionsItemId(null)
                                        }
                                      })()
                                    }}
                                  >
                                    {item.available === false ? 'Mark available' : 'Mark unavailable'}
                                  </button>
                                  <button
                                    type="button"
                                    className="block w-full px-3 py-2 text-left transition-colors duration-100 disabled:opacity-60"
                                    style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A962'; e.currentTarget.style.backgroundColor = 'rgba(201,169,98,0.07)' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = '#9C8B7A'; e.currentTarget.style.backgroundColor = 'transparent' }}
                                    disabled={saving}
                                    onClick={() => { setEditingItem({ item, categoryId: category._id }); setOpenActionsItemId(null) }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="block w-full px-3 py-2 text-left transition-colors duration-100 disabled:opacity-60"
                                    style={{ fontFamily: 'var(--font-body)', color: '#C07080' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = '#E88090'; e.currentTarget.style.backgroundColor = 'rgba(139,38,53,0.1)' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = '#C07080'; e.currentTarget.style.backgroundColor = 'transparent' }}
                                    disabled={saving}
                                    onClick={() => { setPendingDelete({ type: 'item', id: item._id, name: item.name }); setOpenActionsItemId(null) }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] italic px-1 py-2" style={{ fontFamily: 'var(--font-body)', color: '#4A3F35' }}>
                        No items in this category yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </section>

        {bulkImportOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto overscroll-contain sm:items-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <div className="w-full max-w-lg rounded-[4px] p-5 my-4 sm:my-0" style={{ backgroundColor: '#1C1714', border: '1px solid #4A3F35', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
              <span className="overline-volume">Bulk Import</span>
              <h2 className="mt-1 text-xl" style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}>Import from Text</h2>
              <p className="mt-2 text-xs leading-relaxed" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
                Paste your menu text below. A line without a dash is a category name.
                A line like <span className="font-mono" style={{ color: '#C9A962' }}>Pinko — ₪53</span> is treated as an item.
              </p>
              <textarea
                className="input-academia mt-3 w-full font-mono leading-relaxed"
                style={{ minHeight: '180px', fontSize: '12px' }}
                placeholder={`Cocktails\nPinko — ₪53\nNigori Mule — ₪58\n\nDesserts\nChocolate Fondant — ₪42`}
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                disabled={bulkImportProgress !== null}
              />

              {/* Live preview */}
              {(() => {
                if (!bulkImportText.trim()) return null
                const parsed = parseBulkMenuText(bulkImportText)
                if (parsed.length === 0) {
                  return (
                    <p className="mt-2 text-[11px] italic" style={{ fontFamily: 'var(--font-body)', color: '#B8953F' }}>
                      No valid entries detected yet. Ensure items use a dash (—) separator.
                    </p>
                  )
                }
                const totalItems = parsed.reduce((s, c) => s + c.items.length, 0)
                return (
                  <div className="mt-3 rounded-[4px] px-3 py-2 space-y-2 max-h-52 overflow-y-auto" style={{ border: '1px solid rgba(201,169,98,0.25)', backgroundColor: 'rgba(201,169,98,0.06)' }}>
                    <p className="text-[11px]" style={{ fontFamily: 'var(--font-display)', color: '#C9A962', letterSpacing: '0.08em' }}>
                      PREVIEW — {parsed.length} {parsed.length === 1 ? 'CATEGORY' : 'CATEGORIES'}, {totalItems} {totalItems === 1 ? 'ITEM' : 'ITEMS'}
                    </p>
                    {parsed.map((cat, i) => (
                      <div key={i}>
                        <p className="text-[11px]" style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4' }}>{cat.categoryName}</p>
                        <ul className="mt-0.5 space-y-0.5 pl-3">
                          {cat.items.map((item, j) => (
                            <li key={j} className="text-[10px] flex justify-between" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
                              <span>{item.name}</span>
                              <span style={{ color: '#C9A962' }}>{currencySymbol}{item.price.toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Progress */}
              {bulkImportProgress !== null && (
                <div className="mt-3 rounded-[4px] px-3 py-2" style={{ border: '1px solid #4A3F35', backgroundColor: 'rgba(201,169,98,0.05)' }}>
                  <p className="text-[11px]" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
                    Importing… {bulkImportProgress.done} / {bulkImportProgress.total} items
                  </p>
                  <div className="mt-1.5 h-1 w-full rounded-full" style={{ backgroundColor: '#3D332B' }}>
                    <div
                      className="h-1 rounded-full transition-all"
                      style={{
                        background: 'linear-gradient(90deg, #B8953F, #C9A962)',
                        width: `${bulkImportProgress.total > 0 ? (bulkImportProgress.done / bulkImportProgress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button type="button" className="btn-outline" disabled={bulkImportProgress !== null}
                  onClick={() => { setBulkImportOpen(false); setBulkImportText(''); setBulkImportProgress(null) }}>
                  Cancel
                </button>
                <button type="button" className="btn-brass"
                  disabled={saving || bulkImportProgress !== null || !bulkImportText.trim() || parseBulkMenuText(bulkImportText).length === 0}
                  onClick={() => { const parsed = parseBulkMenuText(bulkImportText); if (parsed.length === 0) return; void bulkImport(parsed) }}>
                  {bulkImportProgress !== null
                    ? `Importing… (${bulkImportProgress.done}/${bulkImportProgress.total})`
                    : (() => {
                        const parsed = parseBulkMenuText(bulkImportText)
                        if (!bulkImportText.trim() || parsed.length === 0) return 'Import'
                        const totalItems = parsed.reduce((s, c) => s + c.items.length, 0)
                        return `Import ${totalItems} Item${totalItems === 1 ? '' : 's'}`
                      })()}
                </button>
              </div>
            </div>
          </div>
        )}
        {pendingDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <div className="w-full max-w-sm rounded-[4px] p-5 my-auto" style={{ backgroundColor: '#1C1714', border: '1px solid #4A3F35', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
              <span className="overline-volume">Confirm</span>
              <h2 className="mt-1 text-xl" style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}>Delete {pendingDelete.type === 'category' ? 'Section' : 'Item'}?</h2>
              <p className="mt-3 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
                {pendingDelete.type === 'category'
                  ? `This will permanently remove the section "${pendingDelete.name}" and all its items. This action cannot be undone.`
                  : `This will permanently remove "${pendingDelete.name}" from the menu.`}
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" className="btn-outline" disabled={saving} onClick={() => setPendingDelete(null)}>
                  Cancel
                </button>
                <button type="button" className="btn-danger" disabled={saving}
                  onClick={() => { if (!pendingDelete) return; if (pendingDelete.type === 'category') { void deleteCategory(pendingDelete.id) } else { void deleteItem(pendingDelete.id) }; setPendingDelete(null) }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        {addingItemForCategory && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto overscroll-contain sm:items-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <div className="w-full max-w-md rounded-[4px] p-5 my-4 sm:my-0 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#1C1714', border: '1px solid #4A3F35', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
              <span className="overline-volume">New Entry</span>
              <h2 className="mt-1 text-xl" style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}>Add Item</h2>
              <p className="mt-1 text-xs italic" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
                Adding to <span style={{ color: '#C9A962' }}>{addingItemForCategory.name}</span>
              </p>
              <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); if (!addingItemForCategory) return; const form = e.currentTarget; const formData = new FormData(form); if (!newItemImagePreview) formData.delete('image'); void (async () => { const ok = await addItem(addingItemForCategory._id, formData); if (ok) { setNewItemImagePreview(null); setAddingItemForCategory(null) } })() }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input name="name" required className="input-academia" style={{ height: '2.75rem', fontSize: '13px', flex: '1 1 0', minWidth: 0 }} placeholder="Item name" />
                  <input name="price" type="number" min={0.01} step="0.01" className="input-academia" style={{ height: '2.75rem', fontSize: '13px', textAlign: 'right', width: '96px', flexShrink: 0 }} placeholder="Price" />
                </div>
                <textarea name="description" rows={2} required className="input-academia w-full" style={{ minHeight: '72px', fontSize: '13px' }} placeholder="Short description" />
                <div className="space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="label-academia">Allergens</span>
                    <div className="flex flex-wrap gap-1">
                      {DEFAULT_ALLERGENS.map((allergen) => (
                        <label key={allergen} className="inline-flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-[10px] cursor-pointer transition-colors duration-150" style={{ border: '1px solid #4A3F35', color: '#9C8B7A', fontFamily: 'var(--font-body)' }}>
                          <input type="checkbox" name="allergenDefaults" value={allergen} className="h-3 w-3" style={{ accentColor: '#C9A962' }} />
                          <span>{allergen}</span>
                        </label>
                      ))}
                    </div>
                    <input name="allergensCustom" className="input-academia" style={{ height: '2.5rem', fontSize: '12px' }} placeholder="Custom allergens (comma separated)" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="label-academia">Tags</span>
                    <div className="flex flex-wrap gap-1">
                      {DEFAULT_TAGS.map((tag) => (
                        <label key={tag} className="inline-flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-[10px] cursor-pointer transition-colors duration-150" style={{ border: '1px solid #4A3F35', color: '#9C8B7A', fontFamily: 'var(--font-body)' }}>
                          <input type="checkbox" name="tagDefaults" value={tag} className="h-3 w-3" style={{ accentColor: '#C9A962' }} />
                          <span>{tag}</span>
                        </label>
                      ))}
                    </div>
                    <input name="tagsCustom" className="input-academia" style={{ height: '2.5rem', fontSize: '12px' }} placeholder="Custom tags (comma separated)" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="label-academia">Item Photo (optional)</span>
                    <label className="flex cursor-pointer items-center gap-3 rounded-[4px] px-3 py-2.5 transition-colors duration-150" style={{ border: '1px dashed #4A3F35', backgroundColor: 'rgba(201,169,98,0.03)' }}>
                      <div className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[9px]" style={{ backgroundColor: '#3D332B', color: '#9C8B7A', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
                        IMG
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px]" style={{ fontFamily: 'var(--font-body)', color: '#E8DFD4' }}>Upload item image</span>
                        <span className="text-[10px]" style={{ color: '#9C8B7A' }}>Square · max 5MB</span>
                        {newItemImagePreview && <span className="mt-0.5 text-[10px]" style={{ color: '#C9A962' }}>Preview below</span>}
                      </div>
                      <input type="file" name="image" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; setNewItemImagePreview(f ? URL.createObjectURL(f) : null) }} />
                    </label>
                    {newItemImagePreview && (
                      <div className="flex items-center gap-3 rounded-[4px] px-3 py-2" style={{ border: '1px solid #4A3F35', backgroundColor: '#251E19' }}>
                        <div className="h-12 w-12 overflow-hidden rounded-[4px]" style={{ border: '1px solid #4A3F35' }}>
                          <img src={newItemImagePreview} alt="Preview" className="h-full w-full object-cover img-sepia" />
                        </div>
                        <button type="button" className="text-[11px] transition-colors duration-150" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#C07080' }} onMouseLeave={(e) => { e.currentTarget.style.color = '#9C8B7A' }} onClick={() => setNewItemImagePreview(null)}>
                          Remove image
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" className="btn-outline" disabled={saving} onClick={() => setAddingItemForCategory(null)}>Cancel</button>
                  <button type="submit" className="btn-brass" disabled={saving}>Add Item</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto overscroll-contain sm:items-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <div className="w-full max-w-md rounded-[4px] p-5 my-4 sm:my-0 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#1C1714', border: '1px solid #4A3F35', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
              <span className="overline-volume">Edit Entry</span>
              <h2 className="mt-1 text-xl" style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}>Edit Item</h2>
              <p className="mt-1 text-xs italic" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
                Editing <span style={{ color: '#C9A962' }}>{editingItem.item.name}</span>
              </p>
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!editingItem) return
                  const formData = new FormData(e.currentTarget)
                  if (!editItemImagePreview) formData.delete('image')
                  void (async () => { await updateItemDetails(editingItem.item._id, formData); setEditItemImagePreview(null); setEditingItem(null) })()
                }}
              >
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input name="name" required defaultValue={editingItem.item.name} className="input-academia" style={{ height: '2.75rem', fontSize: '13px', flex: '1 1 0', minWidth: 0 }} placeholder="Item name" />
                  <input name="price" type="number" min={0.01} step="0.01" defaultValue={editingItem.item.price.toFixed(2)} className="input-academia" style={{ height: '2.75rem', fontSize: '13px', textAlign: 'right', width: '96px', flexShrink: 0 }} placeholder="Price" />
                </div>
                <textarea name="description" rows={2} required defaultValue={editingItem.item.description} className="input-academia w-full" style={{ minHeight: '72px', fontSize: '13px' }} placeholder="Short description" />
                <div className="space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="label-academia">Allergens</span>
                    <div className="flex flex-wrap gap-1">
                      {DEFAULT_ALLERGENS.map((allergen) => (
                        <label key={allergen} className="inline-flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-[10px] cursor-pointer" style={{ border: '1px solid #4A3F35', color: '#9C8B7A', fontFamily: 'var(--font-body)' }}>
                          <input type="checkbox" name="allergenDefaults" value={allergen} defaultChecked={editingItem.item.allergens.includes(allergen)} className="h-3 w-3" style={{ accentColor: '#C9A962' }} />
                          <span>{allergen}</span>
                        </label>
                      ))}
                    </div>
                    <input name="allergensCustom" defaultValue={editingItem.item.allergens.filter((a) => !DEFAULT_ALLERGENS.includes(a)).join(', ')} className="input-academia" style={{ height: '2.5rem', fontSize: '12px' }} placeholder="Custom allergens (comma separated)" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="label-academia">Tags</span>
                    <div className="flex flex-wrap gap-1">
                      {DEFAULT_TAGS.map((tag) => (
                        <label key={tag} className="inline-flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-[10px] cursor-pointer" style={{ border: '1px solid #4A3F35', color: '#9C8B7A', fontFamily: 'var(--font-body)' }}>
                          <input type="checkbox" name="tagDefaults" value={tag} defaultChecked={editingItem.item.tags.includes(tag)} className="h-3 w-3" style={{ accentColor: '#C9A962' }} />
                          <span>{tag}</span>
                        </label>
                      ))}
                    </div>
                    <input name="tagsCustom" defaultValue={editingItem.item.tags.filter((t) => !DEFAULT_TAGS.includes(t)).join(', ')} className="input-academia" style={{ height: '2.5rem', fontSize: '12px' }} placeholder="Custom tags (comma separated)" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="label-academia">Item Photo</span>
                    <label className="flex cursor-pointer items-center gap-3 rounded-[4px] px-3 py-2.5 transition-colors duration-150" style={{ border: '1px dashed #4A3F35', backgroundColor: 'rgba(201,169,98,0.03)' }}>
                      <div className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[9px]" style={{ backgroundColor: '#3D332B', color: '#9C8B7A', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
                        IMG
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px]" style={{ fontFamily: 'var(--font-body)', color: '#E8DFD4' }}>{editingItem.item.imageUrl ? 'Change image' : 'Upload image'}</span>
                        <span className="text-[10px]" style={{ color: '#9C8B7A' }}>Square · max 5MB</span>
                        {editItemImagePreview && <span className="mt-0.5 text-[10px]" style={{ color: '#C9A962' }}>Preview below</span>}
                      </div>
                      <input type="file" name="image" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; setEditItemImagePreview(f ? URL.createObjectURL(f) : null) }} />
                    </label>
                    {(editingItem.item.imageUrl || editItemImagePreview) && (
                      <div className="flex items-center gap-3 rounded-[4px] px-3 py-2" style={{ border: '1px solid #4A3F35', backgroundColor: '#251E19' }}>
                        <div className="h-12 w-12 overflow-hidden rounded-[4px]" style={{ border: '1px solid #4A3F35' }}>
                          <img src={editItemImagePreview ?? editingItem.item.imageUrl ?? ''} alt="Preview" className="h-full w-full object-cover img-sepia" />
                        </div>
                        {editItemImagePreview && (
                          <button type="button" className="text-[11px] transition-colors duration-150" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#C07080' }} onMouseLeave={(e) => { e.currentTarget.style.color = '#9C8B7A' }} onClick={() => setEditItemImagePreview(null)}>
                            Remove new image
                          </button>
                        )}
                      </div>
                    )}
                    {editingItem.item.imageUrl && !editItemImagePreview && (
                      <label className="mt-1 inline-flex items-center gap-2 text-[11px] cursor-pointer" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
                        <input type="checkbox" name="removeImage" className="h-3 w-3" style={{ accentColor: '#C9A962' }} />
                        <span>Remove existing image</span>
                      </label>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="label-academia">Availability</span>
                    <label className="inline-flex items-center gap-2 text-[11px] cursor-pointer" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
                      <input type="checkbox" name="available" defaultChecked={editingItem.item.available ?? true} className="h-3 w-3" style={{ accentColor: '#C9A962' }} />
                      <span>Item available for ordering</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" className="btn-outline" disabled={saving} onClick={() => setEditingItem(null)}>Cancel</button>
                  <button type="submit" className="btn-brass" disabled={saving}>Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

