"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, Edit, Trash2, Hash, Folder, FolderOpen, ImageIcon, Upload, ShoppingBag, DollarSign } from "lucide-react"
import Image from "next/image"

interface MarketplaceCategory {
  id: string
  name: string
  slug: string
  description?: string
  logo?: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  subcategories: MarketplaceSubcategory[]
}

interface MarketplaceSubcategory {
  id: string
  categoryId: string
  name: string
  slug: string
  description?: string
  logo?: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  services: MarketplaceService[]
}

interface MarketplaceService {
  id: string
  subcategoryId: string
  name: string
  slug: string
  description?: string
  price: number
  deliveryTime: {
    value: number
    unit: "instant" | "minutes" | "hours" | "days"
  }
  revisionsIncluded: number // 0 = no revisions, -1 = unlimited
  images: string[] // Required - at least 1 image
  videoThumbnail?: {
    type: "youtube" | "vimeo" | "direct"
    url: string
  }
  sortOrder: number
  isActive: boolean
  createdAt: string
}

export default function AdminMarketplaceCategoriesPage() {
  const [categories, setCategories] = useState<MarketplaceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<MarketplaceCategory | null>(null)
  const [editingSubcategory, setEditingSubcategory] = useState<MarketplaceSubcategory | null>(null)
  const [editingService, setEditingService] = useState<MarketplaceService | null>(null)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false)
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false)

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
    logo: "",
    sortOrder: "0",
  })

  const [subcategoryForm, setSubcategoryForm] = useState({
    categoryId: "",
    name: "",
    slug: "",
    description: "",
    logo: "",
    sortOrder: "0",
  })

  const [serviceForm, setServiceForm] = useState({
    subcategoryId: "",
    name: "",
    slug: "",
    description: "",
    price: "",
    sortOrder: "0",
  })

  useEffect(() => {
    console.log("[v0] Force clearing old marketplace categories data...")
    localStorage.removeItem("marketplace_categories")
    initializeDefaultCategories()
    loadCategories()
  }, [])

  const loadCategories = () => {
    try {
      setLoading(true)
      const stored = localStorage.getItem("marketplace_categories")
      console.log("[v0] Current localStorage data:", stored)
      let data: MarketplaceCategory[] = []

      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          console.log("[v0] Parsed categories count:", Array.isArray(parsed) ? parsed.length : "Not an array")
          // Ensure parsed data is an array and has proper structure
          if (Array.isArray(parsed)) {
            data = parsed.map((cat) => ({
              ...cat,
              subcategories: Array.isArray(cat.subcategories)
                ? cat.subcategories.map((sub) => ({
                    ...sub,
                    services: Array.isArray(sub.services) ? sub.services : [],
                  }))
                : [],
            }))
          }
        } catch (parseError) {
          console.error("Failed to parse marketplace categories:", parseError)
          // Reset corrupted data
          localStorage.removeItem("marketplace_categories")
        }
      }

      setCategories(data)
    } catch (error) {
      console.error("Failed to load marketplace categories:", error)
      toast.error("Failed to load marketplace categories")
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const saveCategories = (updatedCategories: MarketplaceCategory[]) => {
    try {
      const validCategories = Array.isArray(updatedCategories) ? updatedCategories : []
      localStorage.setItem("marketplace_categories", JSON.stringify(validCategories))
      setCategories(validCategories)
    } catch (error) {
      console.error("Failed to save categories:", error)
      toast.error("Failed to save categories")
    }
  }

  const handleCreateCategory = () => {
    try {
      const newCategory: MarketplaceCategory = {
        id: Date.now().toString(),
        name: categoryForm.name,
        slug: categoryForm.slug,
        description: categoryForm.description,
        logo: categoryForm.logo,
        sortOrder: Number.parseInt(categoryForm.sortOrder),
        isActive: true,
        createdAt: new Date().toISOString(),
        subcategories: [],
      }

      const updatedCategories = [...categories, newCategory]
      saveCategories(updatedCategories)

      toast.success("Marketplace category created successfully")
      resetCategoryDialog()
    } catch (error) {
      console.error("Failed to create marketplace category:", error)
      toast.error("Failed to create marketplace category")
    }
  }

  const handleUpdateCategory = () => {
    if (!editingCategory) return

    try {
      const updatedCategories = categories.map((cat) =>
        cat.id === editingCategory.id
          ? {
              ...cat,
              name: categoryForm.name,
              slug: categoryForm.slug,
              description: categoryForm.description,
              logo: categoryForm.logo,
              sortOrder: Number.parseInt(categoryForm.sortOrder),
            }
          : cat,
      )

      saveCategories(updatedCategories)
      toast.success("Marketplace category updated successfully")
      resetCategoryDialog()
    } catch (error) {
      console.error("Failed to update marketplace category:", error)
      toast.error("Failed to update marketplace category")
    }
  }

  const handleDeleteCategory = (id: string) => {
    if (!confirm("Are you sure you want to delete this marketplace category?")) return

    try {
      const updatedCategories = categories.filter((cat) => cat.id !== id)
      saveCategories(updatedCategories)
      toast.success("Marketplace category deleted successfully")
    } catch (error) {
      console.error("Failed to delete marketplace category:", error)
      toast.error("Failed to delete marketplace category")
    }
  }

  const handleCreateSubcategory = () => {
    try {
      const newSubcategory: MarketplaceSubcategory = {
        id: Date.now().toString(),
        categoryId: subcategoryForm.categoryId,
        name: subcategoryForm.name,
        slug: subcategoryForm.slug,
        description: subcategoryForm.description,
        logo: subcategoryForm.logo,
        sortOrder: Number.parseInt(subcategoryForm.sortOrder),
        isActive: true,
        createdAt: new Date().toISOString(),
        services: [],
      }

      const updatedCategories = categories.map((cat) =>
        cat.id === subcategoryForm.categoryId
          ? {
              ...cat,
              subcategories: Array.isArray(cat.subcategories)
                ? [...cat.subcategories, newSubcategory]
                : [newSubcategory],
            }
          : cat,
      )

      saveCategories(updatedCategories)
      toast.success("Marketplace subcategory created successfully")
      resetSubcategoryDialog()
    } catch (error) {
      console.error("Failed to create marketplace subcategory:", error)
      toast.error("Failed to create marketplace subcategory")
    }
  }

  const handleUpdateSubcategory = () => {
    if (!editingSubcategory) return

    try {
      const updatedCategories = categories.map((cat) => ({
        ...cat,
        subcategories: Array.isArray(cat.subcategories)
          ? cat.subcategories.map((sub) =>
              sub.id === editingSubcategory.id
                ? {
                    ...sub,
                    name: subcategoryForm.name,
                    slug: subcategoryForm.slug,
                    description: subcategoryForm.description,
                    logo: subcategoryForm.logo,
                    sortOrder: Number.parseInt(subcategoryForm.sortOrder),
                  }
                : sub,
            )
          : [],
      }))

      saveCategories(updatedCategories)
      toast.success("Marketplace subcategory updated successfully")
      resetSubcategoryDialog()
    } catch (error) {
      console.error("Failed to update marketplace subcategory:", error)
      toast.error("Failed to update marketplace subcategory")
    }
  }

  const handleDeleteSubcategory = (id: string) => {
    if (!confirm("Are you sure you want to delete this marketplace subcategory?")) return

    try {
      const updatedCategories = categories.map((cat) => ({
        ...cat,
        subcategories: Array.isArray(cat.subcategories) ? cat.subcategories.filter((sub) => sub.id !== id) : [],
      }))

      saveCategories(updatedCategories)
      toast.success("Marketplace subcategory deleted successfully")
    } catch (error) {
      console.error("Failed to delete marketplace subcategory:", error)
      toast.error("Failed to delete marketplace subcategory")
    }
  }

  const startEditCategory = (category: MarketplaceCategory) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      logo: category.logo || "",
      sortOrder: category.sortOrder.toString(),
    })
    setCategoryDialogOpen(true)
  }

  const startEditSubcategory = (subcategory: MarketplaceSubcategory) => {
    setEditingSubcategory(subcategory)
    setSubcategoryForm({
      categoryId: subcategory.categoryId,
      name: subcategory.name,
      slug: subcategory.slug,
      description: subcategory.description || "",
      logo: subcategory.logo || "",
      sortOrder: subcategory.sortOrder.toString(),
    })
    setSubcategoryDialogOpen(true)
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>, isSubcategory = false) => {
    const file = event.target.files?.[0]
    if (file) {
      // Create a blob URL for immediate preview
      const blobUrl = URL.createObjectURL(file)

      // Store in localStorage for persistence
      const logoStorage = JSON.parse(localStorage.getItem("marketplace_logo_storage") || "{}")
      const logoKey = `logo_${Date.now()}_${file.name}`
      logoStorage[logoKey] = blobUrl
      localStorage.setItem("marketplace_logo_storage", JSON.stringify(logoStorage))

      if (isSubcategory) {
        setSubcategoryForm((prev) => ({ ...prev, logo: blobUrl }))
      } else {
        setCategoryForm((prev) => ({ ...prev, logo: blobUrl }))
      }

      toast.success("Logo uploaded successfully")
    }
  }

  const resetCategoryDialog = () => {
    setEditingCategory(null)
    setCategoryForm({
      name: "",
      slug: "",
      description: "",
      logo: "",
      sortOrder: "0",
    })
    setCategoryDialogOpen(false)
  }

  const resetSubcategoryDialog = () => {
    setEditingSubcategory(null)
    setSubcategoryForm({
      categoryId: "",
      name: "",
      slug: "",
      description: "",
      logo: "",
      sortOrder: "0",
    })
    setSubcategoryDialogOpen(false)
  }

  const startCreateService = (subcategoryId: string) => {
    setEditingService(null)
    setServiceForm({
      subcategoryId,
      name: "",
      slug: "",
      description: "",
      price: "",
      sortOrder: "0",
    })
    setServiceDialogOpen(true)
  }

  const startEditService = (service: MarketplaceService) => {
    setEditingService(service)
    setServiceForm({
      subcategoryId: service.subcategoryId,
      name: service.name,
      slug: service.slug,
      description: service.description || "",
      price: service.price?.toString() || "",
      sortOrder: service.sortOrder.toString(),
    })
    setServiceDialogOpen(true)
  }

  const handleSaveService = () => {
    if (!serviceForm.name.trim()) {
      toast.error("Service name is required")
      return
    }

    if (!serviceForm.price || Number.parseFloat(serviceForm.price) <= 0) {
      toast.error("Valid price is required")
      return
    }

    console.log("[v0] Saving service:", serviceForm)

    const serviceData: MarketplaceService = {
      id: editingService?.id || `service-${Date.now()}`,
      subcategoryId: serviceForm.subcategoryId,
      name: serviceForm.name.trim(),
      slug: serviceForm.slug.trim() || serviceForm.name.toLowerCase().replace(/\s+/g, "-"),
      description: serviceForm.description.trim(),
      price: Number.parseFloat(serviceForm.price),
      deliveryTime: {
        value: 1,
        unit: "days",
      },
      revisionsIncluded: 1,
      images: ["/service-placeholder.png"],
      sortOrder: Number.parseInt(serviceForm.sortOrder) || 0,
      isActive: true,
      createdAt: editingService?.createdAt || new Date().toISOString(),
    }

    const updatedCategories = categories.map((category) => ({
      ...category,
      subcategories: category.subcategories.map((subcategory) => {
        if (subcategory.id === serviceForm.subcategoryId) {
          const services = subcategory.services || []
          if (editingService) {
            return {
              ...subcategory,
              services: services.map((s) => (s.id === editingService.id ? serviceData : s)),
            }
          } else {
            return {
              ...subcategory,
              services: [...services, serviceData],
            }
          }
        }
        return subcategory
      }),
    }))

    console.log("[v0] Updated categories with new service:", updatedCategories)
    setCategories(updatedCategories)
    localStorage.setItem("marketplace_categories", JSON.stringify(updatedCategories))
    setServiceDialogOpen(false)
    resetServiceForm()
    toast.success(editingService ? "Service updated successfully!" : "Service created successfully!")
  }

  const handleDeleteService = (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return

    const updatedCategories = categories.map((category) => ({
      ...category,
      subcategories: category.subcategories.map((subcategory) => ({
        ...subcategory,
        services: (subcategory.services || []).filter((s) => s.id !== serviceId),
      })),
    }))

    setCategories(updatedCategories)
    localStorage.setItem("marketplace_categories", JSON.stringify(updatedCategories))
    toast.success("Service deleted successfully")
  }

  const resetServiceForm = () => {
    setServiceForm({
      subcategoryId: "",
      name: "",
      slug: "",
      description: "",
      price: "",
      sortOrder: "0",
    })
  }

  const handleFilesChange = (files: File[]) => {
    setServiceForm((prev) => ({ ...prev, images: files }))
  }

  const toggleUnlimitedRevisions = () => {
    setServiceForm((prev) => ({
      ...prev,
      isUnlimitedRevisions: !prev.isUnlimitedRevisions,
      revisionsIncluded: !prev.isUnlimitedRevisions ? "" : prev.revisionsIncluded,
    }))
  }

  const initializeDefaultCategories = () => {
    console.log("[v0] Force initializing all 13 categories...")
    const defaultCategories: MarketplaceCategory[] = [
      {
        id: "graphics-design",
        name: "Graphics & Design",
        slug: "graphics-design",
        description: "Logo & Brand Identity, Art & Illustration, Web & App Design",
        logo: "/placeholder.svg?height=100&width=100&text=Graphics",
        sortOrder: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        subcategories: [
          {
            id: "logo-design",
            categoryId: "graphics-design",
            name: "Logo Design",
            slug: "logo-design",
            description: "Professional logo design services",
            logo: "/placeholder.svg?height=100&width=100&text=Logo",
            sortOrder: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "logo-design-service",
                subcategoryId: "logo-design",
                name: "Logo Design",
                slug: "logo-design-service",
                description: "Custom logo design services",
                price: 150,
                deliveryTime: { value: 3, unit: "days" },
                revisionsIncluded: -1,
                images: ["/placeholder.svg?height=300&width=400&text=Logo+Design"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
          {
            id: "brand-identity",
            categoryId: "graphics-design",
            name: "Brand Identity & Guidelines",
            slug: "brand-identity",
            description: "Complete brand identity packages",
            logo: "/placeholder.svg?height=100&width=100&text=Brand",
            sortOrder: 2,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "brand-package",
                subcategoryId: "brand-identity",
                name: "Brand Package",
                slug: "brand-package",
                description: "Complete brand identity package",
                price: 500,
                deliveryTime: { value: 7, unit: "days" },
                revisionsIncluded: 3,
                images: ["/placeholder.svg?height=300&width=400&text=Brand+Package"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
          {
            id: "web-app-design",
            categoryId: "graphics-design",
            name: "Web & App Design",
            slug: "web-app-design",
            description: "UI/UX design for websites and mobile apps",
            logo: "/placeholder.svg?height=100&width=100&text=Web",
            sortOrder: 3,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "ui-design",
                subcategoryId: "web-app-design",
                name: "UI Design",
                slug: "ui-design",
                description: "User interface design services",
                price: 300,
                deliveryTime: { value: 5, unit: "days" },
                revisionsIncluded: 3,
                images: ["/placeholder.svg?height=300&width=400&text=UI+Design"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
          {
            id: "print-design",
            categoryId: "graphics-design",
            name: "Print Design",
            slug: "print-design",
            description: "Flyers, brochures, and print materials",
            logo: "/placeholder.svg?height=100&width=100&text=Print",
            sortOrder: 4,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "flyer-design",
                subcategoryId: "print-design",
                name: "Flyer Design",
                slug: "flyer-design",
                description: "Professional flyer design",
                price: 75,
                deliveryTime: { value: 2, unit: "days" },
                revisionsIncluded: 2,
                images: ["/placeholder.svg?height=300&width=400&text=Flyer+Design"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ],
      },
      {
        id: "programming-tech",
        name: "Programming & Tech",
        slug: "programming-tech",
        description: "Website Development, Mobile Apps, Software Development",
        logo: "/placeholder.svg?height=100&width=100&text=Programming",
        sortOrder: 2,
        isActive: true,
        createdAt: new Date().toISOString(),
        subcategories: [
          {
            id: "website-development",
            categoryId: "programming-tech",
            name: "Website Development",
            slug: "website-development",
            description: "Full-stack web development services",
            logo: "/placeholder.svg?height=100&width=100&text=Web+Dev",
            sortOrder: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "website-dev-service",
                subcategoryId: "website-development",
                name: "Website Development",
                slug: "website-dev-service",
                description: "Custom website development",
                price: 800,
                deliveryTime: { value: 14, unit: "days" },
                revisionsIncluded: 3,
                images: ["/placeholder.svg?height=300&width=400&text=Website+Dev"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
          {
            id: "mobile-apps",
            categoryId: "programming-tech",
            name: "Mobile Apps",
            slug: "mobile-apps",
            description: "iOS and Android app development",
            logo: "/placeholder.svg?height=100&width=100&text=Mobile",
            sortOrder: 2,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "mobile-app-dev",
                subcategoryId: "mobile-apps",
                name: "Mobile App Development",
                slug: "mobile-app-dev",
                description: "Native mobile app development",
                price: 1500,
                deliveryTime: { value: 30, unit: "days" },
                revisionsIncluded: 5,
                images: ["/placeholder.svg?height=300&width=400&text=Mobile+App"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ],
      },
      {
        id: "writing-translation",
        name: "Writing & Translation",
        slug: "writing-translation",
        description: "Content Writing, Copywriting, Translation Services",
        logo: "/placeholder.svg?height=100&width=100&text=Writing",
        sortOrder: 3,
        isActive: true,
        createdAt: new Date().toISOString(),
        subcategories: [
          {
            id: "content-writing",
            categoryId: "writing-translation",
            name: "Content Writing",
            slug: "content-writing",
            description: "Blog posts, articles, and web content",
            logo: "/placeholder.svg?height=100&width=100&text=Content",
            sortOrder: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "blog-writing",
                subcategoryId: "content-writing",
                name: "Blog Writing",
                slug: "blog-writing",
                description: "Professional blog post writing",
                price: 50,
                deliveryTime: { value: 3, unit: "days" },
                revisionsIncluded: 2,
                images: ["/placeholder.svg?height=300&width=400&text=Blog+Writing"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
          {
            id: "translation",
            categoryId: "writing-translation",
            name: "Translation Services",
            slug: "translation",
            description: "Professional translation services",
            logo: "/placeholder.svg?height=100&width=100&text=Translation",
            sortOrder: 2,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "document-translation",
                subcategoryId: "translation",
                name: "Document Translation",
                slug: "document-translation",
                description: "Professional document translation",
                price: 25,
                deliveryTime: { value: 2, unit: "days" },
                revisionsIncluded: 1,
                images: ["/placeholder.svg?height=300&width=400&text=Translation"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ],
      },
      {
        id: "video-animation",
        name: "Video & Animation",
        slug: "video-animation",
        description: "Video Editing, Animation, Motion Graphics",
        logo: "/placeholder.svg?height=100&width=100&text=Video",
        sortOrder: 4,
        isActive: true,
        createdAt: new Date().toISOString(),
        subcategories: [
          {
            id: "video-editing",
            categoryId: "video-animation",
            name: "Video Editing",
            slug: "video-editing",
            description: "Professional video editing services",
            logo: "/placeholder.svg?height=100&width=100&text=Video+Edit",
            sortOrder: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "video-edit-service",
                subcategoryId: "video-editing",
                name: "Video Editing",
                slug: "video-edit-service",
                description: "Professional video editing",
                price: 200,
                deliveryTime: { value: 5, unit: "days" },
                revisionsIncluded: 3,
                images: ["/placeholder.svg?height=300&width=400&text=Video+Editing"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
          {
            id: "animation",
            categoryId: "video-animation",
            name: "Animation",
            slug: "animation",
            description: "2D and 3D animation services",
            logo: "/placeholder.svg?height=100&width=100&text=Animation",
            sortOrder: 2,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "2d-animation",
                subcategoryId: "animation",
                name: "2D Animation",
                slug: "2d-animation",
                description: "Professional 2D animation",
                price: 400,
                deliveryTime: { value: 10, unit: "days" },
                revisionsIncluded: 3,
                images: ["/placeholder.svg?height=300&width=400&text=2D+Animation"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ],
      },
      {
        id: "digital-marketing",
        name: "Digital Marketing",
        slug: "digital-marketing",
        description: "SEO, Social Media Marketing, Content Marketing",
        logo: "/placeholder.svg?height=100&width=100&text=Marketing",
        sortOrder: 5,
        isActive: true,
        createdAt: new Date().toISOString(),
        subcategories: [
          {
            id: "seo",
            categoryId: "digital-marketing",
            name: "SEO",
            slug: "seo",
            description: "Search engine optimization services",
            logo: "/placeholder.svg?height=100&width=100&text=SEO",
            sortOrder: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "seo-audit",
                subcategoryId: "seo",
                name: "SEO Audit",
                slug: "seo-audit",
                description: "Comprehensive SEO audit",
                price: 150,
                deliveryTime: { value: 3, unit: "days" },
                revisionsIncluded: 1,
                images: ["/placeholder.svg?height=300&width=400&text=SEO+Audit"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
          {
            id: "social-media",
            categoryId: "digital-marketing",
            name: "Social Media Marketing",
            slug: "social-media",
            description: "Social media management and marketing",
            logo: "/placeholder.svg?height=100&width=100&text=Social",
            sortOrder: 2,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "social-media-management",
                subcategoryId: "social-media",
                name: "Social Media Management",
                slug: "social-media-management",
                description: "Complete social media management",
                price: 300,
                deliveryTime: { value: 30, unit: "days" },
                revisionsIncluded: 2,
                images: ["/placeholder.svg?height=300&width=400&text=Social+Media"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ],
      },
      {
        id: "data-analytics",
        name: "Data & Analytics",
        slug: "data-analytics",
        description: "Data Analysis, Business Intelligence, Reporting",
        logo: "/placeholder.svg?height=100&width=100&text=Data",
        sortOrder: 6,
        isActive: true,
        createdAt: new Date().toISOString(),
        subcategories: [
          {
            id: "data-analysis",
            categoryId: "data-analytics",
            name: "Data Analysis",
            slug: "data-analysis",
            description: "Professional data analysis services",
            logo: "/placeholder.svg?height=100&width=100&text=Analysis",
            sortOrder: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "data-analysis-service",
                subcategoryId: "data-analysis",
                name: "Data Analysis",
                slug: "data-analysis-service",
                description: "Comprehensive data analysis",
                price: 250,
                deliveryTime: { value: 5, unit: "days" },
                revisionsIncluded: 2,
                images: ["/placeholder.svg?height=300&width=400&text=Data+Analysis"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ],
      },
      {
        id: "music-audio",
        name: "Music & Audio",
        slug: "music-audio",
        description: "Audio Editing, Music Production, Voice Over",
        logo: "/placeholder.svg?height=100&width=100&text=Music",
        sortOrder: 7,
        isActive: true,
        createdAt: new Date().toISOString(),
        subcategories: [
          {
            id: "audio-editing",
            categoryId: "music-audio",
            name: "Audio Editing",
            slug: "audio-editing",
            description: "Professional audio editing services",
            logo: "/placeholder.svg?height=100&width=100&text=Audio",
            sortOrder: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "audio-edit-service",
                subcategoryId: "audio-editing",
                name: "Audio Editing",
                slug: "audio-edit-service",
                description: "Professional audio editing",
                price: 100,
                deliveryTime: { value: 3, unit: "days" },
                revisionsIncluded: 2,
                images: ["/placeholder.svg?height=300&width=400&text=Audio+Editing"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ],
      },
      {
        id: "business",
        name: "Business",
        slug: "business",
        description: "Business Plans, Market Research, Virtual Assistant",
        logo: "/placeholder.svg?height=100&width=100&text=Business",
        sortOrder: 8,
        isActive: true,
        createdAt: new Date().toISOString(),
        subcategories: [
          {
            id: "business-plans",
            categoryId: "business",
            name: "Business Plans",
            slug: "business-plans",
            description: "Professional business plan creation",
            logo: "/placeholder.svg?height=100&width=100&text=Plans",
            sortOrder: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "business-plan-service",
                subcategoryId: "business-plans",
                name: "Business Plan Creation",
                slug: "business-plan-service",
                description: "Comprehensive business plan",
                price: 500,
                deliveryTime: { value: 7, unit: "days" },
                revisionsIncluded: 3,
                images: ["/placeholder.svg?height=300&width=400&text=Business+Plan"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ],
      },
      {
        id: "lifestyle",
        name: "Lifestyle",
        slug: "lifestyle",
        description: "Health & Fitness, Travel Planning, Personal Development",
        logo: "/placeholder.svg?height=100&width=100&text=Lifestyle",
        sortOrder: 9,
        isActive: true,
        createdAt: new Date().toISOString(),
        subcategories: [
          {
            id: "health-fitness",
            categoryId: "lifestyle",
            name: "Health & Fitness",
            slug: "health-fitness",
            description: "Personal training and nutrition advice",
            logo: "/placeholder.svg?height=100&width=100&text=Fitness",
            sortOrder: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "fitness-plan",
                subcategoryId: "health-fitness",
                name: "Fitness Plan",
                slug: "fitness-plan",
                description: "Personalized fitness plan",
                price: 75,
                deliveryTime: { value: 3, unit: "days" },
                revisionsIncluded: 2,
                images: ["/placeholder.svg?height=300&width=400&text=Fitness+Plan"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ],
      },
      {
        id: "photography",
        name: "Photography",
        slug: "photography",
        description: "Photo Editing, Product Photography, Portrait Photography",
        logo: "/placeholder.svg?height=100&width=100&text=Photo",
        sortOrder: 10,
        isActive: true,
        createdAt: new Date().toISOString(),
        subcategories: [
          {
            id: "photo-editing",
            categoryId: "photography",
            name: "Photo Editing",
            slug: "photo-editing",
            description: "Professional photo editing services",
            logo: "/placeholder.svg?height=100&width=100&text=Edit",
            sortOrder: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "photo-edit-service",
                subcategoryId: "photo-editing",
                name: "Photo Editing",
                slug: "photo-edit-service",
                description: "Professional photo editing",
                price: 25,
                deliveryTime: { value: 1, unit: "days" },
                revisionsIncluded: 2,
                images: ["/placeholder.svg?height=300&width=400&text=Photo+Editing"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ],
      },
      {
        id: "ai-services",
        name: "AI Services",
        slug: "ai-services",
        description: "AI Development, Machine Learning, Chatbots",
        logo: "/placeholder.svg?height=100&width=100&text=AI",
        sortOrder: 11,
        isActive: true,
        createdAt: new Date().toISOString(),
        subcategories: [
          {
            id: "ai-development",
            categoryId: "ai-services",
            name: "AI Development",
            slug: "ai-development",
            description: "Custom AI solution development",
            logo: "/placeholder.svg?height=100&width=100&text=AI+Dev",
            sortOrder: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "ai-chatbot",
                subcategoryId: "ai-development",
                name: "AI Chatbot Development",
                slug: "ai-chatbot",
                description: "Custom AI chatbot development",
                price: 800,
                deliveryTime: { value: 14, unit: "days" },
                revisionsIncluded: 3,
                images: ["/placeholder.svg?height=300&width=400&text=AI+Chatbot"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ],
      },
      {
        id: "gaming",
        name: "Gaming",
        slug: "gaming",
        description: "Game Development, Game Art, Game Testing",
        logo: "/placeholder.svg?height=100&width=100&text=Gaming",
        sortOrder: 12,
        isActive: true,
        createdAt: new Date().toISOString(),
        subcategories: [
          {
            id: "game-development",
            categoryId: "gaming",
            name: "Game Development",
            slug: "game-development",
            description: "Custom game development services",
            logo: "/placeholder.svg?height=100&width=100&text=Game+Dev",
            sortOrder: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "mobile-game-dev",
                subcategoryId: "game-development",
                name: "Mobile Game Development",
                slug: "mobile-game-dev",
                description: "Mobile game development",
                price: 2000,
                deliveryTime: { value: 45, unit: "days" },
                revisionsIncluded: 5,
                images: ["/placeholder.svg?height=300&width=400&text=Mobile+Game"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ],
      },
      {
        id: "architecture-engineering",
        name: "Architecture & Engineering",
        slug: "architecture-engineering",
        description: "CAD Design, 3D Modeling, Technical Drawings",
        logo: "/placeholder.svg?height=100&width=100&text=Architecture",
        sortOrder: 13,
        isActive: true,
        createdAt: new Date().toISOString(),
        subcategories: [
          {
            id: "cad-design",
            categoryId: "architecture-engineering",
            name: "CAD Design",
            slug: "cad-design",
            description: "Professional CAD design services",
            logo: "/placeholder.svg?height=100&width=100&text=CAD",
            sortOrder: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            services: [
              {
                id: "cad-drawing",
                subcategoryId: "cad-design",
                name: "CAD Drawing",
                slug: "cad-drawing",
                description: "Professional CAD drawings",
                price: 200,
                deliveryTime: { value: 5, unit: "days" },
                revisionsIncluded: 3,
                images: ["/placeholder.svg?height=300&width=400&text=CAD+Drawing"],
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ],
      },
    ]

    localStorage.setItem("marketplace_categories", JSON.stringify(defaultCategories))
    setCategories(defaultCategories)
    console.log("[v0] Successfully initialized", defaultCategories.length, "categories with full subcategory structure")
  }

  const handleResetCategories = () => {
    console.log("[v0] Force resetting all categories...")
    localStorage.removeItem("marketplace_categories")
    initializeDefaultCategories()
    toast.success("Categories reset and reinitialized!")
  }

  if (loading) {
    return (
      <>
        <AdminHeader
          title="Marketplace Categories"
          description="Manage marketplace service categories and subcategories"
        />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </>
    )
  }

  const safeCategories = Array.isArray(categories) ? categories : []

  return (
    <>
      <AdminHeader
        title="Marketplace Categories"
        description="Manage marketplace service categories and subcategories"
      />

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Marketplace Category</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Edit Marketplace Category" : "Create New Marketplace Category"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cat-name">Name</Label>
                    <Input
                      id="cat-name"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Web Development"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-slug">Slug</Label>
                    <Input
                      id="cat-slug"
                      value={categoryForm.slug}
                      onChange={(e) => setCategoryForm((prev) => ({ ...prev, slug: e.target.value }))}
                      placeholder="web-development"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cat-description">Description</Label>
                  <Textarea
                    id="cat-description"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Professional web development services and solutions"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category Logo</Label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={categoryForm.logo}
                        onChange={(e) => setCategoryForm((prev) => ({ ...prev, logo: e.target.value }))}
                        placeholder="https://example.com/logo.png or upload from PC"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setCategoryForm((prev) => ({
                            ...prev,
                            logo: `/placeholder.svg?height=100&width=100&text=${encodeURIComponent(prev.name || "Logo")}`,
                          }))
                        }
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Or upload from PC:</span>
                      <Label htmlFor="logo-upload" className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Choose File
                          </span>
                        </Button>
                        <Input
                          id="logo-upload"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, false)}
                          className="hidden"
                        />
                      </Label>
                    </div>

                    {categoryForm.logo && (
                      <div className="mt-2">
                        <Image
                          src={categoryForm.logo || "/placeholder.svg"}
                          alt="Category logo preview"
                          width={100}
                          height={100}
                          className="rounded-lg border object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cat-sort">Sort Order</Label>
                  <Input
                    id="cat-sort"
                    type="number"
                    value={categoryForm.sortOrder}
                    onChange={(e) => setCategoryForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={resetCategoryDialog}>
                    Cancel
                  </Button>
                  <Button onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}>
                    {editingCategory ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={subcategoryDialogOpen} onOpenChange={setSubcategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2 bg-transparent">
                <Plus className="h-4 w-4" />
                <span>Add Subcategory</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSubcategory ? "Edit Marketplace Subcategory" : "Create New Marketplace Subcategory"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sub-category">Parent Category</Label>
                  <Select
                    value={subcategoryForm.categoryId}
                    onValueChange={(value) => setSubcategoryForm((prev) => ({ ...prev, categoryId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent category" />
                    </SelectTrigger>
                    <SelectContent>
                      {safeCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ... existing subcategory form code ... */}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sub-name">Name</Label>
                    <Input
                      id="sub-name"
                      value={subcategoryForm.name}
                      onChange={(e) => setSubcategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="React Development"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sub-slug">Slug</Label>
                    <Input
                      id="sub-slug"
                      value={subcategoryForm.slug}
                      onChange={(e) => setSubcategoryForm((prev) => ({ ...prev, slug: e.target.value }))}
                      placeholder="react-development"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sub-description">Description</Label>
                  <Textarea
                    id="sub-description"
                    value={subcategoryForm.description}
                    onChange={(e) => setSubcategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Professional React.js development services"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Subcategory Logo (Optional)</Label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={subcategoryForm.logo}
                        onChange={(e) => setSubcategoryForm((prev) => ({ ...prev, logo: e.target.value }))}
                        placeholder="https://example.com/logo.png or upload from PC"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setSubcategoryForm((prev) => ({
                            ...prev,
                            logo: `/placeholder.svg?height=100&width=100&text=${encodeURIComponent(prev.name || "Logo")}`,
                          }))
                        }
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Or upload from PC:</span>
                      <Label htmlFor="sub-logo-upload" className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Choose File
                          </span>
                        </Button>
                        <Input
                          id="sub-logo-upload"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, true)}
                          className="hidden"
                        />
                      </Label>
                    </div>

                    {subcategoryForm.logo && (
                      <div className="mt-2">
                        <Image
                          src={subcategoryForm.logo || "/placeholder.svg"}
                          alt="Subcategory logo preview"
                          width={100}
                          height={100}
                          className="rounded-lg border object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sub-sort">Sort Order</Label>
                  <Input
                    id="sub-sort"
                    type="number"
                    value={subcategoryForm.sortOrder}
                    onChange={(e) => setSubcategoryForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={resetSubcategoryDialog}>
                    Cancel
                  </Button>
                  <Button onClick={editingSubcategory ? handleUpdateSubcategory : handleCreateSubcategory}>
                    {editingSubcategory ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingService ? "Edit Service" : "Create New Service"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="service-subcategory">Parent Subcategory</Label>
                    <Select
                      value={serviceForm.subcategoryId}
                      onValueChange={(value) => setServiceForm((prev) => ({ ...prev, subcategoryId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {safeCategories.flatMap((category) =>
                          category.subcategories.map((subcategory) => (
                            <SelectItem key={subcategory.id} value={subcategory.id}>
                              {category.name} → {subcategory.name}
                            </SelectItem>
                          )),
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service-name">Service Name *</Label>
                    <Input
                      id="service-name"
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Logo Design"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="service-slug">Slug</Label>
                    <Input
                      id="service-slug"
                      value={serviceForm.slug}
                      onChange={(e) => setServiceForm((prev) => ({ ...prev, slug: e.target.value }))}
                      placeholder="logo-design"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service-price">Price (USD) *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="service-price"
                        type="number"
                        placeholder="50"
                        value={serviceForm.price}
                        onChange={(e) => setServiceForm((prev) => ({ ...prev, price: e.target.value }))}
                        className="pl-10"
                        min="5"
                        max="10000"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service-description">Description</Label>
                  <Textarea
                    id="service-description"
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Professional logo design services"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service-sort">Sort Order</Label>
                  <Input
                    id="service-sort"
                    type="number"
                    value={serviceForm.sortOrder}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveService}>{editingService ? "Update Service" : "Create Service"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ... existing reset button ... */}
        </div>

        {/* Categories List */}
        <div className="space-y-4">
          {safeCategories.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No marketplace categories yet</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Create your first marketplace category to organize services
                </p>
                <Button onClick={() => setCategoryDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Category
                </Button>
              </CardContent>
            </Card>
          ) : (
            safeCategories.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        {category.logo ? (
                          <Image
                            src={category.logo || "/placeholder.svg"}
                            alt={category.name}
                            width={60}
                            height={60}
                            className="rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="p-3 bg-primary/10 rounded-lg">
                            <Folder className="h-6 w-6 text-primary" />
                          </div>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <Hash className="h-3 w-3" />
                        <span>{category.sortOrder}</span>
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => startEditCategory(category)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {Array.isArray(category.subcategories) && category.subcategories.length > 0 && (
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Subcategories</h4>
                      <div className="grid gap-2">
                        {category.subcategories.map((subcategory) => (
                          <div key={subcategory.id} className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="relative">
                                  {subcategory.logo || category.logo ? (
                                    <Image
                                      src={subcategory.logo || category.logo || "/placeholder.svg"}
                                      alt={subcategory.name}
                                      width={32}
                                      height={32}
                                      className="rounded border object-cover"
                                    />
                                  ) : (
                                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium">{subcategory.name}</p>
                                  <p className="text-xs text-muted-foreground">{subcategory.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button variant="outline" size="sm" onClick={() => startCreateService(subcategory.id)}>
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Service
                                </Button>
                                <Badge variant="outline" className="flex items-center space-x-1">
                                  <Hash className="h-3 w-3" />
                                  <span>{subcategory.sortOrder}</span>
                                </Badge>
                                <Button variant="ghost" size="sm" onClick={() => startEditSubcategory(subcategory)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSubcategory(subcategory.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {Array.isArray(subcategory.services) && subcategory.services.length > 0 && (
                              <div className="ml-8 space-y-1">
                                <h5 className="text-xs font-medium text-muted-foreground mb-2">Services</h5>
                                {subcategory.services.map((service) => (
                                  <div
                                    key={service.id}
                                    className="flex items-center justify-between p-3 bg-background border rounded-md"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                          <p className="text-sm font-medium">{service.name}</p>
                                          {service.price && (
                                            <Badge variant="secondary" className="text-xs">
                                              ${service.price}
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-1">{service.description}</p>
                                        <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                                          {service.deliveryTime && (
                                            <span>
                                              {service.deliveryTime.unit === "instant"
                                                ? "Instant delivery"
                                                : `${service.deliveryTime.value} ${service.deliveryTime.unit}`}
                                            </span>
                                          )}
                                          {service.revisionsIncluded !== undefined && (
                                            <span>
                                              {service.revisionsIncluded === -1
                                                ? "Unlimited revisions"
                                                : service.revisionsIncluded === 0
                                                  ? "No revisions"
                                                  : `${service.revisionsIncluded} revisions`}
                                            </span>
                                          )}
                                          {service.images && service.images.length > 0 && (
                                            <span>{service.images.length} images</span>
                                          )}
                                          {service.videoThumbnail && <span>Video included</span>}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Badge variant="secondary" size="sm">
                                        #{service.sortOrder}
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => startEditService(service)}
                                        className="h-6 w-6 p-0"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteService(service.id)}
                                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  )
}
