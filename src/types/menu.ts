export type MenuCategory = {
  id: string
  name: string
}

export type MenuItem = {
  id: string
  name: string
  priceCents: number
  description?: string
  imageUrl?: string
  categoryId: string
}

export type MenuData = {
  categories: MenuCategory[]
  items: MenuItem[]
}
