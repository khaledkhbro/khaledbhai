"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createMarketplaceDispute } from "@/lib/marketplace-disputes"
import { marketplaceOrderManager } from "@/lib/marketplace-orders"
import { Flag, AlertTriangle, Package } from "lucide-react"

interface CreateMarketplaceDisputeDialogProps {
  trigger?: React.ReactNode
  orderId?: string
  onDisputeCreated?: () => void
}

export function CreateMarketplaceDisputeDialog({
  trigger,
  orderId,
  onDisputeCreated,
}: CreateMarketplaceDisputeDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState(orderId || "")
  const [reason, setReason] = useState("")
  const [details, setDetails] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Get available orders for dispute
  const availableOrders = marketplaceOrderManager
    .getAllOrders()
    .filter((order) => order.status === "delivered" && !order.disputedAt)

  const selectedOrder = selectedOrderId ? marketplaceOrderManager.getOrder(selectedOrderId) : null

  const disputeReasons = [
    { value: "quality_issues", label: "Quality Issues", description: "Work doesn't meet requirements" },
    { value: "incomplete_delivery", label: "Incomplete Delivery", description: "Missing deliverables or partial work" },
    { value: "late_delivery", label: "Late Delivery", description: "Delivered after agreed deadline" },
    { value: "communication_issues", label: "Communication Issues", description: "Poor or no communication" },
    { value: "scope_creep", label: "Scope Creep", description: "Seller requesting additional payment" },
    { value: "not_as_described", label: "Not as Described", description: "Service differs from description" },
    { value: "technical_issues", label: "Technical Issues", description: "Files don't work or are corrupted" },
    { value: "other", label: "Other", description: "Other dispute reason" },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrderId || !reason || !details.trim()) {
      setError("Please fill in all required fields")
      return
    }

    if (!selectedOrder) {
      setError("Selected order not found")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      await createMarketplaceDispute({
        orderId: selectedOrderId,
        serviceName: selectedOrder.serviceName,
        sellerId: selectedOrder.sellerId,
        sellerName: selectedOrder.sellerId, // In real app, get actual name
        buyerId: selectedOrder.buyerId,
        buyerName: selectedOrder.buyerId, // In real app, get actual name
        amount: selectedOrder.price,
        reason,
        details,
        priority,
        tier: selectedOrder.tier,
        deliveryTime: selectedOrder.deliveryTime,
      })

      // Reset form
      setSelectedOrderId("")
      setReason("")
      setDetails("")
      setPriority("medium")
      setOpen(false)

      onDisputeCreated?.()
      alert("Marketplace dispute created successfully!")
    } catch (error) {
      console.error("Failed to create marketplace dispute:", error)
      setError(error instanceof Error ? error.message : "Failed to create dispute")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent">
            <Flag className="mr-2 h-4 w-4" />
            Open Dispute
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Marketplace Dispute</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Order Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Order</label>
            <Select value={selectedOrderId} onValueChange={setSelectedOrderId} disabled={!!orderId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an order to dispute" />
              </SelectTrigger>
              <SelectContent>
                {availableOrders.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <Package className="mx-auto h-8 w-8 mb-2" />
                    <p>No orders available for dispute</p>
                    <p className="text-xs">Only delivered orders can be disputed</p>
                  </div>
                ) : (
                  availableOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <div className="font-medium">{order.serviceName}</div>
                          <div className="text-xs text-gray-500">#{order.id.slice(-8)}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{order.tier}</Badge>
                          <span className="text-sm font-medium text-green-600">${order.price}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Order Details */}
          {selectedOrder && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center">
                <Package className="mr-2 h-4 w-4" />
                Order Details
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Service:</span>
                  <span className="ml-2 font-medium">{selectedOrder.serviceName}</span>
                </div>
                <div>
                  <span className="text-gray-600">Tier:</span>
                  <Badge className="ml-2">{selectedOrder.tier}</Badge>
                </div>
                <div>
                  <span className="text-gray-600">Amount:</span>
                  <span className="ml-2 font-medium text-green-600">${selectedOrder.price}</span>
                </div>
                <div>
                  <span className="text-gray-600">Seller:</span>
                  <span className="ml-2 font-medium">{selectedOrder.sellerId}</span>
                </div>
              </div>
              {selectedOrder.deliverables && (
                <div className="mt-3">
                  <span className="text-gray-600">Delivered:</span>
                  <p className="mt-1 text-sm bg-white p-2 rounded border">{selectedOrder.deliverables.message}</p>
                </div>
              )}
            </div>
          )}

          {/* Dispute Reason */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Dispute Reason *</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select the reason for your dispute" />
              </SelectTrigger>
              <SelectContent>
                {disputeReasons.map((reasonOption) => (
                  <SelectItem key={reasonOption.value} value={reasonOption.value}>
                    <div>
                      <div className="font-medium">{reasonOption.label}</div>
                      <div className="text-xs text-gray-500">{reasonOption.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Priority Level</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div>
                    <div className="font-medium">Low Priority</div>
                    <div className="text-xs text-gray-500">Minor issues, not urgent</div>
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div>
                    <div className="font-medium">Medium Priority</div>
                    <div className="text-xs text-gray-500">Standard dispute resolution</div>
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div>
                    <div className="font-medium">High Priority</div>
                    <div className="text-xs text-gray-500">Significant issues requiring attention</div>
                  </div>
                </SelectItem>
                <SelectItem value="urgent">
                  <div>
                    <div className="font-medium">Urgent Priority</div>
                    <div className="text-xs text-gray-500">Critical issues requiring immediate attention</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Detailed Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Detailed Description *</label>
            <Textarea
              placeholder="Please provide a detailed explanation of the issue. Include specific examples, what you expected vs what you received, and any relevant timeline information..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <div className="text-xs text-gray-500">
              Be as specific as possible. This information will help the admin make a fair decision.
            </div>
          </div>

          {/* Important Notice */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Once you submit this dispute, the order will be frozen and an admin will
              review the case. Make sure you have tried to resolve the issue directly with the seller first.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedOrderId || !reason || !details.trim() || isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Dispute...
                </>
              ) : (
                <>
                  <Flag className="mr-2 h-4 w-4" />
                  Create Dispute
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
