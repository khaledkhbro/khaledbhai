import { type NextRequest, NextResponse } from "next/server"
import { updateJobWorkers } from "@/lib/jobs"

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId, newWorkerCount, userId } = body

    if (!jobId || !newWorkerCount || !userId) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    const result = await updateJobWorkers(jobId, newWorkerCount, userId)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Error updating worker count:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
