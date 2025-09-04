"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  formatMarketplaceDisputeStatus,
  getMarketplaceDisputeStatusColor,
  getMarketplaceDisputePriorityColor,
  type MarketplaceDispute,
} from "@/lib/marketplace-disputes"
import { marketplaceOrderManager, type MarketplaceOrder } from "@/lib/marketplace-orders"
import {
  Package,
  Clock,
  DollarSign,
  MessageCircle,
  CheckCircle,
  AlertTriangle,
  FileText,
  Calendar,
  ShoppingCart,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface MarketplaceDisputeDetailsModalProps {
  dispute: MarketplaceDispute | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MarketplaceDisputeDetailsModal({ dispute, open, onOpenChange }: MarketplaceDisputeDetailsModalProps) {
  const [order, setOrder] = useState<MarketplaceOrder | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (dispute && open) {
      loadOrderDetails()
    }
  }, [dispute, open])

  const loadOrderDetails = async () => {
    if (!dispute) return

    setLoading(true)
    try {
      const orderData = marketplaceOrderManager.getOrder(dispute.orderId)
      setOrder(orderData)
    } catch (error) {
      console.error("Failed to load order details:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!dispute) return null

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5" />
            <span>Marketplace Dispute Details</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dispute Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dispute Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-xl">{dispute.serviceName}</h3>
                  <p className="text-sm text-gray-600">Dispute ID: {dispute.id}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={`${getMarketplaceDisputeStatusColor(dispute.status)} border`}>
                    {formatMarketplaceDisputeStatus(dispute.status)}
                  </Badge>
                  <Badge className={`${getMarketplaceDisputePriorityColor(dispute.priority)} border`}>
                    {dispute.priority} priority
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Amount</p>
                    <p className="font-semibold">${dispute.amount.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Service Tier</p>
                    <p className="font-semibold capitalize">{dispute.tier}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Delivery Time</p>
                    <p className="font-semibold">{dispute.deliveryTime} days</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-semibold">
                      {formatDistanceToNow(new Date(dispute.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{dispute.buyerName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-gray-600">Buyer</p>
                    <p className="font-medium">{dispute.buyerName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{dispute.sellerName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-gray-600">Seller</p>
                    <p className="font-medium">{dispute.sellerName}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dispute Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Dispute Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Dispute Reason</label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-red-600 border-red-200">
                    {disputeReasonLabels[dispute.reason] || dispute.reason}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Detailed Description</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
                  <p className="text-sm whitespace-pre-wrap">{dispute.details}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Information */}
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2">Loading order details...</span>
                </div>
              </CardContent>
            </Card>
          ) : order ? (
            <Tabs defaultValue="order-details" className="space-y-4">
              <TabsList>
                <TabsTrigger value="order-details">Order Details</TabsTrigger>
                <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
                <TabsTrigger value="communication">Communication</TabsTrigger>
              </TabsList>

              <TabsContent value="order-details">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Package className="mr-2 h-5 w-5" />
                      Original Order Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Order ID</label>
                        <p className="font-mono text-sm">#{order.id.slice(-8)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <Badge className="mt-1">{order.status}</Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Created</label>
                        <p className="text-sm">{formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}</p>
                      </div>
                      {order.deliveredAt && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Delivered</label>
                          <p className="text-sm">
                            {formatDistanceToNow(new Date(order.deliveredAt), { addSuffix: true })}
                          </p>
                        </div>
                      )}
                    </div>

                    {order.requirements && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Order Requirements</label>
                        <div className="mt-1 p-3 bg-blue-50 rounded-lg border">
                          <p className="text-sm">{order.requirements}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="deliverables">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <FileText className="mr-2 h-5 w-5" />
                      Seller's Deliverables
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {order.deliverables ? (
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Delivery Message</label>
                          <div className="mt-1 p-3 bg-green-50 rounded-lg border">
                            <p className="text-sm">{order.deliverables.message}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <label className="text-sm font-medium text-gray-600">Files Attached</label>
                            <p className="font-medium">{order.deliverables.files.length} file(s)</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Submitted</label>
                            <p className="font-medium">
                              {formatDistanceToNow(new Date(order.deliverables.submittedAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        {order.deliverables.files.length > 0 && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Attached Files</label>
                            <div className="mt-1 space-y-2">
                              {order.deliverables.files.map((file, index) => (
                                <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm">{file}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="mx-auto h-12 w-12 mb-4" />
                        <p>No deliverables submitted yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="communication">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <MessageCircle className="mr-2 h-5 w-5" />
                      Order Communication ({order.messages.length} messages)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {order.messages.length > 0 ? (
                      <div className="space-y-4 max-h-60 overflow-y-auto">
                        {order.messages.map((message) => (
                          <div key={message.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {message.senderType === "buyer" ? "B" : message.senderType === "seller" ? "S" : "A"}
                                  </AvatarFallback>
                                </Avatar>
                                <Badge variant="outline" className="text-xs">
                                  {message.senderType}
                                </Badge>
                                <span className="text-sm font-medium">{message.senderId}</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm">{message.message}</p>
                            {message.files && message.files.length > 0 && (
                              <div className="mt-2 text-xs text-gray-500">{message.files.length} file(s) attached</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <MessageCircle className="mx-auto h-12 w-12 mb-4" />
                        <p>No messages in this order</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-gray-500">
                  <Package className="mx-auto h-12 w-12 mb-4" />
                  <p>Order details not found</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resolution Information */}
          {dispute.status === "resolved" && dispute.resolution && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-green-800">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Resolution Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-green-700">Decision</label>
                    <Badge className="mt-1 bg-green-100 text-green-800 border-green-300">
                      {dispute.resolution === "pay_seller" && "✅ Seller Paid"}
                      {dispute.resolution === "refund_buyer" && "🔄 Buyer Refunded"}
                      {dispute.resolution === "partial_refund" && "⚖️ Partial Resolution"}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-green-700">Resolved</label>
                    <p className="text-sm font-medium">
                      {formatDistanceToNow(new Date(dispute.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-green-700">Payment Details</label>
                  <p className="text-sm font-medium text-green-800">
                    {dispute.resolution === "pay_seller" &&
                      `$${dispute.amount.toFixed(2)} released to ${dispute.sellerName}`}
                    {dispute.resolution === "refund_buyer" &&
                      `$${dispute.amount.toFixed(2)} refunded to ${dispute.buyerName}`}
                    {dispute.resolution === "partial_refund" && `$${(dispute.amount * 0.5).toFixed(2)} to each party`}
                  </p>
                </div>

                {dispute.adminNotes && (
                  <div>
                    <label className="text-sm font-medium text-green-700">Admin Notes</label>
                    <div className="mt-1 p-3 bg-white rounded-lg border border-green-200">
                      <p className="text-sm italic">"{dispute.adminNotes}"</p>
                    </div>
                  </div>
                )}

                {dispute.adminId && (
                  <div className="text-xs text-green-600">
                    <span>Resolved by: {dispute.adminId}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)} variant="outline" className="bg-transparent">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
