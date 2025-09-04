"use client"

import { useState, useEffect } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  getMarketplaceDisputes,
  resolveMarketplaceDispute,
  escalateMarketplaceDispute,
  formatMarketplaceDisputeStatus,
  getMarketplaceDisputeStatusColor,
  getMarketplaceDisputePriorityColor,
  type MarketplaceDispute,
} from "@/lib/marketplace-disputes"
import { marketplaceOrderManager, type MarketplaceOrder } from "@/lib/marketplace-orders"
import {
  Search,
  AlertTriangle,
  Clock,
  CheckCircle,
  Eye,
  Package,
  DollarSign,
  RefreshCw,
  Filter,
  Flag,
  MessageCircle,
  ShoppingCart,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface MarketplaceDisputeDetails {
  dispute: MarketplaceDispute
  order: MarketplaceOrder | null
}

export default function AdminMarketplaceDisputesPage() {
  const [disputes, setDisputes] = useState<MarketplaceDispute[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [selectedDispute, setSelectedDispute] = useState<MarketplaceDispute | null>(null)
  const [disputeDetails, setDisputeDetails] = useState<MarketplaceDisputeDetails | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showResolutionDialog, setShowResolutionDialog] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState("")
  const [resolutionDecision, setResolutionDecision] = useState<"refund_buyer" | "pay_seller" | "partial_refund">("")
  const [isResolving, setIsResolving] = useState(false)

  useEffect(() => {
    loadDisputes()
  }, [searchQuery, statusFilter, priorityFilter])

  const loadDisputes = async () => {
    setLoading(true)
    try {
      console.log(`[v0] Loading marketplace disputes with filters:`, { searchQuery, statusFilter, priorityFilter })

      const filters: any = {}
      if (searchQuery) filters.search = searchQuery
      if (statusFilter !== "all") filters.status = statusFilter
      if (priorityFilter !== "all") filters.priority = priorityFilter

      const disputesData = await getMarketplaceDisputes(filters)

      console.log(`[v0] Loaded ${disputesData.length} marketplace disputes`)
      setDisputes(disputesData)
    } catch (error) {
      console.error("Failed to load marketplace disputes:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadDisputeDetails = async (dispute: MarketplaceDispute) => {
    try {
      console.log("[v0] Loading marketplace dispute details for:", dispute.id)

      // Get order details
      const order = marketplaceOrderManager.getOrder(dispute.orderId)
      console.log("[v0] Found order:", order?.id, "status:", order?.status)

      const details: MarketplaceDisputeDetails = {
        dispute,
        order,
      }

      setDisputeDetails(details)
      console.log("[v0] Marketplace dispute details loaded successfully")
    } catch (error) {
      console.error("[v0] Failed to load marketplace dispute details:", error)
    }
  }

  const handleViewDetails = async (dispute: MarketplaceDispute) => {
    setSelectedDispute(dispute)
    await loadDisputeDetails(dispute)
    setShowDetailsDialog(true)
  }

  const handleResolveDispute = async () => {
    if (!selectedDispute || !resolutionDecision || !resolutionNotes.trim()) {
      alert("Please provide resolution decision and notes")
      return
    }

    if (isResolving) {
      console.log("[v0] Resolution already in progress, ignoring duplicate request")
      return
    }

    setIsResolving(true)

    try {
      console.log(`[v0] Resolving marketplace dispute: ${selectedDispute.id} with decision: ${resolutionDecision}`)

      await resolveMarketplaceDispute(selectedDispute.id, {
        decision: resolutionDecision,
        adminNotes: resolutionNotes,
        adminId: "current-admin", // This would come from auth context
      })

      await loadDisputes()
      setShowResolutionDialog(false)
      setSelectedDispute(null)
      setResolutionNotes("")
      setResolutionDecision("")
      alert("Marketplace dispute resolved successfully!")
    } catch (error) {
      console.error("Failed to resolve marketplace dispute:", error)
      if (error instanceof Error && error.message.includes("already resolved")) {
        alert("This marketplace dispute has already been resolved or is being processed.")
      } else {
        alert("Failed to resolve marketplace dispute. Please try again.")
      }
    } finally {
      setIsResolving(false)
    }
  }

  const handleEscalateDispute = async (disputeId: string) => {
    const reason = prompt("Please provide a reason for escalation:")
    if (!reason) return

    try {
      await escalateMarketplaceDispute(disputeId, reason)
      await loadDisputes()
      alert("Marketplace dispute escalated successfully!")
    } catch (error) {
      console.error("Failed to escalate marketplace dispute:", error)
      alert("Failed to escalate marketplace dispute. Please try again.")
    }
  }

  const filteredDisputes = disputes.filter((dispute) => {
    const matchesSearch =
      dispute.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.orderId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || dispute.status === statusFilter
    const matchesPriority = priorityFilter === "all" || dispute.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  // Calculate statistics
  const pendingDisputes = filteredDisputes.filter((d) => d.status === "pending" || d.status === "under_review")
  const resolvedToday = filteredDisputes.filter(
    (d) => d.status === "resolved" && new Date(d.updatedAt).toDateString() === new Date().toDateString(),
  )
  const highPriorityDisputes = filteredDisputes.filter((d) => d.priority === "high" || d.priority === "urgent")
  const totalAmount = filteredDisputes.reduce((sum, dispute) => sum + dispute.amount, 0)

  return (
    <>
      <AdminHeader
        title="Marketplace Dispute Resolution"
        description="Manage and resolve marketplace service order disputes"
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Disputes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredDisputes.length}</div>
                <p className="text-xs text-gray-500 mt-1">${totalAmount.toFixed(2)} in dispute</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{pendingDisputes.length}</div>
                <p className="text-xs text-gray-500 mt-1">Awaiting admin action</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{resolvedToday.length}</div>
                <p className="text-xs text-gray-500 mt-1">Completed resolutions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{highPriorityDisputes.length}</div>
                <p className="text-xs text-gray-500 mt-1">Urgent attention needed</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by service name, order ID, buyer, or seller..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-40">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={loadDisputes} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Disputes List */}
          <Tabs
            value={statusFilter === "all" ? "all" : statusFilter}
            onValueChange={setStatusFilter}
            className="space-y-6"
          >
            <TabsList>
              <TabsTrigger value="all">All Disputes ({filteredDisputes.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pendingDisputes.length})</TabsTrigger>
              <TabsTrigger value="under_review">Under Review</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter === "all" ? "all" : statusFilter}>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                </div>
              ) : filteredDisputes.length > 0 ? (
                <div className="space-y-4">
                  {filteredDisputes.map((dispute) => (
                    <Card key={dispute.id} className="hover:shadow-md transition-shadow">
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
                                <strong>Dispute Reason:</strong> {dispute.reason}
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
                                    Admin Resolution
                                  </h4>
                                  <span className="text-xs text-green-600">
                                    Resolved {formatDistanceToNow(new Date(dispute.updatedAt), { addSuffix: true })}
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-green-700">Decision:</span>
                                    <Badge className="bg-green-100 text-green-800 border-green-300">
                                      {dispute.resolution === "pay_seller" && "✅ Seller Paid"}
                                      {dispute.resolution === "refund_buyer" && "🔄 Buyer Refunded"}
                                      {dispute.resolution === "partial_refund" && "⚖️ Partial Resolution"}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-green-700">Payment:</span>
                                    <span className="text-sm font-medium text-green-800">
                                      {dispute.resolution === "pay_seller" &&
                                        `$${dispute.amount.toFixed(2)} → ${dispute.sellerName}`}
                                      {dispute.resolution === "refund_buyer" &&
                                        `$${dispute.amount.toFixed(2)} → ${dispute.buyerName} (Refund)`}
                                      {dispute.resolution === "partial_refund" &&
                                        `$${(dispute.amount * 0.5).toFixed(2)} each → Both parties`}
                                    </span>
                                  </div>

                                  {dispute.adminNotes && (
                                    <div className="mt-2">
                                      <span className="text-sm text-green-700">Admin Notes:</span>
                                      <p className="text-sm text-green-800 mt-1 italic">"{dispute.adminNotes}"</p>
                                    </div>
                                  )}

                                  {dispute.adminId && (
                                    <div className="flex items-center justify-between text-xs text-green-600">
                                      <span>Resolved by: {dispute.adminId}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(dispute)}
                              className="bg-transparent"
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              View Details
                            </Button>
                            {(dispute.status === "pending" || dispute.status === "under_review") && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedDispute(dispute)
                                    setShowResolutionDialog(true)
                                  }}
                                >
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Resolve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEscalateDispute(dispute.id)}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <Flag className="mr-1 h-3 w-3" />
                                  Escalate
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">No marketplace disputes found matching your criteria.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Marketplace Dispute Details</DialogTitle>
          </DialogHeader>
          {disputeDetails && (
            <div className="space-y-6">
              {/* Dispute Overview */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Dispute Overview</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Service Name:</span>
                    <span className="ml-2 font-medium">{disputeDetails.dispute.serviceName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Order ID:</span>
                    <span className="ml-2 font-medium">#{disputeDetails.dispute.orderId.slice(-8)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Buyer:</span>
                    <span className="ml-2 font-medium">{disputeDetails.dispute.buyerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Seller:</span>
                    <span className="ml-2 font-medium">{disputeDetails.dispute.sellerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount:</span>
                    <span className="ml-2 font-medium">${disputeDetails.dispute.amount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Service Tier:</span>
                    <Badge className="ml-2">{disputeDetails.dispute.tier}</Badge>
                  </div>
                  <div>
                    <span className="text-gray-600">Delivery Time:</span>
                    <span className="ml-2 font-medium">{disputeDetails.dispute.deliveryTime} days</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Priority:</span>
                    <Badge
                      className={`${getMarketplaceDisputePriorityColor(disputeDetails.dispute.priority)} border ml-2`}
                    >
                      {disputeDetails.dispute.priority}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-gray-600">Dispute Reason:</span>
                  <p className="mt-1 text-sm bg-white p-3 rounded border">{disputeDetails.dispute.reason}</p>
                </div>
                <div className="mt-3">
                  <span className="text-gray-600">Dispute Details:</span>
                  <p className="mt-1 text-sm bg-white p-3 rounded border">{disputeDetails.dispute.details}</p>
                </div>
              </div>

              {/* Order Information */}
              {disputeDetails.order && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Package className="mr-2 h-4 w-4" />
                    Original Order Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-600">Order Status:</span>
                        <Badge className="ml-2">{disputeDetails.order.status}</Badge>
                      </div>
                      <div>
                        <span className="text-gray-600">Created:</span>
                        <span className="ml-2 font-medium">
                          {formatDistanceToNow(new Date(disputeDetails.order.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {disputeDetails.order.acceptedAt && (
                        <div>
                          <span className="text-gray-600">Accepted:</span>
                          <span className="ml-2 font-medium">
                            {formatDistanceToNow(new Date(disputeDetails.order.acceptedAt), { addSuffix: true })}
                          </span>
                        </div>
                      )}
                      {disputeDetails.order.deliveredAt && (
                        <div>
                          <span className="text-gray-600">Delivered:</span>
                          <span className="ml-2 font-medium">
                            {formatDistanceToNow(new Date(disputeDetails.order.deliveredAt), { addSuffix: true })}
                          </span>
                        </div>
                      )}
                    </div>

                    {disputeDetails.order.requirements && (
                      <div>
                        <span className="text-gray-600">Order Requirements:</span>
                        <p className="mt-1 bg-white p-3 rounded border">{disputeDetails.order.requirements}</p>
                      </div>
                    )}

                    {disputeDetails.order.deliverables && (
                      <div>
                        <span className="text-gray-600">Seller's Deliverables:</span>
                        <div className="mt-1 bg-white p-3 rounded border">
                          <p className="mb-2">{disputeDetails.order.deliverables.message}</p>
                          {disputeDetails.order.deliverables.files.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {disputeDetails.order.deliverables.files.length} file(s) attached
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Submitted:{" "}
                            {formatDistanceToNow(new Date(disputeDetails.order.deliverables.submittedAt), {
                              addSuffix: true,
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Messages */}
              {disputeDetails.order && disputeDetails.order.messages.length > 0 && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Order Communication ({disputeDetails.order.messages.length} messages)
                  </h4>
                  <div className="max-h-60 overflow-y-auto space-y-3">
                    {disputeDetails.order.messages.map((message) => (
                      <div key={message.id} className="bg-white p-3 rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
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
                          <div className="text-xs text-gray-500 mt-1">{message.files.length} file(s) attached</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)} className="bg-transparent">
                  Close
                </Button>
                {(disputeDetails.dispute.status === "pending" || disputeDetails.dispute.status === "under_review") && (
                  <Button
                    onClick={() => {
                      setSelectedDispute(disputeDetails.dispute)
                      setShowDetailsDialog(false)
                      setShowResolutionDialog(true)
                    }}
                    disabled={isResolving}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {isResolving ? "Resolving..." : "Resolve Dispute"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolution Dialog */}
      <Dialog open={showResolutionDialog} onOpenChange={setShowResolutionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Marketplace Dispute</DialogTitle>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">{selectedDispute.serviceName}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Buyer:</span>
                    <span className="ml-2 font-medium">{selectedDispute.buyerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Seller:</span>
                    <span className="ml-2 font-medium">{selectedDispute.sellerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount:</span>
                    <span className="ml-2 font-medium">${selectedDispute.amount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Priority:</span>
                    <Badge className={getMarketplaceDisputePriorityColor(selectedDispute.priority)}>
                      {selectedDispute.priority}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-gray-600">Dispute Reason:</span>
                  <p className="mt-1 text-sm">{selectedDispute.reason}</p>
                </div>
                <div className="mt-2">
                  <span className="text-gray-600">Details:</span>
                  <p className="mt-1 text-sm">{selectedDispute.details}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Resolution Decision</label>
                  <Select value={resolutionDecision} onValueChange={setResolutionDecision}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select resolution decision" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pay_seller">Pay Seller - Release Full Payment</SelectItem>
                      <SelectItem value="refund_buyer">Refund Buyer - Full Refund</SelectItem>
                      <SelectItem value="partial_refund">Partial Resolution - Split Amount (50/50)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Admin Resolution Notes</label>
                  <Textarea
                    placeholder="Provide detailed explanation of your decision and reasoning..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={4}
                  />
                </div>

                {resolutionDecision && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {resolutionDecision === "pay_seller" &&
                        `This will release $${selectedDispute.amount.toFixed(2)} to ${selectedDispute.sellerName} and mark the order as completed.`}
                      {resolutionDecision === "refund_buyer" &&
                        `This will refund $${selectedDispute.amount.toFixed(2)} to ${selectedDispute.buyerName} and cancel the order.`}
                      {resolutionDecision === "partial_refund" &&
                        `This will give $${(selectedDispute.amount * 0.5).toFixed(2)} to ${selectedDispute.sellerName} and refund $${(selectedDispute.amount * 0.5).toFixed(2)} to ${selectedDispute.buyerName}.`}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResolutionDialog(false)
                    setResolutionNotes("")
                    setResolutionDecision("")
                  }}
                  className="bg-transparent"
                  disabled={isResolving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResolveDispute}
                  disabled={!resolutionDecision || !resolutionNotes.trim() || isResolving}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {isResolving ? "Resolving..." : "Resolve Dispute"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
