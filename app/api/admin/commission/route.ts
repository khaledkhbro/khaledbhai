import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user || user.userType !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServerClient()

    // Get all fee settings including chat transfer commission
    const { data: feeSettings, error } = await supabase.from("admin_fee_settings").select("*").order("fee_type")

    if (error) {
      console.error("Error fetching commission settings:", error)
      return NextResponse.json({ error: "Failed to fetch commission settings" }, { status: 500 })
    }

    return NextResponse.json({ feeSettings })
  } catch (error) {
    console.error("Error in commission GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user || user.userType !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { feeType, settings } = await request.json()

    if (!feeType || !settings) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Update fee settings
    const { data, error } = await supabase
      .from("admin_fee_settings")
      .upsert({
        fee_type: feeType,
        fee_percentage: settings.feePercentage || 0,
        fee_fixed: settings.feeFixed || 0,
        minimum_fee: settings.minimumFee || 0,
        maximum_fee: settings.maximumFee || null,
        is_active: settings.isActive || false,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error updating commission settings:", error)
      return NextResponse.json({ error: "Failed to update commission settings" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in commission PUT:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
