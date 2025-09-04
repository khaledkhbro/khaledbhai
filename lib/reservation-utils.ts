import { createClient } from "@/lib/supabase/client"

export interface ReservationStatus {
  isReserved: boolean
  timeLeft?: number
  expired?: boolean
  reservedBy?: string
}

export async function checkReservationStatus(jobId: string): Promise<ReservationStatus> {
  try {
    const supabase = createClient()

    const { data: job, error } = await supabase
      .from("microjobs")
      .select("is_reserved, reserved_until, reserved_by")
      .eq("id", jobId)
      .single()

    if (error || !job) {
      return { isReserved: false }
    }

    if (!job.is_reserved || !job.reserved_until) {
      return { isReserved: false }
    }

    const now = new Date().getTime()
    const reservedUntil = new Date(job.reserved_until).getTime()
    const timeLeft = reservedUntil - now

    if (timeLeft <= 0) {
      // Reservation has expired, trigger cleanup
      await expireReservation(jobId)
      return { isReserved: false, expired: true }
    }

    return {
      isReserved: true,
      timeLeft,
      reservedBy: job.reserved_by,
    }
  } catch (error) {
    console.error("Error checking reservation status:", error)
    return { isReserved: false }
  }
}

export async function expireReservation(jobId: string): Promise<boolean> {
  try {
    const supabase = createClient()

    // Update the job
    const { error: jobError } = await supabase
      .from("microjobs")
      .update({
        is_reserved: false,
        reserved_by: null,
        reserved_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)

    if (jobError) {
      console.error("Error updating job:", jobError)
      return false
    }

    // Update the reservation
    const { error: reservationError } = await supabase
      .from("job_reservations")
      .update({
        status: "expired",
        updated_at: new Date().toISOString(),
      })
      .eq("job_id", jobId)
      .eq("status", "active")

    if (reservationError) {
      console.error("Error updating reservation:", reservationError)
      return false
    }

    return true
  } catch (error) {
    console.error("Error expiring reservation:", error)
    return false
  }
}

export function formatTimeLeft(milliseconds: number): string {
  if (milliseconds <= 0) return "Expired"

  const hours = Math.floor(milliseconds / (1000 * 60 * 60))
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000)

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  } else {
    return `${seconds}s`
  }
}

export async function getUserReservations(userId: string) {
  try {
    const supabase = createClient()

    const { data: reservations, error } = await supabase
      .from("job_reservations")
      .select(`
        id,
        job_id,
        expires_at,
        status,
        created_at,
        microjobs (
          id,
          title,
          budget_max,
          category:categories(name)
        )
      `)
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching user reservations:", error)
      return []
    }

    return reservations || []
  } catch (error) {
    console.error("Error in getUserReservations:", error)
    return []
  }
}
