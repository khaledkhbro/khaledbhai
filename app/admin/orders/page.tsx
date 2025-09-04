"use client"

import { useState, useEffect } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  marketplaceOrderManager,
  formatOrderStatus,
  getOrderStatusColor,
  type MarketplaceOrder,
} from "@/lib/marketplace-orders"
import {
  Search,
  Filter,
  RefreshCw,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Eye,
  MessageCircle,
  Settings,
  Download,
  User,
  Truck,
  Flag,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<MarketplaceOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<MarketplaceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(null)
  const [adminNotes, setAdminNotes] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Order settings
  const [orderSettings, setOrderSettings] = useState({
    acceptanceWindowHours: 24,
    reviewPeriodDays: 3,
    autoReleasePayment: true,
  })

  useEffect(() => {
    loadOrders()
    loadSettings()

    // Set up periodic refresh
    const interval = setInterval(() => {
      marketplaceOrderManager.cleanupExpiredOrders()
      loadOrders()
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchTerm, statusFilter])

  const loadOrders = () => {
    setLoading(true)
    try {
      const allOrders = marketplaceOrderManager.getAllOrdersForAdmin()
      console.log("[v0] Loaded admin orders:", allOrders.length)
      setOrders(allOrders)
    } catch (error) {
      console.error("[v0] Error loading admin orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = () => {
    const settings = marketplaceOrderManager.getSettings()
    setOrderSettings(settings)
  }

  const filterOrders = () => {
    let filtered = [...orders]

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (order) =>
          order.serviceName.toLowerCase().includes(search) ||
          order.id.toLowerCase().includes(search) ||
          order.buyerId.toLowerCase().includes(search) ||
          order.sellerId.toLowerCase().includes(search),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    setFilteredOrders(filtered)
  }

  const handleResolveDispute = async (orderId: string, decision: "refund_buyer" | "pay_seller") => {
    setActionLoading(orderId)
    try {
      const success = marketplaceOrderManager.resolveDispute(
        orderId,
        "admin-user", // In real app, get from auth
        decision,
        adminNotes,
      )

      if (success) {
        loadOrders()
        setSelectedOrder(null)
        setAdminNotes("")
        alert(`Dispute resolved successfully. ${decision === "refund_buyer" ? "Buyer refunded" : "Seller paid"}.`)
      } else {
        alert("Failed to resolve dispute. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error resolving dispute:", error)
      alert("Failed to resolve dispute. Please try again.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdateSettings = () => {
    marketplaceOrderManager.updateSettings(orderSettings)
    alert("Order settings updated successfully!")
  }

  const exportOrders = () => {
    const csvContent = [
      ["Order ID", "Service", "Buyer", "Seller", "Status", "Price", "Created", "Completed"].join(","),
      ...filteredOrders.map((order) =>
        [
          order.id,
          `"${order.serviceName}"`,
          order.buyerId,
          order.sellerId,
          order.status,
          order.price,
          new Date(order.createdAt).toLocaleDateString(),
          order.completedAt ? new Date(order.completedAt).toLocaleDateString() : "",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `marketplace-orders-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getTimeRemaining = (deadline: string) => {
    const remaining = marketplaceOrderManager.getTimeRemaining(deadline)
    if (remaining.days === 0 && remaining.hours === 0 && remaining.minutes === 0) {
      return "Expired"
    }
    if (remaining.days > 0) {
      return `${remaining.days}d ${remaining.hours}h`
    }
    if (remaining.hours > 0) {
      return `${remaining.hours}h ${remaining.minutes}m`
    }
    return `${remaining.minutes}m`
  }

  // Calculate statistics
  const awaitingOrders = filteredOrders.filter((o) => o.status === "awaiting_acceptance")
  const activeOrders = filteredOrders.filter((o) => ["pending", "in_progress"].includes(o.status))
  const deliveredOrders = filteredOrders.filter((o) => o.status === "delivered")
  const completedOrders = filteredOrders.filter((o) => o.status === "completed")
  const disputedOrders = filteredOrders.filter((o) => ["disputed", "dispute_resolved"].includes(o.status))
  const cancelledOrders = filteredOrders.filter((o) => o.status === "cancelled")

  const totalRevenue = completedOrders.reduce((sum, order) => sum + order.price, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <>
      <AdminHeader title="Order Management" description="Monitor and manage all marketplace orders" />

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{filteredOrders.length}</p>
                  </div>
                  <Package className="h-6 w-6 text-gray-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-700 font-medium">Awaiting</p>
                    <p className="text-2xl font-bold text-yellow-800">{awaitingOrders.length}</p>
                  </div>
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Active</p>
                    <p className="text-2xl font-bold text-blue-800">{activeOrders.length}</p>
                  </div>
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700 font-medium">Delivered</p>
                    <p className="text-2xl font-bold text-purple-800">{deliveredOrders.length}</p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-700 font-medium">Disputes</p>
                    <p className="text-2xl font-bold text-red-800">{disputedOrders.length}</p>
                  </div>
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Revenue</p>
                    <p className="text-2xl font-bold text-green-800">${totalRevenue.toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Order Management</CardTitle>
                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Order Settings</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Acceptance Window (hours)</label>
                          <Input
                            type="number"
                            value={orderSettings.acceptanceWindowHours}
                            onChange={(e) =>
                              setOrderSettings({
                                ...orderSettings,
                                acceptanceWindowHours: Number(e.target.value),
                              })
                            }
                            min="1"
                            max="168"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Review Period (days)</label>
                          <Input
                            type="number"
                            value={orderSettings.reviewPeriodDays}
                            onChange={(e) =>
                              setOrderSettings({
                                ...orderSettings,
                                reviewPeriodDays: Number(e.target.value),
                              })
                            }
                            min="1"
                            max="30"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="autoRelease"
                            checked={orderSettings.autoReleasePayment}
                            onChange={(e) =>
                              setOrderSettings({
                                ...orderSettings,
                                autoReleasePayment: e.target.checked,
                              })
                            }
                          />
                          <label htmlFor="autoRelease" className="text-sm">
                            Auto-release payment after review period
                          </label>
                        </div>
                        <Button onClick={handleUpdateSettings} className="w-full">
                          Update Settings
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={exportOrders} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button onClick={loadOrders} variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by order ID, service name, or user..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="awaiting_acceptance">Awaiting Acceptance</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Tabs defaultValue="all" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="all">All Orders ({filteredOrders.length})</TabsTrigger>
                  <TabsTrigger value="disputed">Disputes ({disputedOrders.length})</TabsTrigger>
                  <TabsTrigger value="awaiting">Awaiting ({awaitingOrders.length})</TabsTrigger>
                  <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Buyer</TableHead>
                          <TableHead>Seller</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                              No orders found matching your criteria
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredOrders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{order.serviceName}</div>
                                  <div className="text-sm text-gray-500">#{order.id.slice(-8)}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {order.buyerId.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{order.buyerId}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {order.sellerId.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{order.sellerId}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={getOrderStatusColor(order.status)}>
                                  {formatOrderStatus(order.status)}
                                </Badge>
                                {order.acceptanceDeadline && order.status === "awaiting_acceptance" && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Expires: {getTimeRemaining(order.acceptanceDeadline)}
                                  </div>
                                )}
                                {order.reviewDeadline && order.status === "delivered" && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Review: {getTimeRemaining(order.reviewDeadline)}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="font-medium text-green-600">${order.price}</span>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</div>
                                <div className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-1">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                      <DialogHeader>
                                        <DialogTitle>Order Details</DialogTitle>
                                      </DialogHeader>
                                      {selectedOrder && (
                                        <div className="space-y-4">
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <label className="text-sm font-medium text-gray-600">Order ID</label>
                                              <p className="font-mono text-sm">{selectedOrder.id}</p>
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-600">Status</label>
                                              <Badge className={getOrderStatusColor(selectedOrder.status)}>
                                                {formatOrderStatus(selectedOrder.status)}
                                              </Badge>
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-600">Service</label>
                                              <p>{selectedOrder.serviceName}</p>
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-600">Price</label>
                                              <p className="font-semibold text-green-600">${selectedOrder.price}</p>
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-600">Buyer</label>
                                              <p>{selectedOrder.buyerId}</p>
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-600">Seller</label>
                                              <p>{selectedOrder.sellerId}</p>
                                            </div>
                                          </div>

                                          {selectedOrder.requirements && (
                                            <div>
                                              <label className="text-sm font-medium text-gray-600">Requirements</label>
                                              <p className="text-sm bg-gray-50 p-3 rounded mt-1">
                                                {selectedOrder.requirements}
                                              </p>
                                            </div>
                                          )}

                                          {selectedOrder.deliverables && (
                                            <div>
                                              <label className="text-sm font-medium text-gray-600">Deliverables</label>
                                              <div className="bg-gray-50 p-3 rounded mt-1">
                                                <p className="text-sm">{selectedOrder.deliverables.message}</p>
                                                {selectedOrder.deliverables.files.length > 0 && (
                                                  <p className="text-xs text-gray-500 mt-2">
                                                    {selectedOrder.deliverables.files.length} file(s) attached
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {selectedOrder.status === "disputed" && (
                                            <div className="space-y-4 border-t pt-4">
                                              <div>
                                                <label className="text-sm font-medium text-gray-600">
                                                  Dispute Reason
                                                </label>
                                                <p className="text-sm">{selectedOrder.disputeReason}</p>
                                              </div>
                                              {selectedOrder.disputeDetails && (
                                                <div>
                                                  <label className="text-sm font-medium text-gray-600">Details</label>
                                                  <p className="text-sm bg-red-50 p-3 rounded mt-1">
                                                    {selectedOrder.disputeDetails}
                                                  </p>
                                                </div>
                                              )}

                                              <div>
                                                <label className="text-sm font-medium text-gray-600">Admin Notes</label>
                                                <Textarea
                                                  placeholder="Add notes about your decision..."
                                                  value={adminNotes}
                                                  onChange={(e) => setAdminNotes(e.target.value)}
                                                  rows={3}
                                                />
                                              </div>

                                              <Alert>
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertDescription>
                                                  Choose your decision carefully. This action cannot be undone.
                                                </AlertDescription>
                                              </Alert>

                                              <div className="flex space-x-2">
                                                <Button
                                                  onClick={() => handleResolveDispute(selectedOrder.id, "refund_buyer")}
                                                  disabled={actionLoading === selectedOrder.id}
                                                  className="bg-blue-600 hover:bg-blue-700"
                                                >
                                                  {actionLoading === selectedOrder.id ? (
                                                    <>
                                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                      Processing...
                                                    </>
                                                  ) : (
                                                    <>
                                                      <User className="mr-2 h-4 w-4" />
                                                      Refund Buyer
                                                    </>
                                                  )}
                                                </Button>
                                                <Button
                                                  onClick={() => handleResolveDispute(selectedOrder.id, "pay_seller")}
                                                  disabled={actionLoading === selectedOrder.id}
                                                  className="bg-green-600 hover:bg-green-700"
                                                >
                                                  {actionLoading === selectedOrder.id ? (
                                                    <>
                                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                      Processing...
                                                    </>
                                                  ) : (
                                                    <>
                                                      <DollarSign className="mr-2 h-4 w-4" />
                                                      Pay Seller
                                                    </>
                                                  )}
                                                </Button>
                                              </div>
                                            </div>
                                          )}

                                          {selectedOrder.messages.length > 0 && (
                                            <div>
                                              <label className="text-sm font-medium text-gray-600">Messages</label>
                                              <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded mt-1 space-y-2">
                                                {selectedOrder.messages.map((message) => (
                                                  <div key={message.id} className="text-sm">
                                                    <div className="flex items-center space-x-2 mb-1">
                                                      <Badge variant="outline" className="text-xs">
                                                        {message.senderType}
                                                      </Badge>
                                                      <span className="text-xs text-gray-500">
                                                        {formatDistanceToNow(new Date(message.timestamp), {
                                                          addSuffix: true,
                                                        })}
                                                      </span>
                                                    </div>
                                                    <p>{message.message}</p>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </DialogContent>
                                  </Dialog>
                                  <Button variant="outline" size="sm">
                                    <MessageCircle className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="disputed">
                  <div className="space-y-4">
                    {disputedOrders.length === 0 ? (
                      <div className="text-center py-8">
                        <Flag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No disputed orders</h3>
                        <p className="text-gray-600">All orders are running smoothly</p>
                      </div>
                    ) : (
                      disputedOrders.map((order) => (
                        <Card key={order.id} className="border-red-200 bg-red-50">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="font-semibold text-lg">{order.serviceName}</h3>
                                <p className="text-sm text-gray-600">Order #{order.id.slice(-8)}</p>
                                <div className="flex items-center space-x-2 mt-2">
                                  <Badge className={getOrderStatusColor(order.status)}>
                                    {formatOrderStatus(order.status)}
                                  </Badge>
                                  <Badge variant="outline" className="text-green-600">
                                    ${order.price}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-600">
                                  Disputed {formatDistanceToNow(new Date(order.disputedAt!), { addSuffix: true })}
                                </div>
                              </div>
                            </div>

                            <div className="bg-white p-4 rounded-lg mb-4">
                              <h4 className="font-medium mb-2">Dispute Details:</h4>
                              <p className="text-sm text-gray-700 mb-2">
                                <strong>Reason:</strong> {order.disputeReason}
                              </p>
                              {order.disputeDetails && (
                                <p className="text-sm text-gray-700">
                                  <strong>Details:</strong> {order.disputeDetails}
                                </p>
                              )}
                            </div>

                            <div className="flex space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    onClick={() => setSelectedOrder(order)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    <Flag className="mr-2 h-4 w-4" />
                                    Resolve Dispute
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Resolve Dispute</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="bg-red-50 p-4 rounded-lg">
                                      <h4 className="font-medium mb-2">Dispute Information</h4>
                                      <p className="text-sm">
                                        <strong>Reason:</strong> {order.disputeReason}
                                      </p>
                                      {order.disputeDetails && (
                                        <p className="text-sm mt-1">
                                          <strong>Details:</strong> {order.disputeDetails}
                                        </p>
                                      )}
                                    </div>

                                    <div>
                                      <label className="text-sm font-medium">Admin Decision Notes</label>
                                      <Textarea
                                        placeholder="Explain your decision..."
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        rows={3}
                                      />
                                    </div>

                                    <div className="flex space-x-2">
                                      <Button
                                        onClick={() => handleResolveDispute(order.id, "refund_buyer")}
                                        disabled={actionLoading === order.id}
                                        className="bg-blue-600 hover:bg-blue-700"
                                      >
                                        Refund Buyer
                                      </Button>
                                      <Button
                                        onClick={() => handleResolveDispute(order.id, "pay_seller")}
                                        disabled={actionLoading === order.id}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        Pay Seller
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button variant="outline">
                                <MessageCircle className="mr-2 h-4 w-4" />
                                View Messages
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="awaiting">
                  <div className="space-y-4">
                    {awaitingOrders.map((order) => (
                      <Card key={order.id} className="border-yellow-200 bg-yellow-50">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{order.serviceName}</h3>
                              <p className="text-sm text-gray-600">Order #{order.id.slice(-8)}</p>
                              <div className="flex items-center space-x-2 mt-2">
                                <Badge className={getOrderStatusColor(order.status)}>
                                  {formatOrderStatus(order.status)}
                                </Badge>
                                <Badge variant="outline" className="text-green-600">
                                  ${order.price}
                                </Badge>
                              </div>
                            </div>
                            {order.acceptanceDeadline && (
                              <div className="text-right">
                                <div className="text-sm font-medium text-yellow-700">
                                  {getTimeRemaining(order.acceptanceDeadline)}
                                </div>
                                <div className="text-xs text-yellow-600">until expiry</div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="active">
                  <div className="space-y-4">
                    {activeOrders.map((order) => (
                      <Card key={order.id} className="border-blue-200 bg-blue-50">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{order.serviceName}</h3>
                              <p className="text-sm text-gray-600">Order #{order.id.slice(-8)}</p>
                              <div className="flex items-center space-x-2 mt-2">
                                <Badge className={getOrderStatusColor(order.status)}>
                                  {formatOrderStatus(order.status)}
                                </Badge>
                                <Badge variant="outline" className="text-green-600">
                                  ${order.price}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-600">
                                {order.status === "pending" ? "Waiting to start" : "In progress"}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
