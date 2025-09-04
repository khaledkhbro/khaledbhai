import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/local-redis"

interface AdminService {
  id: string
  name: string
  description: string
  price: number
  deliveryTime: number
  deliveryUnit: string
  revisions: number
  unlimitedRevisions: boolean
  images: string[]
  videoUrl?: string
  sortOrder: number
}

interface AdminSubcategory {
  id: string
  name: string
  description: string
  services: AdminService[]
  sortOrder: number
}

interface AdminCategory {
  id: string
  name: string
  description: string
  logo: string
  subcategories: AdminSubcategory[]
  sortOrder: number
}

const CACHE_KEY = "marketplace:categories"
const CACHE_TTL = 3600 // 1 hour

export async function GET() {
  try {
    // Try to get from Redis cache first
    const cached = await redis.get(CACHE_KEY)
    if (cached) {
      console.log("[v0] Categories served from Redis cache")
      return NextResponse.json({
        categories: JSON.parse(cached),
        cached: true,
      })
    }

    // If not in cache, get from localStorage (server-side simulation)
    let categories: AdminCategory[] = []

    // In a real app, this would come from a database
    // For now, we'll use the default structure
    const defaultCategories: AdminCategory[] = [
      {
        id: "graphics-design",
        name: "Graphics & Design",
        description: "Logo & Brand Identity, Art & Illustration, Web & App Design",
        logo: "/placeholder.svg?height=100&width=100&text=Graphics",
        sortOrder: 1,
        subcategories: [
          {
            id: "logo-design",
            name: "Logo Design",
            description: "Professional logo design services",
            sortOrder: 1,
            services: [
              {
                id: "logo-design-service",
                name: "Logo Design",
                description: "Custom logo design services",
                price: 150,
                deliveryTime: 3,
                deliveryUnit: "days",
                revisions: 3,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Logo+Design"],
                sortOrder: 1,
              },
            ],
          },
          {
            id: "brand-identity",
            name: "Brand Identity & Guidelines",
            description: "Complete brand identity packages",
            sortOrder: 2,
            services: [
              {
                id: "brand-package",
                name: "Brand Package",
                description: "Complete brand identity package",
                price: 500,
                deliveryTime: 7,
                deliveryUnit: "days",
                revisions: 3,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Brand+Package"],
                sortOrder: 1,
              },
            ],
          },
        ],
      },
      {
        id: "web-development",
        name: "Web Development",
        description: "Website Development, E-commerce, Mobile Apps",
        logo: "/placeholder.svg?height=100&width=100&text=Web",
        sortOrder: 2,
        subcategories: [
          {
            id: "website-development",
            name: "Website Development",
            description: "Custom website development services",
            sortOrder: 1,
            services: [
              {
                id: "react-website",
                name: "React Website",
                description: "Modern React website development",
                price: 800,
                deliveryTime: 7,
                deliveryUnit: "days",
                revisions: 3,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=React+Website"],
                sortOrder: 1,
              },
            ],
          },
        ],
      },
      {
        id: "writing-translation",
        name: "Writing & Translation",
        description: "Content Writing, Copywriting, Translation Services",
        logo: "/placeholder.svg?height=100&width=100&text=Writing",
        sortOrder: 3,
        subcategories: [
          {
            id: "content-writing",
            name: "Content Writing",
            description: "Blog posts, articles, and web content",
            sortOrder: 1,
            services: [
              {
                id: "blog-writing",
                name: "Blog Writing",
                description: "SEO-optimized blog posts and articles",
                price: 75,
                deliveryTime: 2,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Blog+Writing"],
                sortOrder: 1,
              },
            ],
          },
        ],
      },
    ]

    categories = defaultCategories

    // Cache the result in Redis
    await redis.set(CACHE_KEY, JSON.stringify(categories), CACHE_TTL)
    console.log("[v0] Categories cached in Redis for", CACHE_TTL, "seconds")

    return NextResponse.json({
      categories,
      cached: false,
    })
  } catch (error) {
    console.error("[v0] Error fetching categories:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const categories = await request.json()

    // Save to cache
    await redis.set(CACHE_KEY, JSON.stringify(categories), CACHE_TTL)
    console.log("[v0] Categories updated in Redis cache")

    // In a real app, you would also save to database here

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating categories:", error)
    return NextResponse.json({ error: "Failed to update categories" }, { status: 500 })
  }
}

// Clear cache endpoint
export async function DELETE() {
  try {
    await redis.del(CACHE_KEY)
    console.log("[v0] Categories cache cleared")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error clearing cache:", error)
    return NextResponse.json({ error: "Failed to clear cache" }, { status: 500 })
  }
}
