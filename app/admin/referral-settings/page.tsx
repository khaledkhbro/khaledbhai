"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Plus, DollarSign, Search, Filter, Save, Trash2, Edit3, Users, TrendingUp } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

const defaultReferralTargets = [
  {
    id: 1,
    packageTitle: "invite 1 person",
    targetUser: 1,
    prizeType: "Amount",
    prizeTitle: "$0.05",
    image: "/dollar-icon.png",
    status: "active",
    completions: 245,
  },
  {
    id: 2,
    packageTitle: "invite 5 person",
    targetUser: 5,
    prizeType: "Amount",
    prizeTitle: "$0.25",
    image: "/dollar-icon.png",
    status: "active",
    completions: 89,
  },
  {
    id: 3,
    packageTitle: "invite 10 person",
    targetUser: 10,
    prizeType: "Amount",
    prizeTitle: "$0.50",
    image: "/dollar-icon.png",
    status: "active",
    completions: 34,
  },
  {
    id: 4,
    packageTitle: "invite 20 person",
    targetUser: 20,
    prizeType: "Amount",
    prizeTitle: "$1.00",
    image: "/dollar-icon.png",
    status: "active",
    completions: 12,
  },
  {
    id: 5,
    packageTitle: "invite 50 person",
    targetUser: 50,
    prizeType: "Amount",
    prizeTitle: "$5.00",
    image: "/dollar-icon.png",
    status: "inactive",
    completions: 3,
  },
]

const defaultReferralSettings = {
  // Commission Settings
  targetedJobCompletedBonus: 0.001,
  firstDepositCommission: 5.0,
  accountVerifyBonus: 0.01,
  microjobWorkBonus: 2.0,
  projectWorkBonus: 0.0,
  contestWorkBonus: 0.0,
  lifetimeCommissionMin: 0.05,
  lifetimeCommissionMax: 20.0,

  // Page Content
  referPageTitle: "Vip Refer",
  referPageText: `* Every Successfully Vip Refer For You Earn $

* To Become a Vip Refer * Refer Have To Complete 3 Job ✅ Or

* Refer have to Deposit Any Amount ✅

* Every refers and Vip Refer from You get lifetime commission it's can be ( 0.05-20% )✅

* Refer If Verify His Account You Earn $`,

  // System Settings
  status: true,
  requireJobCompletion: true,
  requireDeposit: false,
  minJobsForVip: 3,
  createdAt: "2021-10-07 17:56:00",
}

export default function ReferralSettingsPage() {
  const { toast } = useToast()
  const [targets, setTargets] = useState<any[]>([])
  const [referralSettings, setReferralSettings] = useState<any>({})
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingTarget, setEditingTarget] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const loadData = () => {
      try {
        const savedTargets = localStorage.getItem("admin-referral-targets")
        const savedSettings = localStorage.getItem("admin-referral-settings")

        if (savedTargets) {
          setTargets(JSON.parse(savedTargets))
        } else {
          setTargets(defaultReferralTargets)
          localStorage.setItem("admin-referral-targets", JSON.stringify(defaultReferralTargets))
        }

        if (savedSettings) {
          setReferralSettings(JSON.parse(savedSettings))
        } else {
          setReferralSettings(defaultReferralSettings)
          localStorage.setItem("admin-referral-settings", JSON.stringify(defaultReferralSettings))
        }

        setIsInitialized(true)
      } catch (error) {
        console.error("Error loading referral data:", error)
        setTargets(defaultReferralTargets)
        setReferralSettings(defaultReferralSettings)
        setIsInitialized(true)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    if (isInitialized && targets.length > 0) {
      localStorage.setItem("admin-referral-targets", JSON.stringify(targets))
    }
  }, [targets, isInitialized])

  useEffect(() => {
    if (isInitialized && Object.keys(referralSettings).length > 0) {
      localStorage.setItem("admin-referral-settings", JSON.stringify(referralSettings))
    }
  }, [referralSettings, isInitialized])

  const [newTarget, setNewTarget] = useState({
    packageTitle: "",
    targetUser: 0,
    prizeType: "Amount",
    prizeTitle: "",
    status: "active",
  })

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading referral settings...</p>
        </div>
      </div>
    )
  }

  const filteredTargets = targets.filter((target) => {
    const matchesSearch = target.packageTitle.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === "all" || target.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const handleAddTarget = async () => {
    if (!newTarget.packageTitle || !newTarget.targetUser || !newTarget.prizeTitle) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const target = {
      id: Date.now(),
      ...newTarget,
      image: "/dollar-icon.png",
      completions: 0,
    }
    setTargets([...targets, target])
    setNewTarget({
      packageTitle: "",
      targetUser: 0,
      prizeType: "Amount",
      prizeTitle: "",
      status: "active",
    })
    setIsAddDialogOpen(false)
    setIsLoading(false)
    toast({
      title: "Success",
      description: "New referral target has been created and saved successfully.",
    })
  }

  const handleEditTarget = (target: any) => {
    setEditingTarget(target)
    setNewTarget({
      packageTitle: target.packageTitle,
      targetUser: target.targetUser,
      prizeType: target.prizeType,
      prizeTitle: target.prizeTitle,
      status: target.status,
    })
    setIsAddDialogOpen(true)
  }

  const handleUpdateTarget = async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setTargets(targets.map((t) => (t.id === editingTarget.id ? { ...t, ...newTarget } : t)))
    setEditingTarget(null)
    setNewTarget({
      packageTitle: "",
      targetUser: 0,
      prizeType: "Amount",
      prizeTitle: "",
      status: "active",
    })
    setIsAddDialogOpen(false)
    setIsLoading(false)
    toast({
      title: "Success",
      description: "Referral target has been updated and saved successfully.",
    })
  }

  const handleDeleteTarget = async (id: number) => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))

    setTargets(targets.filter((t) => t.id !== id))
    setIsLoading(false)
    toast({
      title: "Success",
      description: "Referral target has been deleted and saved successfully.",
    })
  }

  const handleSaveSettings = async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    localStorage.setItem("admin-referral-settings", JSON.stringify(referralSettings))
    setIsLoading(false)
    toast({
      title: "Settings Saved",
      description: "All referral settings have been updated and saved successfully.",
    })
  }

  const updateReferralSettings = (updates: any) => {
    setReferralSettings({ ...referralSettings, ...updates })
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Referral Management</h1>
          <p className="text-gray-600 mt-2">Configure referral targets, commissions, and system settings</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {targets.reduce((sum, target) => sum + target.completions, 0)}
            </div>
            <div className="text-sm text-gray-500">Total Completions</div>
          </div>
          <Badge variant="outline" className="text-red-600 border-red-200 px-4 py-2">
            <Users className="w-4 h-4 mr-2" />
            Admin Panel
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Targets</p>
                <p className="text-2xl font-bold text-gray-900">
                  {targets.filter((t) => t.status === "active").length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rewards</p>
                <p className="text-2xl font-bold text-gray-900">
                  $
                  {targets
                    .reduce(
                      (sum, target) => sum + Number.parseFloat(target.prizeTitle.replace("$", "")) * target.completions,
                      0,
                    )
                    .toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Completion</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(targets.reduce((sum, target) => sum + target.completions, 0) / targets.length)}
                </p>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Status</p>
                <p className="text-2xl font-bold text-gray-900">{referralSettings.status ? "Active" : "Inactive"}</p>
              </div>
              <div className={`w-8 h-8 rounded-full ${referralSettings.status ? "bg-green-500" : "bg-red-500"}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-gray-900">Referral Targets</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Manage referral milestones and rewards</p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 shadow-md">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Target
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl">
                    {editingTarget ? "Edit Referral Target" : "Create New Target"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingTarget
                      ? "Update the referral target details"
                      : "Set up a new referral milestone with rewards"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="packageTitle" className="text-sm font-medium">
                      Package Title *
                    </Label>
                    <Input
                      id="packageTitle"
                      value={newTarget.packageTitle}
                      onChange={(e) => setNewTarget({ ...newTarget, packageTitle: e.target.value })}
                      placeholder="e.g., invite 1 person"
                      className="w-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="targetUser" className="text-sm font-medium">
                        Target Users *
                      </Label>
                      <Input
                        id="targetUser"
                        type="number"
                        min="1"
                        value={newTarget.targetUser}
                        onChange={(e) =>
                          setNewTarget({ ...newTarget, targetUser: Number.parseInt(e.target.value) || 0 })
                        }
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status" className="text-sm font-medium">
                        Status
                      </Label>
                      <Select
                        value={newTarget.status}
                        onValueChange={(value) => setNewTarget({ ...newTarget, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prizeTitle" className="text-sm font-medium">
                      Prize Amount *
                    </Label>
                    <Input
                      id="prizeTitle"
                      value={newTarget.prizeTitle}
                      onChange={(e) => setNewTarget({ ...newTarget, prizeTitle: e.target.value })}
                      placeholder="e.g., $0.05"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false)
                      setEditingTarget(null)
                      setNewTarget({
                        packageTitle: "",
                        targetUser: 0,
                        prizeType: "Amount",
                        prizeTitle: "",
                        status: "active",
                      })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={editingTarget ? handleUpdateTarget : handleAddTarget}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? "Processing..." : editingTarget ? "Update Target" : "Create Target"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search targets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold">#</TableHead>
                  <TableHead className="font-semibold">Package Title</TableHead>
                  <TableHead className="font-semibold">Target Users</TableHead>
                  <TableHead className="font-semibold">Prize Amount</TableHead>
                  <TableHead className="font-semibold">Completions</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTargets.map((target, index) => (
                  <TableRow key={target.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md">
                          <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-medium">{target.packageTitle}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {target.targetUser} users
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-600">{target.prizeTitle}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-600">{target.completions}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={target.status === "active" ? "default" : "secondary"}
                        className={
                          target.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }
                      >
                        {target.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditTarget(target)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteTarget(target.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-gray-900">System Configuration</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Configure commission rates and system behavior</p>
            </div>
            <Button
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 shadow-md"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          {/* Commission Settings */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-gray-900">Commission Settings</h3>
              <Badge variant="outline" className="text-green-600 border-green-200">
                Financial
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Job Completion Bonus ($)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={referralSettings.targetedJobCompletedBonus}
                  onChange={(e) =>
                    updateReferralSettings({
                      targetedJobCompletedBonus: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">First Deposit Commission (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={referralSettings.firstDepositCommission}
                  onChange={(e) =>
                    updateReferralSettings({
                      firstDepositCommission: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Account Verify Bonus ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={referralSettings.accountVerifyBonus}
                  onChange={(e) =>
                    updateReferralSettings({
                      accountVerifyBonus: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Microjob Work Bonus (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={referralSettings.microjobWorkBonus}
                  onChange={(e) =>
                    updateReferralSettings({
                      microjobWorkBonus: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Lifetime Commission Min (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={referralSettings.lifetimeCommissionMin}
                  onChange={(e) =>
                    updateReferralSettings({
                      lifetimeCommissionMin: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Lifetime Commission Max (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={referralSettings.lifetimeCommissionMax}
                  onChange={(e) =>
                    updateReferralSettings({
                      lifetimeCommissionMax: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* System Behavior */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-gray-900">System Behavior</h3>
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                Rules
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Referral System Status</Label>
                  <p className="text-xs text-gray-500">Enable or disable the entire referral system</p>
                </div>
                <Switch
                  checked={referralSettings.status}
                  onCheckedChange={(checked) => updateReferralSettings({ status: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Require Job Completion</Label>
                  <p className="text-xs text-gray-500">Require job completion for VIP status</p>
                </div>
                <Switch
                  checked={referralSettings.requireJobCompletion}
                  onCheckedChange={(checked) => updateReferralSettings({ requireJobCompletion: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Require Deposit</Label>
                  <p className="text-xs text-gray-500">Require deposit for VIP status</p>
                </div>
                <Switch
                  checked={referralSettings.requireDeposit}
                  onCheckedChange={(checked) => updateReferralSettings({ requireDeposit: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Minimum Jobs for VIP</Label>
                <Input
                  type="number"
                  min="1"
                  value={referralSettings.minJobsForVip}
                  onChange={(e) =>
                    updateReferralSettings({
                      minJobsForVip: Number.parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Page Content */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-gray-900">Page Content</h3>
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                Display
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Referral Page Title</Label>
                <Input
                  value={referralSettings.referPageTitle}
                  onChange={(e) =>
                    updateReferralSettings({
                      referPageTitle: e.target.value,
                    })
                  }
                  placeholder="Enter page title"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Referral Page Content</Label>
                <Textarea
                  rows={10}
                  value={referralSettings.referPageText}
                  onChange={(e) =>
                    updateReferralSettings({
                      referPageText: e.target.value,
                    })
                  }
                  placeholder="Enter the content that will be displayed on the referral page"
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
