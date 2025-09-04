import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServerClient()

    // Get user's favorites with job details
    const { data: favorites, error } = await supabase
      .from("user_favorites")
      .select(`
        id,
        job_id,
        created_at,
        microjobs (
          id,
          title,
          description,
          budget_min,
          budget_max,
          location,
          is_remote,
          workers_needed,
          created_at,
          thumbnail,
          category_id,
          user_id,
          categories (
            id,
            name,
            slug
          ),
          users (
            id,
            first_name,
            last_name,
            username,
            is_verified
          )
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching favorites:", error)
      return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 })
    }

    // Transform the data to match the expected Job interface
    const transformedFavorites =
      favorites?.map((fav) => ({
        id: fav.microjobs.id,
        title: fav.microjobs.title,
        description: fav.microjobs.description,
        budgetMin: fav.microjobs.budget_min,
        budgetMax: fav.microjobs.budget_max,
        location: fav.microjobs.location,
        isRemote: fav.microjobs.is_remote,
        workersNeeded: fav.microjobs.workers_needed,
        createdAt: fav.microjobs.created_at,
        thumbnail: fav.microjobs.thumbnail,
        category: {
          id: fav.microjobs.categories.id,
          name: fav.microjobs.categories.name,
          slug: fav.microjobs.categories.slug,
        },
        postedBy: {
          id: fav.microjobs.users.id,
          firstName: fav.microjobs.users.first_name,
          lastName: fav.microjobs.users.last_name,
          username: fav.microjobs.users.username,
          isVerified: fav.microjobs.users.is_verified,
        },
        favoriteId: fav.id,
        favoritedAt: fav.created_at,
      })) || []

    return NextResponse.json(transformedFavorites)
  } catch (error) {
    console.error("Error in favorites GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { jobId } = await request.json()

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Check if job exists
    const { data: job, error: jobError } = await supabase.from("microjobs").select("id").eq("id", jobId).single()

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Check if already favorited
    const { data: existingFavorite } = await supabase
      .from("user_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("job_id", jobId)
      .single()

    if (existingFavorite) {
      return NextResponse.json({ error: "Job already favorited" }, { status: 409 })
    }

    // Add to favorites
    const { data: favorite, error: favoriteError } = await supabase
      .from("user_favorites")
      .insert({
        user_id: user.id,
        job_id: jobId,
      })
      .select()
      .single()

    if (favoriteError) {
      console.error("Error adding favorite:", favoriteError)
      return NextResponse.json({ error: "Failed to add favorite" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      favorite,
      message: "Job added to favorites",
    })
  } catch (error) {
    console.error("Error in favorites POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { jobId } = await request.json()

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Remove from favorites
    const { error } = await supabase.from("user_favorites").delete().eq("user_id", user.id).eq("job_id", jobId)

    if (error) {
      console.error("Error removing favorite:", error)
      return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Job removed from favorites",
    })
  } catch (error) {
    console.error("Error in favorites DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
