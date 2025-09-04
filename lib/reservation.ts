import { createServerClient } from "./supabase/server"

export interface ReservationSettings {
  id: string
  isEnabled: boolean
  defaultReservationHours: number
  maxConcurrentReservations: number
  createdAt: string
  updatedAt: string
}

export async function getReservationSettings(): Promise<ReservationSettings> {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase.from("reservation_settings").select("*").single()

    if (error) {
      console.log("No reservation settings found, using defaults")
      return {
        id: "default",
        isEnabled: false,
        defaultReservationHours: 1,
        maxConcurrentReservations: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    return data
  } catch (error) {
    console.error("Error fetching reservation settings:", error)
    return {
      id: "default",
      isEnabled: false,
      defaultReservationHours: 1,
      maxConcurrentReservations: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }
}

export async function updateReservationSettings(settings: Partial<ReservationSettings>): Promise<ReservationSettings> {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("reservation_settings")
      .upsert({
        id: "default",
        ...settings,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error updating reservation settings:", error)
    throw error
  }
}
