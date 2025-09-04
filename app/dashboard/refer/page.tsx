"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Copy,
  Users,
  Gift,
  TrendingUp,
  Award,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Search,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface ReferralTarget {
  id: number
  packageTitle: string
  targetUser: number
  prizeType: string
  prizeTitle: string
  image: string
  status: string
  completions: number
}

interface ReferralSettings {
  referPageTitle: string
  referPageText: string
  status: boolean
  [key: string]: any
}

interface UserProgress {
  targetId: number
  currentProgress: number
  isCompleted: boolean
  appliedForPrize: boolean
}

interface ReferredUser {
  id: string
  joiningDate: string
  userId: string
  fullName: string
  email: string
  country: string
  status: "completed" | "pending"
  type: "VIP" | "Regular"
}

interface ReferralData {
  referralCode: string | null
  statistics: {
    total: number
    completed: number
    pending: number
    vip: number
  }
  referrals: ReferredUser[]
}

export default function ReferPage() {
  const { toast } = useToast()
  const [referralTargets, setReferralTargets] = useState<ReferralTarget[]>([])
  const [userProgress, setUserProgress] = useState<UserProgress[]>([])
  const [referralSettings, setReferralSettings] = useState<ReferralSettings>({
    referPageTitle: "Vip Refer",
    referPageText: "",
    status: true,
  })
  const [referralLink, setReferralLink] = useState("")
  const [loading, setLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const [referralData, setReferralData] = useState<ReferralData>({
    referralCode: null,
    statistics: { total: 0, completed: 0, pending: 0, vip: 0 },
    referrals: [],
  })
  const [dataLoading, setDataLoading] = useState(true)

  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all") // all, vip, regular
  const usersPerPage = 10

  useEffect(() => {
    const loadData = async () => {
      try {
        setDataLoading(true)

        // Load referral targets from admin settings (keep this for targets)
        const savedTargets = localStorage.getItem("admin-referral-targets")
        const savedSettings = localStorage.getItem("admin-referral-settings")

        if (savedTargets) {
          const targets = JSON.parse(savedTargets)
          setReferralTargets(targets.filter((target: ReferralTarget) => target.status === "active"))
        }

        if (savedSettings) {
          setReferralSettings(JSON.parse(savedSettings))
        }

        console.log("[v0] Fetching referral data from API...")

        // Fetch real referral data from API
        const response = await fetch("/api/referrals")
        console.log("[v0] Referrals API response status:", response.status)

        if (response.ok) {
          const data: ReferralData = await response.json()
          console.log("[v0] Referrals API data:", data)
          setReferralData(data)

          // Generate or get referral code
          if (!data.referralCode) {
            console.log("[v0] No referral code found, generating new one...")
            const codeResponse = await fetch("/api/referrals/generate-code", { method: "POST" })
            console.log("[v0] Generate code API response status:", codeResponse.status)

            if (codeResponse.ok) {
              const { code } = await codeResponse.json()
              console.log("[v0] Generated referral code:", code)
              setReferralData((prev) => ({ ...prev, referralCode: code }))
              setReferralLink(`${window.location.origin}/register?ref=${code}`)
            } else {
              const errorText = await codeResponse.text()
              console.error("[v0] Failed to generate referral code:", errorText)
            }
          } else {
            console.log("[v0] Using existing referral code:", data.referralCode)
            setReferralLink(`${window.location.origin}/register?ref=${data.referralCode}`)
          }
        } else {
          const errorText = await response.text()
          console.error("[v0] Failed to fetch referral data:", response.status, errorText)
          toast({
            title: "Error",
            description: `Failed to load referral data: ${response.status}. Please refresh the page.`,
            variant: "destructive",
          })
        }

        setIsInitialized(true)
      } catch (error) {
        console.error("[v0] Error loading referral data:", error)
        toast({
          title: "Error",
          description: "Failed to load referral data. Please refresh the page.",
          variant: "destructive",
        })
        setIsInitialized(true)
      } finally {
        setDataLoading(false)
      }
    }

    loadData()
  }, [toast])

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink)
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    })
  }

  const handleApplyForPrize = async (targetId: number) => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update user progress
      setUserProgress((prev) => prev.map((p) => (p.targetId === targetId ? { ...p, appliedForPrize: true } : p)))

      toast({
        title: "Success!",
        description: "Prize application submitted successfully. You will receive your reward soon!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to apply for prize. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getTargetProgress = (targetId: number) => {
    return userProgress.find((p) => p.targetId === targetId)
  }

  const filteredUsers = referralData.referrals.filter((user) => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userId.includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.country.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter =
      filterType === "all" ||
      (filterType === "vip" && user.type === "VIP") ||
      (filterType === "regular" && user.type === "Regular")
    return matchesSearch && matchesFilter
  })

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage)
  const startIndex = (currentPage - 1) * usersPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage)

  const vipUsers = referralData.referrals.filter((user) => user.type === "VIP")
  const regularUsers = referralData.referrals.filter((user) => user.type === "Regular")

  if (!isInitialized || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading referral data...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <DashboardHeader
        title={referralSettings.referPageTitle}
        description="Earn money by referring friends and completing targets"
      />

      <div className="flex-1 overflow-auto">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white p-4 mx-6 mt-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-white/20 text-white font-semibold backdrop-blur-sm">
                <Gift className="h-3 w-3 mr-1" />
                Notice
              </Badge>
              <span className="text-sm">
                You earn money because people do the job you get a commission, and even if someone deposits you will
                earn money
                <span className="ml-2 text-blue-200">airdrop : djdjd completed</span>
                <span className="ml-2 text-blue-200">airdrop : doge airdrop completed</span>
                <span className="ml-2 text-blue-200">airdrop : lun</span>
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Referrals</p>
                    <p className="text-2xl font-bold text-blue-900">{referralData.statistics.total}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Completed Referrals</p>
                    <p className="text-2xl font-bold text-green-900">{referralData.statistics.completed}</p>
                  </div>
                  <Award className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">VIP Referrals</p>
                    <p className="text-2xl font-bold text-orange-900">{referralData.statistics.vip}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Pending Referrals</p>
                    <p className="text-2xl font-bold text-purple-900">{referralData.statistics.pending}</p>
                  </div>
                  <Gift className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-8 shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {referralSettings.referPageTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <div className="space-y-3 text-sm text-gray-700 mb-6">
                    {referralSettings.referPageText.split("\n").map((line, index) => (
                      <p key={index} className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        {line.replace("*", "").trim()}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="lg:w-80">
                  <Label htmlFor="referralLink" className="text-sm font-medium text-gray-700 mb-2 block">
                    Your Referral Link:
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="referralLink"
                      value={referralLink}
                      readOnly
                      className="text-sm bg-gray-50 border-gray-200"
                    />
                    <Button
                      onClick={copyReferralLink}
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-4"
                      disabled={!referralLink}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  {referralData.referralCode && (
                    <p className="text-xs text-gray-500 mt-1">
                      Your referral code: <span className="font-mono font-semibold">{referralData.referralCode}</span>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-indigo-50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-purple-700">VIP Referred Users</CardTitle>
                    <p className="text-sm text-purple-600 mt-1">Users who completed requirements</p>
                  </div>
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200 px-3 py-1 font-semibold">
                    {vipUsers.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vipUsers.length === 0 ? (
                    <p className="text-center text-sm text-purple-600 py-4">No VIP users yet</p>
                  ) : (
                    <>
                      {vipUsers.slice(0, 3).map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {user.fullName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{user.fullName}</p>
                              <p className="text-xs text-gray-500">
                                ID: {user.userId} • {user.country}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                            VIP
                          </Badge>
                        </div>
                      ))}
                      {vipUsers.length > 3 && (
                        <p className="text-center text-sm text-purple-600 font-medium">
                          +{vipUsers.length - 3} more VIP users
                        </p>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-green-700">Regular Referred Users</CardTitle>
                    <p className="text-sm text-green-600 mt-1">New users from your referrals</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1 font-semibold">
                    {regularUsers.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {regularUsers.length === 0 ? (
                    <p className="text-center text-sm text-green-600 py-4">No regular users yet</p>
                  ) : (
                    <>
                      {regularUsers.slice(0, 3).map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-100"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {user.fullName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{user.fullName}</p>
                              <p className="text-xs text-gray-500">
                                ID: {user.userId} • {user.country}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                            Regular
                          </Badge>
                        </div>
                      ))}
                      {regularUsers.length > 3 && (
                        <p className="text-center text-sm text-green-600 font-medium">
                          +{regularUsers.length - 3} more regular users
                        </p>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 mb-8">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Referred Users Directory
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Track and communicate with users you've referred</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button
                    variant={filterType === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("all")}
                    className="text-xs"
                  >
                    All ({referralData.statistics.total})
                  </Button>
                  <Button
                    variant={filterType === "vip" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("vip")}
                    className="text-xs bg-purple-600 hover:bg-purple-700"
                  >
                    VIP ({vipUsers.length})
                  </Button>
                  <Button
                    variant={filterType === "regular" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("regular")}
                    className="text-xs bg-green-600 hover:bg-green-700"
                  >
                    Regular ({regularUsers.length})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {referralData.referrals.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Users className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Referrals Yet</h3>
                  <p className="text-gray-600">Share your referral link to start earning rewards!</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            #
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Joining Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Full Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Country
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedUsers.map((user, index) => (
                          <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {startIndex + index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.joiningDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-mono">
                                {user.userId}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    user.type === "VIP"
                                      ? "bg-gradient-to-r from-purple-500 to-indigo-500"
                                      : "bg-gradient-to-r from-green-500 to-emerald-500"
                                  }`}
                                >
                                  <span className="text-white text-xs font-bold">
                                    {user.fullName
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </span>
                                </div>
                                <span className="font-medium text-gray-900">{user.fullName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded border">
                                {user.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.country}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge
                                variant={user.type === "VIP" ? "default" : "secondary"}
                                className={
                                  user.type === "VIP"
                                    ? "bg-purple-100 text-purple-800 border-purple-200"
                                    : "bg-green-100 text-green-800 border-green-200"
                                }
                              >
                                {user.type}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Link href={`/dashboard/messages?user=${user.userId}`}>
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                  <MessageCircle className="w-4 h-4 mr-1" />
                                  Chat
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
                      <div className="text-sm text-gray-600">
                        Showing {startIndex + 1} to {Math.min(startIndex + usersPerPage, filteredUsers.length)} of{" "}
                        {filteredUsers.length} users
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="text-gray-600 border-gray-300"
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Previous
                        </Button>
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = i + 1
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className={`w-8 h-8 p-0 ${
                                  currentPage === pageNum ? "bg-blue-600 text-white" : "text-gray-600 border-gray-300"
                                }`}
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                          {totalPages > 5 && (
                            <>
                              <span className="text-gray-400">...</span>
                              <Button
                                variant={currentPage === totalPages ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(totalPages)}
                                className={`w-8 h-8 p-0 ${
                                  currentPage === totalPages
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-600 border-gray-300"
                                }`}
                              >
                                {totalPages}
                              </Button>
                            </>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="text-gray-600 border-gray-300"
                        >
                          Next
                          <ChevronRight className="w-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {referralTargets.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Gift className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Referral Targets</h3>
              <p className="text-gray-600">Check back later for new referral opportunities!</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
