"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  formatMarketplaceDisputeStatus,
  getMarketplaceDisputeStatusColor,
  getMarketplaceDisputePriorityColor,
  type MarketplaceDispute,
} from "@/lib/marketplace-disputes"
import { MarketplaceDisputeDetailsModal } from "./marketplace-dispute-details-modal"
import { Eye, Clock, DollarSign, Package, ShoppingCart, CheckCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface MarketplaceDisputeCardProps {
  dispute: MarketplaceDispute
  onAction?: (dispute: MarketplaceDispute, action: string) => void
  showActions?: boolean
}

export function MarketplaceDisputeCard({ dispute, onAction, showActions = true }: MarketplaceDisputeCardProps) {
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const disputeReasonLabels: Record<string, string> = {
    quality_issues: "Quality Issues",
    incomplete_delivery: "Incomplete Delivery",
    late_delivery: "Late Delivery",
    communication_issues: "Communication Issues",
    scope_creep: "Scope Creep",
    not_as_described: "Not as Described",
    technical_issues: "Technical Issues",
    other: "Other",
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <div className="flex items-center space-x-3">
                <ShoppingCart className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">{dispute.serviceName}</h3>
                <Badge className={`${getMarketplaceDisputeStatusColor(dispute.status)} border`}>
                  {formatMarketplaceDisputeStatus(dispute.status)}
                </Badge>
                <Badge className={`${getMarketplaceDisputePriorityColor(dispute.priority)} border`}>
                  {dispute.priority}
                </Badge>
              </div>

              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">{dispute.buyerName[0]}</AvatarFallback>
                  </Avatar>
                  <span>Buyer: {dispute.buyerName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">{dispute.sellerName[0]}</AvatarFallback>
                  </Avatar>
                  <span>Seller: {dispute.sellerName}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDistanceToNow(new Date(dispute.createdAt), { addSuffix: true })}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <strong>Order ID:</strong> #{dispute.orderId.slice(-8)}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Reason:</strong> {disputeReasonLabels[dispute.reason] || dispute.reason}
                </p>
                <p className="text-sm text-gray-600 line-clamp-2">{dispute.details}</p>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-4 w-4" />
                  <span>${dispute.amount.toFixed(2)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Package className="h-4 w-4" />
                  <span>{dispute.tier} tier</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{dispute.deliveryTime} days delivery</span>
                </div>
              </div>

              {dispute.status === "resolved" && dispute.resolution && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-green-800 flex items-center">
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Resolved
                    </h4>
                    <span className="text-xs text-green-600">
                      {formatDistanceToNow(new Date(dispute.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      {dispute.resolution === "pay_seller" && "✅ Seller Paid"}
                      {dispute.resolution === "refund_buyer" && "🔄 Buyer Refunded"}
                      {dispute.resolution === "partial_refund" && "⚖️ Partial Resolution"}
                    </Badge>
                    <span className="text-sm font-medium text-green-800">
                      {dispute.resolution === "pay_seller" && `$${dispute.amount.toFixed(2)} → Seller`}
                      {dispute.resolution === "refund_buyer" && `$${dispute.amount.toFixed(2)} → Buyer`}
                      {dispute.resolution === "partial_refund" && `$${(dispute.amount * 0.5).toFixed(2)} each`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {showActions && (
              <div className="flex items-center space-x-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDetailsModal(true)}
                  className="bg-transparent"
                >
                  <Eye className="mr-1 h-3 w-3" />
                  View Details
                </Button>
                {(dispute.status === "pending" || dispute.status === "under_review") && onAction && (
                  <Button size="sm" onClick={() => onAction(dispute, "resolve")}>
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Resolve
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <MarketplaceDisputeDetailsModal dispute={dispute} open={showDetailsModal} onOpenChange={setShowDetailsModal} />
    </>
  )
}
