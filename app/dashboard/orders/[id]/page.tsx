"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Clock, MessageCircle, Upload, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  marketplaceOrderManager,
  type MarketplaceOrder,
  formatOrderStatus,
  getOrderStatusColor,
} from "@/lib/marketplace-orders"
import { useAuth } from "@/contexts/auth-context"

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const orderId = params.id as string

  const [order, setOrder] = useState<MarketplaceOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [deliveryMessage, setDeliveryMessage] = useState("")
  const [deliveryFiles, setDeliveryFiles] = useState<string[]>([])
  const [disputeReason, setDisputeReason] = useState("")
  const [disputeDetails, setDisputeDetails] = useState("")
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false)
  const [showDisputeDialog, setShowDisputeDialog] = useState(false)
  const [requirements, setRequirements] = useState("")
  const [showRequirementsDialog, setShowRequirementsDialog] = useState(false)
  const [requirementsLoading, setRequirementsLoading] = useState(false)

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const loadOrder = () => {
    setLoading(true)
    try {
      const foundOrder = marketplaceOrderManager.getOrder(orderId)
      if (!foundOrder) {
        console.log(`[v0] Order not found: ${orderId}`)
        setOrder(null)
      } else {
        console.log(`[v0] Loaded order: ${foundOrder.id}`)
        setOrder(foundOrder)
      }
    } catch (error) {
      console.error("[v0] Error loading order:", error)
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptOrder = async () => {
    if (!order || !user) return
    setActionLoading(true)
    try {
      const success = marketplaceOrderManager.acceptOrder(order.id, user.id)
      if (success) {
        loadOrder()
      } else {
        alert("Failed to accept order. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error accepting order:", error)
      alert("An error occurred while accepting the order.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeclineOrder = async () => {
    if (!order || !user) return
    setActionLoading(true)
    try {
      const success = marketplaceOrderManager.declineOrder(order.id, user.id)
      if (success) {
        loadOrder()
      } else {
        alert("Failed to decline order. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error declining order:", error)
      alert("An error occurred while declining the order.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmitDelivery = async () => {
    if (!order || !user || !deliveryMessage.trim()) return
    setActionLoading(true)
    try {
      const success = marketplaceOrderManager.submitDelivery(order.id, user.id, {
        files: deliveryFiles,
        message: deliveryMessage,
      })
      if (success) {
        setShowDeliveryDialog(false)
        setDeliveryMessage("")
        setDeliveryFiles([])
        loadOrder()
      } else {
        alert("Failed to submit delivery. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error submitting delivery:", error)
      alert("An error occurred while submitting delivery.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleReleasePayment = async () => {
    if (!order || !user) return
    setActionLoading(true)
    try {
      const success = marketplaceOrderManager.releasePayment(order.id, user.id)
      if (success) {
        loadOrder()
        alert("Payment released successfully! The seller has been paid.")
      } else {
        alert("Failed to release payment. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error releasing payment:", error)
      alert("An error occurred while releasing payment.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenDispute = async () => {
    if (!order || !user || !disputeReason.trim() || !disputeDetails.trim()) return
    setActionLoading(true)
    try {
      const success = marketplaceOrderManager.openDispute(order.id, user.id, disputeReason, disputeDetails)
      if (success) {
        setShowDisputeDialog(false)
        setDisputeReason("")
        setDisputeDetails("")
        loadOrder()
        alert("Dispute opened successfully. An admin will review your case.")
      } else {
        alert("Failed to open dispute. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error opening dispute:", error)
      alert("An error occurred while opening dispute.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!order || !user || !newMessage.trim()) return

    const senderType = order.buyerId === user.id ? "buyer" : "seller"
    const success = marketplaceOrderManager.addMessage(order.id, user.id, senderType, newMessage)

    if (success) {
      setNewMessage("")
      loadOrder()
    } else {
      alert("Failed to send message. Please try again.")
    }
  }

  const handleSubmitRequirements = async () => {
    if (!order || !user || !requirements.trim()) return
    setRequirementsLoading(true)
    try {
      const success = marketplaceOrderManager.updateOrderRequirements(order.id, user.id, requirements)
      if (success) {
        setShowRequirementsDialog(false)
        setRequirements("")
        loadOrder()
        alert("Requirements submitted successfully!")
      } else {
        alert("Failed to submit requirements. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error submitting requirements:", error)
      alert("An error occurred while submitting requirements.")
    } finally {
      setRequirementsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
          <p className="text-gray-600 mb-6">The order you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.push("/dashboard/orders")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please log in to view this order.</p>
          <Button onClick={() => router.push("/login")}>Log In</Button>
        </div>
      </div>
    )
  }

  const hasAccess = order.buyerId === user.id || order.sellerId === user.id
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to view this order.</p>
          <Button onClick={() => router.push("/dashboard/orders")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </div>
      </div>
    )
  }

  const isBuyer = order.buyerId === user.id
  const isSeller = order.sellerId === user.id
  const hasRequirements = order.requirements && order.requirements.trim() !== ""
  const requirementsSubmitted = hasRequirements // Once requirements exist, they're considered submitted
  const canEditRequirements =
    isBuyer && ["awaiting_acceptance", "pending"].includes(order.status) && !requirementsSubmitted

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push("/dashboard/orders")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
              <p className="text-gray-600">{order.serviceName}</p>
            </div>
            <Badge className={getOrderStatusColor(order.status)}>{formatOrderStatus(order.status)}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Info */}
            <Card>
              <CardHeader>
                <CardTitle>Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Service</p>
                    <p className="font-medium">{order.serviceName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tier</p>
                    <p className="font-medium capitalize">{order.tier}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Price</p>
                    <p className="font-medium">${order.price}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Delivery Time</p>
                    <p className="font-medium">{order.deliveryTime} days</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Requirements</p>
                  <p className="mt-1">{order.requirements}</p>
                </div>

                {order.deliverables && (
                  <div>
                    <p className="text-sm text-gray-600">Deliverables</p>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p>{order.deliverables.message}</p>
                      {order.deliverables.files.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">Files:</p>
                          <ul className="list-disc list-inside">
                            {order.deliverables.files.map((file, index) => (
                              <li key={index} className="text-sm">
                                {file}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Project Requirements</span>
                  {canEditRequirements && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRequirements("")
                        setShowRequirementsDialog(true)
                      }}
                    >
                      Add Requirements
                    </Button>
                  )}
                  {requirementsSubmitted && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      ✓ Submitted
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasRequirements ? (
                  <div>
                    {requirementsSubmitted && (
                      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center text-green-800">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          <span className="text-sm font-medium">Requirements submitted successfully</span>
                        </div>
                        <p className="text-xs text-green-700 mt-1">
                          Your project requirements have been sent to the seller and cannot be modified.
                        </p>
                      </div>
                    )}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.requirements}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <MessageCircle className="mx-auto h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No requirements provided</h3>
                    <p className="text-gray-600 mb-4">
                      {isBuyer
                        ? "Please provide detailed requirements for your project to help the seller understand what you need."
                        : "Waiting for the buyer to provide project requirements."}
                    </p>
                    {canEditRequirements && (
                      <Button onClick={() => setShowRequirementsDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                        Add Requirements
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Messages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {order.messages.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No messages yet</p>
                  ) : (
                    order.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg ${
                          message.senderId === user.id ? "bg-blue-50 ml-8" : "bg-gray-50 mr-8"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            {message.senderId === user.id ? "You" : message.senderType}
                          </span>
                          <span className="text-xs text-gray-500">{new Date(message.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-sm">{message.message}</p>
                        {message.files && message.files.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">Files:</p>
                            <ul className="list-disc list-inside">
                              {message.files.map((file, index) => (
                                <li key={index} className="text-sm">
                                  {file}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Send Message */}
                <div className="mt-4 space-y-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    Send Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {/* Order Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Seller Actions */}
                {isSeller && order.status === "awaiting_acceptance" && (
                  <>
                    <Button
                      onClick={handleAcceptOrder}
                      disabled={actionLoading}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {actionLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Accepting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Accept Order
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDeclineOrder}
                      disabled={actionLoading}
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Decline
                    </Button>
                  </>
                )}

                {isSeller && order.status === "in_progress" && (
                  <Button onClick={() => setShowDeliveryDialog(true)} className="w-full">
                    <Upload className="mr-2 h-4 w-4" />
                    Submit Delivery
                  </Button>
                )}

                {/* Buyer Actions */}
                {isBuyer && order.status === "delivered" && (
                  <>
                    <Button
                      onClick={handleReleasePayment}
                      disabled={actionLoading}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {actionLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Releasing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Release Payment
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDisputeDialog(true)}
                      className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Open Dispute
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <div>
                      <p className="font-medium">Order Created</p>
                      <p className="text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {order.acceptedAt && (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <div>
                        <p className="font-medium">Order Accepted</p>
                        <p className="text-gray-500">{new Date(order.acceptedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {order.deliveredAt && (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      <div>
                        <p className="font-medium">Order Delivered</p>
                        <p className="text-gray-500">{new Date(order.deliveredAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {order.completedAt && (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                      <div>
                        <p className="font-medium">Order Completed</p>
                        <p className="text-gray-500">{new Date(order.completedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Requirements Dialog */}
        <Dialog open={showRequirementsDialog} onOpenChange={setShowRequirementsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Project Requirements</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center text-amber-800">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Important: One-time submission only</span>
                </div>
                <p className="text-xs text-amber-700 mt-1">
                  Requirements can only be submitted once and cannot be modified afterward. Please ensure all details
                  are complete and accurate.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Project Requirements *</label>
                <Textarea
                  placeholder="Please provide detailed requirements for your project:&#10;&#10;• What exactly do you need?&#10;• Any specific features or functionality?&#10;• Design preferences or style requirements?&#10;• Timeline expectations?&#10;• Any files or references you can provide?&#10;• Special instructions or considerations?"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={12}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Be as detailed as possible to help the seller understand your needs and deliver exactly what you want.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">💡 Tips for better requirements:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Be specific about what you want</li>
                  <li>• Include examples or references if possible</li>
                  <li>• Mention any technical requirements</li>
                  <li>• Specify your target audience or use case</li>
                  <li>• Include any branding guidelines or preferences</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowRequirementsDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitRequirements}
                  disabled={!requirements.trim() || requirementsLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {requirementsLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Submit Requirements (Final)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delivery Dialog */}
        <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Delivery</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Delivery Message</label>
                <Textarea
                  placeholder="Describe what you've delivered..."
                  value={deliveryMessage}
                  onChange={(e) => setDeliveryMessage(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowDeliveryDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitDelivery} disabled={!deliveryMessage.trim() || actionLoading}>
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Submit Delivery
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dispute Dialog */}
        <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Open Dispute</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Reason</label>
                <Textarea
                  placeholder="Brief reason for dispute..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Details</label>
                <Textarea
                  placeholder="Detailed explanation of the issue..."
                  value={disputeDetails}
                  onChange={(e) => setDisputeDetails(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowDisputeDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleOpenDispute}
                  disabled={!disputeReason.trim() || !disputeDetails.trim() || actionLoading}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Opening...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Open Dispute
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
