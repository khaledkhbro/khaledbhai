export interface MarketplaceDispute {
  id: string
  orderId: string
  serviceName: string
  sellerId: string
  sellerName: string
  buyerId: string
  buyerName: string
  reason: string
  details: string
  amount: number
  status: "pending" | "under_review" | "resolved" | "escalated"
  priority: "low" | "medium" | "high" | "urgent"
  evidenceCount: number
  createdAt: string
  updatedAt: string
  adminId?: string
  adminNotes?: string
  resolution?: "refund_buyer" | "pay_seller" | "partial_refund"
  tier: "basic" | "standard" | "premium"
  deliveryTime: number
}

export interface MarketplaceDisputeResolution {
  decision: "refund_buyer" | "pay_seller" | "partial_refund"
  adminNotes: string
  adminId: string
}

export interface MarketplaceDisputeEvidence {
  id: string
  disputeId: string
  uploadedBy: "buyer" | "seller" | "admin"
  type: "image" | "document" | "screenshot"
  filename: string
  url: string
  description?: string
  uploadedAt: string
}

// Storage keys
const MARKETPLACE_DISPUTES_STORAGE_KEY = "marketplace_disputes_mock_data"
const MARKETPLACE_DISPUTE_EVIDENCE_STORAGE_KEY = "marketplace_dispute_evidence_mock_data"

// Initialize mock data with persistence
function initializeMockMarketplaceDisputes(): MarketplaceDispute[] {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(MARKETPLACE_DISPUTES_STORAGE_KEY)
    if (stored) {
      try {
        const parsedDisputes = JSON.parse(stored)
        console.log(`[v0] Loaded ${parsedDisputes.length} marketplace disputes from localStorage`)
        return parsedDisputes
      } catch (error) {
        console.log(`[v0] Error parsing stored marketplace disputes, using defaults:`, error)
      }
    }
  }

  const defaultDisputes: MarketplaceDispute[] = []

  if (typeof window !== "undefined") {
    localStorage.setItem(MARKETPLACE_DISPUTES_STORAGE_KEY, JSON.stringify(defaultDisputes))
    console.log(`[v0] Initialized ${defaultDisputes.length} default marketplace disputes in localStorage`)
  }

  return defaultDisputes
}

function saveMarketplaceDisputesToStorage(disputes: MarketplaceDispute[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(MARKETPLACE_DISPUTES_STORAGE_KEY, JSON.stringify(disputes))
    console.log(`[v0] Saved ${disputes.length} marketplace disputes to localStorage`)
  }
}

function getCurrentMarketplaceDisputes(): MarketplaceDispute[] {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(MARKETPLACE_DISPUTES_STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (error) {
        console.log(`[v0] Error parsing stored marketplace disputes:`, error)
      }
    }
  }
  return initializeMockMarketplaceDisputes()
}

const mockMarketplaceDisputes: MarketplaceDispute[] = initializeMockMarketplaceDisputes()

export async function getMarketplaceDisputes(
  filters: {
    search?: string
    status?: string
    priority?: string
    limit?: number
  } = {},
): Promise<MarketplaceDispute[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  const currentDisputes = getCurrentMarketplaceDisputes()

  console.log(`[v0] Fetching marketplace disputes. Total in storage: ${currentDisputes.length}`)

  let filtered = [...currentDisputes]

  if (filters.search) {
    const search = filters.search.toLowerCase()
    filtered = filtered.filter(
      (dispute) =>
        dispute.serviceName.toLowerCase().includes(search) ||
        dispute.sellerName.toLowerCase().includes(search) ||
        dispute.buyerName.toLowerCase().includes(search) ||
        dispute.reason.toLowerCase().includes(search) ||
        dispute.orderId.toLowerCase().includes(search),
    )
  }

  if (filters.status) {
    filtered = filtered.filter((dispute) => dispute.status === filters.status)
  }

  if (filters.priority) {
    filtered = filtered.filter((dispute) => dispute.priority === filters.priority)
  }

  if (filters.limit) {
    filtered = filtered.slice(0, filters.limit)
  }

  // Sort by priority and creation date
  filtered.sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder]
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder]

    if (aPriority !== bPriority) {
      return bPriority - aPriority
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  console.log(`[v0] Filtered marketplace disputes count: ${filtered.length}`)
  return filtered
}

export async function resolveMarketplaceDispute(
  disputeId: string,
  resolution: MarketplaceDisputeResolution,
): Promise<void> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const currentDisputes = getCurrentMarketplaceDisputes()
  const disputeIndex = currentDisputes.findIndex((d) => d.id === disputeId)
  if (disputeIndex === -1) {
    throw new Error("Marketplace dispute not found")
  }

  const dispute = currentDisputes[disputeIndex]

  if (dispute.status === "resolved") {
    console.log(`[v0] ⚠️ Marketplace dispute ${disputeId} is already resolved, skipping duplicate resolution`)
    throw new Error("This marketplace dispute has already been resolved")
  }

  console.log(`[v0] 🔄 Starting marketplace dispute resolution for: ${disputeId}`)
  console.log(`[v0] 🔄 Current dispute status: ${dispute.status}`)

  // Update the dispute status first to prevent race conditions
  currentDisputes[disputeIndex] = {
    ...currentDisputes[disputeIndex],
    status: "resolved",
    adminId: resolution.adminId,
    adminNotes: resolution.adminNotes,
    resolution: resolution.decision,
    updatedAt: new Date().toISOString(),
  }

  saveMarketplaceDisputesToStorage(currentDisputes)

  console.log(`[v0] Marketplace dispute ${disputeId} resolved with decision: ${resolution.decision}`)
  console.log(`[v0] Admin notes: ${resolution.adminNotes}`)

  try {
    await handleMarketplaceDisputeResolution(dispute, resolution.decision)
    console.log(`[v0] ✅ Marketplace payment processing completed for dispute: ${disputeId}`)
  } catch (error) {
    console.error(`[v0] ❌ Marketplace payment processing failed for dispute: ${disputeId}`, error)

    currentDisputes[disputeIndex].status = "pending"
    saveMarketplaceDisputesToStorage(currentDisputes)

    throw new Error("Marketplace dispute resolution failed during payment processing")
  }
}

export async function escalateMarketplaceDispute(disputeId: string, reason: string): Promise<void> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  const currentDisputes = getCurrentMarketplaceDisputes()
  const disputeIndex = currentDisputes.findIndex((d) => d.id === disputeId)
  if (disputeIndex === -1) {
    throw new Error("Marketplace dispute not found")
  }

  currentDisputes[disputeIndex] = {
    ...currentDisputes[disputeIndex],
    status: "escalated",
    priority: "urgent",
    updatedAt: new Date().toISOString(),
  }

  saveMarketplaceDisputesToStorage(currentDisputes)

  console.log(`[v0] Marketplace dispute ${disputeId} escalated: ${reason}`)
}

export async function createMarketplaceDispute(disputeData: {
  orderId: string
  serviceName: string
  sellerId: string
  sellerName: string
  buyerId: string
  buyerName: string
  amount: number
  reason: string
  details: string
  priority: "low" | "medium" | "high" | "urgent"
  tier: "basic" | "standard" | "premium"
  deliveryTime: number
}): Promise<MarketplaceDispute> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  const currentDisputes = getCurrentMarketplaceDisputes()

  // Check if a dispute already exists for this order
  const existingDispute = currentDisputes.find(
    (dispute) =>
      dispute.orderId === disputeData.orderId && (dispute.status === "pending" || dispute.status === "under_review"),
  )

  if (existingDispute) {
    console.log(`[v0] ⚠️ Duplicate marketplace dispute prevented for order: ${disputeData.orderId}`)
    console.log(`[v0] ⚠️ Existing dispute ID: ${existingDispute.id}`)
    throw new Error("A dispute for this marketplace order already exists and is pending resolution")
  }

  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const disputeId = `marketplace-dispute-${timestamp}-${randomSuffix}`

  const newDispute: MarketplaceDispute = {
    id: disputeId,
    orderId: disputeData.orderId,
    serviceName: disputeData.serviceName,
    sellerId: disputeData.sellerId,
    sellerName: disputeData.sellerName,
    buyerId: disputeData.buyerId,
    buyerName: disputeData.buyerName,
    reason: disputeData.reason,
    details: disputeData.details,
    amount: disputeData.amount,
    status: "pending",
    priority: disputeData.priority,
    evidenceCount: 0,
    tier: disputeData.tier,
    deliveryTime: disputeData.deliveryTime,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  currentDisputes.unshift(newDispute)
  saveMarketplaceDisputesToStorage(currentDisputes)

  console.log(`[v0] Created marketplace dispute: ${newDispute.id} for order: ${disputeData.orderId}`)
  console.log(`[v0] Total marketplace disputes after creation: ${currentDisputes.length}`)

  return newDispute
}

// Import necessary functions for payment processing
import { createNotification } from "./notifications"
import { addWalletTransaction } from "./wallet"
import { marketplaceOrderManager } from "./marketplace-orders"

async function handleMarketplaceDisputeResolution(dispute: MarketplaceDispute, decision: string): Promise<void> {
  console.log(`[v0] 💰 Processing marketplace dispute resolution payment for: ${dispute.id}`)
  console.log(`[v0] 💰 Decision: ${decision}, Amount: $${dispute.amount}`)
  console.log(`[v0] 💰 Seller: ${dispute.sellerName} (${dispute.sellerId})`)
  console.log(`[v0] 💰 Buyer: ${dispute.buyerName} (${dispute.buyerId})`)

  const amount = dispute.amount

  try {
    switch (decision) {
      case "refund_buyer":
        console.log(`[v0] 💰 REFUND BUYER: Refunding $${amount} to buyer`)

        // Refund to buyer's wallet
        await addWalletTransaction({
          userId: dispute.buyerId,
          type: "refund",
          amount: amount,
          description: `Marketplace Dispute Resolution: Refund for "${dispute.serviceName}" (Order #${dispute.orderId})`,
          referenceId: dispute.id,
          referenceType: "marketplace_dispute_resolution",
          balanceType: "deposit",
        })

        // Update order status through marketplace order manager
        marketplaceOrderManager.resolveDispute(dispute.orderId, "admin-user", "refund_buyer", dispute.adminNotes)

        // Notify buyer
        await createNotification({
          userId: dispute.buyerId,
          type: "payment",
          title: "🔄 Marketplace Dispute Resolved - Refund Issued",
          description: `You've received a $${amount.toFixed(2)} refund for "${dispute.serviceName}" (Order #${dispute.orderId}). The admin has approved your dispute.`,
          actionUrl: "/dashboard/wallet",
        })

        // Notify seller
        await createNotification({
          userId: dispute.sellerId,
          type: "dispute",
          title: "📋 Marketplace Dispute Resolution",
          description: `The dispute for "${dispute.serviceName}" (Order #${dispute.orderId}) has been resolved in favor of the buyer. A refund of $${amount.toFixed(2)} has been issued.`,
          actionUrl: "/dashboard/orders",
        })

        console.log(`[v0] ✅ Buyer refund completed: $${amount}`)
        break

      case "pay_seller":
        console.log(`[v0] 💰 PAY SELLER: Releasing $${amount} to seller`)

        // Release payment to seller's earnings balance
        await addWalletTransaction({
          userId: dispute.sellerId,
          type: "earning",
          amount: amount,
          description: `Marketplace Dispute Resolution: Payment released for "${dispute.serviceName}" (Order #${dispute.orderId})`,
          referenceId: dispute.id,
          referenceType: "marketplace_dispute_resolution",
          balanceType: "earnings",
        })

        // Update order status through marketplace order manager
        marketplaceOrderManager.resolveDispute(dispute.orderId, "admin-user", "pay_seller", dispute.adminNotes)

        // Notify seller
        await createNotification({
          userId: dispute.sellerId,
          type: "payment",
          title: "🎉 Marketplace Dispute Resolved in Your Favor",
          description: `You've received $${amount.toFixed(2)} for "${dispute.serviceName}" (Order #${dispute.orderId}). The admin has approved your work.`,
          actionUrl: "/dashboard/wallet",
        })

        // Notify buyer
        await createNotification({
          userId: dispute.buyerId,
          type: "dispute",
          title: "📋 Marketplace Dispute Resolution",
          description: `The dispute for "${dispute.serviceName}" (Order #${dispute.orderId}) has been resolved in favor of the seller. Payment of $${amount.toFixed(2)} has been released.`,
          actionUrl: "/dashboard/orders",
        })

        console.log(`[v0] ✅ Seller payment completed: $${amount}`)
        break

      case "partial_refund":
        console.log(`[v0] 💰 PARTIAL RESOLUTION: Splitting $${amount} between seller and buyer`)

        const sellerAmount = amount * 0.5
        const buyerAmount = amount * 0.5

        // Give 50% to seller as earnings
        await addWalletTransaction({
          userId: dispute.sellerId,
          type: "earning",
          amount: sellerAmount,
          description: `Marketplace Dispute Resolution: Partial payment (50%) for "${dispute.serviceName}" (Order #${dispute.orderId})`,
          referenceId: dispute.id,
          referenceType: "marketplace_dispute_resolution",
          balanceType: "earnings",
        })

        // Refund 50% to buyer
        await addWalletTransaction({
          userId: dispute.buyerId,
          type: "refund",
          amount: buyerAmount,
          description: `Marketplace Dispute Resolution: Partial refund (50%) for "${dispute.serviceName}" (Order #${dispute.orderId})`,
          referenceId: dispute.id,
          referenceType: "marketplace_dispute_resolution",
          balanceType: "deposit",
        })

        // Update order status through marketplace order manager
        marketplaceOrderManager.resolveDispute(dispute.orderId, "admin-user", "pay_seller", dispute.adminNotes)

        // Notify seller
        await createNotification({
          userId: dispute.sellerId,
          type: "payment",
          title: "⚖️ Marketplace Dispute Partially Resolved",
          description: `You've received $${sellerAmount.toFixed(2)} (50%) for "${dispute.serviceName}" (Order #${dispute.orderId}). The admin has made a partial resolution.`,
          actionUrl: "/dashboard/wallet",
        })

        // Notify buyer
        await createNotification({
          userId: dispute.buyerId,
          type: "payment",
          title: "⚖️ Marketplace Dispute Partially Resolved",
          description: `You've received a $${buyerAmount.toFixed(2)} (50%) refund for "${dispute.serviceName}" (Order #${dispute.orderId}). The admin has made a partial resolution.`,
          actionUrl: "/dashboard/wallet",
        })

        console.log(`[v0] ✅ Partial resolution completed: Seller $${sellerAmount}, Buyer $${buyerAmount}`)
        break

      default:
        throw new Error(`Unknown marketplace dispute resolution decision: ${decision}`)
    }

    console.log(`[v0] 🎯 Marketplace dispute resolution payment processing completed successfully`)
  } catch (error) {
    console.error(`[v0] ❌ Error processing marketplace dispute resolution payment:`, error)
    throw error
  }
}

// Evidence management functions
export async function addMarketplaceDisputeEvidence(
  disputeId: string,
  evidence: Omit<MarketplaceDisputeEvidence, "id" | "disputeId" | "uploadedAt">,
): Promise<MarketplaceDisputeEvidence> {
  const evidenceId = `evidence-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

  const newEvidence: MarketplaceDisputeEvidence = {
    ...evidence,
    id: evidenceId,
    disputeId,
    uploadedAt: new Date().toISOString(),
  }

  // Store evidence (in real app, this would be in a database)
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(MARKETPLACE_DISPUTE_EVIDENCE_STORAGE_KEY)
    const evidenceList: MarketplaceDisputeEvidence[] = stored ? JSON.parse(stored) : []
    evidenceList.push(newEvidence)
    localStorage.setItem(MARKETPLACE_DISPUTE_EVIDENCE_STORAGE_KEY, JSON.stringify(evidenceList))
  }

  // Update evidence count in dispute
  const currentDisputes = getCurrentMarketplaceDisputes()
  const disputeIndex = currentDisputes.findIndex((d) => d.id === disputeId)
  if (disputeIndex >= 0) {
    currentDisputes[disputeIndex].evidenceCount += 1
    saveMarketplaceDisputesToStorage(currentDisputes)
  }

  return newEvidence
}

export async function getMarketplaceDisputeEvidence(disputeId: string): Promise<MarketplaceDisputeEvidence[]> {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(MARKETPLACE_DISPUTE_EVIDENCE_STORAGE_KEY)
    const evidenceList: MarketplaceDisputeEvidence[] = stored ? JSON.parse(stored) : []
    return evidenceList.filter((evidence) => evidence.disputeId === disputeId)
  }
  return []
}

// Utility functions
export const formatMarketplaceDisputeStatus = (status: MarketplaceDispute["status"]): string => {
  const statusMap: Record<MarketplaceDispute["status"], string> = {
    pending: "Pending Review",
    under_review: "Under Review",
    resolved: "Resolved",
    escalated: "Escalated",
  }
  return statusMap[status] || status
}

export const getMarketplaceDisputeStatusColor = (status: MarketplaceDispute["status"]): string => {
  const colorMap: Record<MarketplaceDispute["status"], string> = {
    pending: "text-yellow-600 bg-yellow-50 border-yellow-200",
    under_review: "text-blue-600 bg-blue-50 border-blue-200",
    resolved: "text-green-600 bg-green-50 border-green-200",
    escalated: "text-red-600 bg-red-50 border-red-200",
  }
  return colorMap[status] || "text-gray-600 bg-gray-50 border-gray-200"
}

export const getMarketplaceDisputePriorityColor = (priority: MarketplaceDispute["priority"]): string => {
  const colorMap: Record<MarketplaceDispute["priority"], string> = {
    low: "text-gray-600 bg-gray-50 border-gray-200",
    medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
    high: "text-orange-600 bg-orange-50 border-orange-200",
    urgent: "text-red-600 bg-red-50 border-red-200",
  }
  return colorMap[priority] || "text-gray-600 bg-gray-50 border-gray-200"
}
