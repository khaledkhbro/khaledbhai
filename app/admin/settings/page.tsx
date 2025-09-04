"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Globe,
  Users,
  CreditCard,
  Mail,
  ToggleLeft,
  Save,
  RefreshCw,
  Percent,
  DollarSign,
  TrendingUp,
  Edit2,
  MessageSquare,
  Zap,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { AdminHeader } from "@/components/admin/admin-header"
import { getAdminFeeSettings, updateAdminFeeSettings, type AdminFeeSettings } from "@/lib/wallet"
import { currencyService, type Currency, type ExchangeRate } from "@/lib/currency"
import {
  getSupportPricingSettings,
  updateSupportPricingSettings,
  type SupportPricingSettings,
} from "@/lib/admin-commission"
import type { RevisionSettings } from "@/lib/admin-settings"
import { SellerLevelAdmin } from "@/components/admin/seller-level-admin"

const SETTINGS_KEYS = {
  PLATFORM: "admin_platform_settings",
  USER: "admin_user_settings",
  PAYMENT: "admin_payment_settings",
  FEATURE: "admin_feature_settings",
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [feeLoading, setFeeLoading] = useState(false)
  const [supportLoading, setSupportLoading] = useState(false)
  const [currencyLoading, setCurrencyLoading] = useState(false)
  const [reservationLoading, setReservationLoading] = useState(false)
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [exchangeRates, setExchangeRates] = useState<
    (ExchangeRate & { from_currency: Currency; to_currency: Currency })[]
  >([])
  const [editingRate, setEditingRate] = useState<string | null>(null)

  const [feeSettings, setFeeSettings] = useState<{
    deposit: AdminFeeSettings | null
    withdrawal: AdminFeeSettings | null
    transaction: AdminFeeSettings | null
    chat_transfer: AdminFeeSettings | null
    tip: AdminFeeSettings | null
  }>({
    deposit: null,
    withdrawal: null,
    transaction: null,
    chat_transfer: null,
    tip: null,
  })

  const [platformSettings, setPlatformSettings] = useState({
    siteName: "MicroJob Marketplace",
    siteDescription: "Connect with skilled freelancers for your projects",
    supportEmail: "support@marketplace.com",
    currency: "USD",
    timezone: "UTC",
    maintenanceMode: false,
  })

  const [userSettings, setUserSettings] = useState({
    allowRegistration: true,
    requireEmailVerification: true,
    requireProfileCompletion: false,
    maxJobsPerUser: 50,
    maxServicesPerUser: 20,
  })

  const [paymentSettings, setPaymentSettings] = useState({
    platformFeePercentage: 5,
    minimumWithdrawal: 10,
    paymentMethods: ["stripe", "paypal"],
    autoPayoutEnabled: true,
    payoutSchedule: "weekly",
  })

  const [featureSettings, setFeatureSettings] = useState({
    enableMicrojobs: true,
    enableMarketplace: true,
    enableWallet: true,
    enableReferrals: true,
    enableReviews: true,
    enableChat: false,
  })

  const [supportPricingSettings, setSupportPricingSettings] = useState<{
    free: SupportPricingSettings | null
    priority: SupportPricingSettings | null
  }>({
    free: null,
    priority: null,
  })

  const [revisionSettings, setRevisionSettings] = useState<RevisionSettings | null>(null)
  const [revisionSettingsLoaded, setRevisionSettingsLoaded] = useState(false)

  const [reservationSettings, setReservationSettings] = useState({
    isEnabled: true,
    defaultReservationMinutes: 60,
    maxReservationMinutes: 1440,
    timeUnit: "hours" as "minutes" | "hours",
  })

  const loadCurrencyData = async () => {
    try {
      const [currenciesData, ratesData] = await Promise.all([
        currencyService.getCurrencies(),
        currencyService.getAllExchangeRates(),
      ])

      setCurrencies(currenciesData)
      setExchangeRates(ratesData)
    } catch (error) {
      console.error("Error loading currency data:", error)
      toast.error("Failed to load currency data")
    }
  }

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const revisionResponse = await fetch("/api/admin/revision-settings")
        if (revisionResponse.ok) {
          const revisionData = await revisionResponse.json()
          setRevisionSettings(revisionData)
          setRevisionSettingsLoaded(true)
          console.log("[v0] Loaded revision settings from API:", revisionData)
        } else {
          console.error("Failed to load revision settings from API")
          setRevisionSettings({
            maxRevisionRequests: 2,
            revisionRequestTimeoutValue: 24,
            revisionRequestTimeoutUnit: "hours",
            rejectionResponseTimeoutValue: 24,
            rejectionResponseTimeoutUnit: "hours",
            enableAutomaticRefunds: true,
            refundOnRevisionTimeout: true,
            refundOnRejectionTimeout: true,
            enableRevisionWarnings: true,
            revisionPenaltyEnabled: false,
            revisionPenaltyAmount: 0,
          })
          setRevisionSettingsLoaded(true)
          toast.error("Failed to load revision settings")
        }

        // Load existing settings
        const savedPlatform = localStorage.getItem(SETTINGS_KEYS.PLATFORM)
        if (savedPlatform) {
          setPlatformSettings(JSON.parse(savedPlatform))
        }

        const savedUser = localStorage.getItem(SETTINGS_KEYS.USER)
        if (savedUser) {
          setUserSettings(JSON.parse(savedUser))
        }

        const savedPayment = localStorage.getItem(SETTINGS_KEYS.PAYMENT)
        if (savedPayment) {
          setPaymentSettings(JSON.parse(savedPayment))
        }

        const savedFeature = localStorage.getItem(SETTINGS_KEYS.FEATURE)
        if (savedFeature) {
          setFeatureSettings(JSON.parse(savedFeature))
        }

        const savedReservation = localStorage.getItem("admin_reservation_settings")
        if (savedReservation) {
          const parsed = JSON.parse(savedReservation)
          setReservationSettings({
            ...parsed,
            timeUnit: parsed.defaultReservationMinutes >= 60 ? "hours" : "minutes",
          })
        }

        // Load fee settings
        const [depositFees, withdrawalFees, transactionFees, chatTransferFees, tipFees] = await Promise.all([
          getAdminFeeSettings("deposit"),
          getAdminFeeSettings("withdrawal"),
          getAdminFeeSettings("transaction"),
          getAdminFeeSettings("chat_transfer"),
          getAdminFeeSettings("tip"),
        ])

        setFeeSettings({
          deposit: depositFees,
          withdrawal: withdrawalFees,
          transaction: transactionFees,
          chat_transfer: chatTransferFees,
          tip: tipFees,
        })

        const supportSettings = await getSupportPricingSettings()
        const freeSupport = supportSettings.find((s) => s.supportType === "free")
        const prioritySupport = supportSettings.find((s) => s.supportType === "priority")

        setSupportPricingSettings({
          free: freeSupport || null,
          priority: prioritySupport || null,
        })
      } catch (error) {
        console.error("Error loading settings:", error)
        setRevisionSettingsLoaded(true)
      }
    }

    loadSettings()
    loadCurrencyData()
  }, [])

  const handleSaveSettings = async (section: string) => {
    setLoading(true)
    try {
      let settingsToSave
      let apiEndpoint

      switch (section) {
        case "Platform":
          settingsToSave = platformSettings
          apiEndpoint = "/api/admin/platform-settings"
          break
        case "User":
          settingsToSave = userSettings
          apiEndpoint = "/api/admin/user-settings"
          break
        case "Payment":
          settingsToSave = paymentSettings
          apiEndpoint = "/api/admin/payment-settings"
          break
        case "Feature":
          settingsToSave = featureSettings
          apiEndpoint = "/api/admin/feature-settings"
          break
        default:
          throw new Error("Unknown settings section")
      }

      console.log(`[v0] Saving ${section} settings:`, settingsToSave)

      // Make API call to save settings
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settingsToSave),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save settings")
      }

      console.log(`[v0] ${section} settings saved successfully`)
      toast.success(`${section} settings have been saved successfully.`)
    } catch (error) {
      console.error(`[v0] Error saving ${section} settings:`, error)
      toast.error(`Failed to save ${section} settings: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveFeeSettings = async () => {
    setFeeLoading(true)
    try {
      const promises = []

      if (feeSettings.deposit) {
        promises.push(updateAdminFeeSettings("deposit", feeSettings.deposit))
      }
      if (feeSettings.withdrawal) {
        promises.push(updateAdminFeeSettings("withdrawal", feeSettings.withdrawal))
      }
      if (feeSettings.transaction) {
        promises.push(updateAdminFeeSettings("transaction", feeSettings.transaction))
      }
      if (feeSettings.chat_transfer) {
        promises.push(updateAdminFeeSettings("chat_transfer", feeSettings.chat_transfer))
      }
      if (feeSettings.tip) {
        promises.push(updateAdminFeeSettings("tip", feeSettings.tip))
      }

      await Promise.all(promises)

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      console.log("[v0] Fee settings saved:", feeSettings)
      toast.success("Fee settings have been saved successfully.")
    } catch (error) {
      console.error("Error saving fee settings:", error)
      toast.error("Failed to save fee settings. Please try again.")
    } finally {
      setFeeLoading(false)
    }
  }

  const handleSaveSupportPricing = async () => {
    setSupportLoading(true)
    try {
      const promises = []

      if (supportPricingSettings.free) {
        promises.push(updateSupportPricingSettings("free", supportPricingSettings.free))
      }
      if (supportPricingSettings.priority) {
        promises.push(updateSupportPricingSettings("priority", supportPricingSettings.priority))
      }

      await Promise.all(promises)

      console.log("[v0] Support pricing saved:", supportPricingSettings)
      toast.success("Support pricing settings have been saved successfully.")
    } catch (error) {
      console.error("Error saving support pricing:", error)
      toast.error("Failed to save support pricing. Please try again.")
    } finally {
      setSupportLoading(false)
    }
  }

  const saveRevisionSettings = async () => {
    setLoading(true)
    console.log("[v0] Saving revision settings:", revisionSettings)

    try {
      const response = await fetch("/api/admin/revision-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(revisionSettings),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || "Failed to save settings" }
        }
        throw new Error(errorData.error || "Failed to save settings")
      }

      const result = await response.json()
      console.log("[v0] Revision settings saved successfully:", result)
      toast.success("Revision settings saved successfully")
    } catch (error) {
      console.error("[v0] Failed to save revision settings:", error)
      toast.error(`Failed to save revision settings: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const updateFeeSettings = (
    feeType: "deposit" | "withdrawal" | "transaction" | "chat_transfer" | "tip",
    updates: Partial<AdminFeeSettings>,
  ) => {
    setFeeSettings((prev) => ({
      ...prev,
      [feeType]: prev[feeType] ? { ...prev[feeType], ...updates } : null,
    }))
  }

  const updateSupportPricing = (supportType: "free" | "priority", updates: Partial<SupportPricingSettings>) => {
    setSupportPricingSettings((prev) => ({
      ...prev,
      [supportType]: prev[supportType] ? { ...prev[supportType], ...updates } : null,
    }))
  }

  const getSettings = (type: keyof typeof SETTINGS_KEYS) => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEYS[type])
      return saved ? JSON.parse(saved) : null
    } catch (error) {
      console.error(`Error getting ${type} settings:`, error)
      return null
    }
  }

  const handleUpdateExchangeRate = async (
    fromCode: string,
    toCode: string,
    customRate: number | null,
    useCustom: boolean,
  ) => {
    setCurrencyLoading(true)
    try {
      await currencyService.updateExchangeRate(fromCode, toCode, customRate, useCustom)
      await loadCurrencyData()
      toast.success(`Exchange rate updated for ${fromCode} to ${toCode}`)
      setEditingRate(null)
    } catch (error) {
      console.error("Error updating exchange rate:", error)
      toast.error("Failed to update exchange rate")
    } finally {
      setCurrencyLoading(false)
    }
  }

  const handleRefreshLiveRates = async () => {
    setCurrencyLoading(true)
    try {
      await currencyService.updateLiveRates()
      await loadCurrencyData()
      toast.success("Live exchange rates refreshed")
    } catch (error) {
      console.error("Error refreshing live rates:", error)
      toast.error("Failed to refresh live rates")
    } finally {
      setCurrencyLoading(false)
    }
  }

  const formatRate = (rate: number) => {
    return rate.toFixed(6)
  }

  const handleSaveReservationSettings = async () => {
    setReservationLoading(true)
    try {
      // Convert to minutes if needed
      const settingsToSave = {
        ...reservationSettings,
        defaultReservationMinutes:
          reservationSettings.timeUnit === "hours"
            ? reservationSettings.defaultReservationMinutes * 60
            : reservationSettings.defaultReservationMinutes,
        maxReservationMinutes:
          reservationSettings.timeUnit === "hours" && reservationSettings.maxReservationMinutes < 60
            ? reservationSettings.maxReservationMinutes * 60
            : reservationSettings.maxReservationMinutes,
      }

      // Save to localStorage
      localStorage.setItem("admin_reservation_settings", JSON.stringify(settingsToSave))

      // Also update the local reservation storage
      if (typeof window !== "undefined") {
        const { updateReservationSettings } = await import("@/lib/local-reservation-utils")
        updateReservationSettings({
          isEnabled: settingsToSave.isEnabled,
          defaultReservationMinutes: settingsToSave.defaultReservationMinutes,
          maxReservationMinutes: settingsToSave.maxReservationMinutes,
          maxConcurrentReservations: settingsToSave.maxConcurrentReservations,
        })
      }

      console.log("[v0] Reservation settings saved:", settingsToSave)
      toast.success("Reservation settings have been saved successfully.")
    } catch (error) {
      console.error("Error saving reservation settings:", error)
      toast.error("Failed to save reservation settings. Please try again.")
    } finally {
      setReservationLoading(false)
    }
  }

  return (
    <>
      <AdminHeader title="Settings" description="Manage platform configuration and preferences" />

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          <Tabs defaultValue="platform" className="space-y-6">
            <TabsList className="grid w-full grid-cols-10">
              <TabsTrigger value="platform" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Platform
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="fees" className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Fees
              </TabsTrigger>
              <TabsTrigger value="support" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Support
              </TabsTrigger>
              <TabsTrigger value="currency" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Currency
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="reservations" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Reservations
              </TabsTrigger>
              <TabsTrigger value="seller-levels" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Seller Levels
              </TabsTrigger>
              <TabsTrigger value="features" className="flex items-center gap-2">
                <ToggleLeft className="w-4 h-4" />
                Features
              </TabsTrigger>
            </TabsList>

            {/* Platform Settings */}
            <TabsContent value="platform">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-600" />
                    Platform Settings
                  </CardTitle>
                  <CardDescription>Configure basic platform information and global settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="siteName">Site Name</Label>
                      <Input
                        id="siteName"
                        value={platformSettings.siteName}
                        onChange={(e) => setPlatformSettings((prev) => ({ ...prev, siteName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supportEmail">Support Email</Label>
                      <Input
                        id="supportEmail"
                        type="email"
                        value={platformSettings.supportEmail}
                        onChange={(e) => setPlatformSettings((prev) => ({ ...prev, supportEmail: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siteDescription">Site Description</Label>
                    <Textarea
                      id="siteDescription"
                      value={platformSettings.siteDescription}
                      onChange={(e) => setPlatformSettings((prev) => ({ ...prev, siteDescription: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="currency">Default Currency</Label>
                      <Select
                        value={platformSettings.currency}
                        onValueChange={(value) => setPlatformSettings((prev) => ({ ...prev, currency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Default Timezone</Label>
                      <Select
                        value={platformSettings.timezone}
                        onValueChange={(value) => setPlatformSettings((prev) => ({ ...prev, timezone: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="EST">EST - Eastern Time</SelectItem>
                          <SelectItem value="PST">PST - Pacific Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Maintenance Mode</Label>
                      <p className="text-sm text-gray-500">Temporarily disable public access to the platform</p>
                    </div>
                    <Switch
                      checked={platformSettings.maintenanceMode}
                      onCheckedChange={(checked) =>
                        setPlatformSettings((prev) => ({ ...prev, maintenanceMode: checked }))
                      }
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveSettings("Platform")} disabled={loading}>
                      {loading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Platform Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* User Settings */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    User Management Settings
                  </CardTitle>
                  <CardDescription>Configure user registration, verification, and limits</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Allow New Registrations</Label>
                        <p className="text-sm text-gray-500">Enable or disable new user sign-ups</p>
                      </div>
                      <Switch
                        checked={userSettings.allowRegistration}
                        onCheckedChange={(checked) =>
                          setUserSettings((prev) => ({ ...prev, allowRegistration: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Require Email Verification</Label>
                        <p className="text-sm text-gray-500">
                          Users must verify their email before accessing the platform
                        </p>
                      </div>
                      <Switch
                        checked={userSettings.requireEmailVerification}
                        onCheckedChange={(checked) =>
                          setUserSettings((prev) => ({ ...prev, requireEmailVerification: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Require Profile Completion</Label>
                        <p className="text-sm text-gray-500">
                          Force users to complete their profile before posting jobs/services
                        </p>
                      </div>
                      <Switch
                        checked={userSettings.requireProfileCompletion}
                        onCheckedChange={(checked) =>
                          setUserSettings((prev) => ({ ...prev, requireProfileCompletion: checked }))
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="maxJobs">Max Jobs Per User</Label>
                      <Input
                        id="maxJobs"
                        type="number"
                        value={userSettings.maxJobsPerUser}
                        onChange={(e) =>
                          setUserSettings((prev) => ({ ...prev, maxJobsPerUser: Number.parseInt(e.target.value) }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxServices">Max Services Per User</Label>
                      <Input
                        id="maxServices"
                        type="number"
                        value={userSettings.maxServicesPerUser}
                        onChange={(e) =>
                          setUserSettings((prev) => ({ ...prev, maxServicesPerUser: Number.parseInt(e.target.value) }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveSettings("User")} disabled={loading}>
                      {loading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save User Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Settings */}
            <TabsContent value="payments">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    Payment Settings
                  </CardTitle>
                  <CardDescription>Configure payment processing, fees, and payout settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="platformFee">Platform Fee (%)</Label>
                      <Input
                        id="platformFee"
                        type="number"
                        step="0.1"
                        value={paymentSettings.platformFeePercentage}
                        onChange={(e) =>
                          setPaymentSettings((prev) => ({
                            ...prev,
                            platformFeePercentage: Number.parseFloat(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minWithdrawal">Minimum Withdrawal ($)</Label>
                      <Input
                        id="minWithdrawal"
                        type="number"
                        value={paymentSettings.minimumWithdrawal}
                        onChange={(e) =>
                          setPaymentSettings((prev) => ({
                            ...prev,
                            minimumWithdrawal: Number.parseInt(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Methods</Label>
                    <div className="flex gap-2">
                      <Badge variant={paymentSettings.paymentMethods.includes("stripe") ? "default" : "outline"}>
                        Stripe
                      </Badge>
                      <Badge variant={paymentSettings.paymentMethods.includes("paypal") ? "default" : "outline"}>
                        PayPal
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Auto Payout</Label>
                      <p className="text-sm text-gray-500">Automatically process payouts based on schedule</p>
                    </div>
                    <Switch
                      checked={paymentSettings.autoPayoutEnabled}
                      onCheckedChange={(checked) =>
                        setPaymentSettings((prev) => ({ ...prev, autoPayoutEnabled: checked }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payoutSchedule">Payout Schedule</Label>
                    <Select
                      value={paymentSettings.payoutSchedule}
                      onValueChange={(value) => setPaymentSettings((prev) => ({ ...prev, payoutSchedule: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveSettings("Payment")} disabled={loading}>
                      {loading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Payment Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fees">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="w-5 h-5 text-orange-600" />
                    Fee Management
                  </CardTitle>
                  <CardDescription>
                    Configure platform fees for deposits, withdrawals, transactions, chat transfers, and tips
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Tip Fees */}
                  {feeSettings.tip && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium">Tip Settings</h3>
                          <p className="text-sm text-gray-500">Configure tip limits and fees for work proof tips</p>
                        </div>
                        <Switch
                          checked={feeSettings.tip.isActive}
                          onCheckedChange={(checked) => updateFeeSettings("tip", { isActive: checked })}
                        />
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Tip Fee (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={feeSettings.tip.feePercentage}
                            onChange={(e) =>
                              updateFeeSettings("tip", { feePercentage: Number.parseFloat(e.target.value) })
                            }
                            disabled={!feeSettings.tip.isActive}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Fixed Tip Fee ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={feeSettings.tip.feeFixed}
                            onChange={(e) => updateFeeSettings("tip", { feeFixed: Number.parseFloat(e.target.value) })}
                            disabled={!feeSettings.tip.isActive}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Minimum Tip ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={feeSettings.tip.minimumFee}
                            onChange={(e) =>
                              updateFeeSettings("tip", { minimumFee: Number.parseFloat(e.target.value) })
                            }
                            disabled={!feeSettings.tip.isActive}
                            placeholder="0.50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Maximum Tip ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={feeSettings.tip.maximumFee || ""}
                            onChange={(e) =>
                              updateFeeSettings("tip", {
                                maximumFee: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                              })
                            }
                            disabled={!feeSettings.tip.isActive}
                            placeholder="100.00"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Deposit Fees */}
                  {feeSettings.deposit && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium">Deposit Fees</h3>
                          <p className="text-sm text-gray-500">Fees charged when users add funds to their wallet</p>
                        </div>
                        <Switch
                          checked={feeSettings.deposit.isActive}
                          onCheckedChange={(checked) => updateFeeSettings("deposit", { isActive: checked })}
                        />
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Percentage (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={feeSettings.deposit.feePercentage}
                            onChange={(e) =>
                              updateFeeSettings("deposit", { feePercentage: Number.parseFloat(e.target.value) })
                            }
                            disabled={!feeSettings.deposit.isActive}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Fixed Fee ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={feeSettings.deposit.feeFixed}
                            onChange={(e) =>
                              updateFeeSettings("deposit", { feeFixed: Number.parseFloat(e.target.value) })
                            }
                            disabled={!feeSettings.deposit.isActive}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Minimum Fee ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={feeSettings.deposit.minimumFee}
                            onChange={(e) =>
                              updateFeeSettings("deposit", { minimumFee: Number.parseFloat(e.target.value) })
                            }
                            disabled={!feeSettings.deposit.isActive}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Maximum Fee ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={feeSettings.deposit.maximumFee || ""}
                            onChange={(e) =>
                              updateFeeSettings("deposit", {
                                maximumFee: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                              })
                            }
                            disabled={!feeSettings.deposit.isActive}
                            placeholder="No limit"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Withdrawal Fees */}
                  {feeSettings.withdrawal && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium">Withdrawal Fees</h3>
                          <p className="text-sm text-gray-500">
                            Fees charged when users withdraw funds from their wallet
                          </p>
                        </div>
                        <Switch
                          checked={feeSettings.withdrawal.isActive}
                          onCheckedChange={(checked) => updateFeeSettings("withdrawal", { isActive: checked })}
                        />
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Percentage (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={feeSettings.withdrawal.feePercentage}
                            onChange={(e) =>
                              updateFeeSettings("withdrawal", { feePercentage: Number.parseFloat(e.target.value) })
                            }
                            disabled={!feeSettings.withdrawal.isActive}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Fixed Fee ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={feeSettings.withdrawal.feeFixed}
                            onChange={(e) =>
                              updateFeeSettings("withdrawal", { feeFixed: Number.parseFloat(e.target.value) })
                            }
                            disabled={!feeSettings.withdrawal.isActive}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Minimum Fee ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={feeSettings.withdrawal.minimumFee}
                            onChange={(e) =>
                              updateFeeSettings("withdrawal", { minimumFee: Number.parseFloat(e.target.value) })
                            }
                            disabled={!feeSettings.withdrawal.isActive}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Maximum Fee ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={feeSettings.withdrawal.maximumFee || ""}
                            onChange={(e) =>
                              updateFeeSettings("withdrawal", {
                                maximumFee: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                              })
                            }
                            disabled={!feeSettings.withdrawal.isActive}
                            placeholder="No limit"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Transaction Fees */}
                  {feeSettings.transaction && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium">Transaction Fees</h3>
                          <p className="text-sm text-gray-500">Fees charged on platform transactions and payments</p>
                        </div>
                        <Switch
                          checked={feeSettings.transaction.isActive}
                          onCheckedChange={(checked) => updateFeeSettings("transaction", { isActive: checked })}
                        />
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Percentage (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={feeSettings.transaction.feePercentage}
                            onChange={(e) =>
                              updateFeeSettings("transaction", { feePercentage: Number.parseFloat(e.target.value) })
                            }
                            disabled={!feeSettings.transaction.isActive}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Fixed Fee ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={feeSettings.transaction.feeFixed}
                            onChange={(e) =>
                              updateFeeSettings("transaction", { feeFixed: Number.parseFloat(e.target.value) })
                            }
                            disabled={!feeSettings.transaction.isActive}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Minimum Fee ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={feeSettings.transaction.minimumFee}
                            onChange={(e) =>
                              updateFeeSettings("transaction", { minimumFee: Number.parseFloat(e.target.value) })
                            }
                            disabled={!feeSettings.transaction.isActive}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Maximum Fee ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={feeSettings.transaction.maximumFee || ""}
                            onChange={(e) =>
                              updateFeeSettings("transaction", {
                                maximumFee: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                              })
                            }
                            disabled={!feeSettings.transaction.isActive}
                            placeholder="No limit"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {feeSettings.chat_transfer && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-medium">Chat Transfer Fees</h3>
                            <p className="text-sm text-gray-500">
                              Commission charged on peer-to-peer money transfers in chat
                            </p>
                          </div>
                          <Switch
                            checked={feeSettings.chat_transfer.isActive}
                            onCheckedChange={(checked) => updateFeeSettings("chat_transfer", { isActive: checked })}
                          />
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>Percentage (%)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={feeSettings.chat_transfer.feePercentage}
                              onChange={(e) =>
                                updateFeeSettings("chat_transfer", { feePercentage: Number.parseFloat(e.target.value) })
                              }
                              disabled={!feeSettings.chat_transfer.isActive}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Fixed Fee ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={feeSettings.chat_transfer.feeFixed}
                              onChange={(e) =>
                                updateFeeSettings("chat_transfer", { feeFixed: Number.parseFloat(e.target.value) })
                              }
                              disabled={!feeSettings.chat_transfer.isActive}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Minimum Fee ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={feeSettings.chat_transfer.minimumFee}
                              onChange={(e) =>
                                updateFeeSettings("chat_transfer", { minimumFee: Number.parseFloat(e.target.value) })
                              }
                              disabled={!feeSettings.chat_transfer.isActive}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Maximum Fee ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={feeSettings.chat_transfer.maximumFee || ""}
                              onChange={(e) =>
                                updateFeeSettings("chat_transfer", {
                                  maximumFee: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                                })
                              }
                              disabled={!feeSettings.chat_transfer.isActive}
                              placeholder="No limit"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Fee Calculation Example</h4>
                    <p className="text-sm text-blue-800">
                      For a $100 chat transfer with 2% + $0.05 fee (min $0.05): Fee = ($100 × 2%) + $0.05 = $2.05
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveFeeSettings} disabled={feeLoading}>
                      {feeLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Fee Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="support">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    Support Pricing Management
                  </CardTitle>
                  <CardDescription>Configure pricing for different support tiers and response times</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Free Support Settings */}
                  {supportPricingSettings.free && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-blue-600" />
                            Free Support
                          </h3>
                          <p className="text-sm text-gray-500">Standard support with longer response times</p>
                        </div>
                        <Switch
                          checked={supportPricingSettings.free.isActive}
                          onCheckedChange={(checked) => updateSupportPricing("free", { isActive: checked })}
                        />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Price ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={supportPricingSettings.free.price}
                            onChange={(e) => updateSupportPricing("free", { price: Number.parseFloat(e.target.value) })}
                            disabled={!supportPricingSettings.free.isActive}
                            readOnly
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Response Time (hours)</Label>
                          <Input
                            type="number"
                            value={supportPricingSettings.free.responseTimeHours}
                            onChange={(e) =>
                              updateSupportPricing("free", { responseTimeHours: Number.parseInt(e.target.value) })
                            }
                            disabled={!supportPricingSettings.free.isActive}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            value={supportPricingSettings.free.description}
                            onChange={(e) => updateSupportPricing("free", { description: e.target.value })}
                            disabled={!supportPricingSettings.free.isActive}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Priority Support Settings */}
                  {supportPricingSettings.priority && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium flex items-center gap-2">
                            <Zap className="h-5 w-5 text-orange-600" />
                            Priority Support
                          </h3>
                          <p className="text-sm text-gray-500">Fast response support with premium pricing</p>
                        </div>
                        <Switch
                          checked={supportPricingSettings.priority.isActive}
                          onCheckedChange={(checked) => updateSupportPricing("priority", { isActive: checked })}
                        />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Price ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={supportPricingSettings.priority.price}
                            onChange={(e) =>
                              updateSupportPricing("priority", { price: Number.parseFloat(e.target.value) })
                            }
                            disabled={!supportPricingSettings.priority.isActive}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Response Time (hours)</Label>
                          <Input
                            type="number"
                            value={supportPricingSettings.priority.responseTimeHours}
                            onChange={(e) =>
                              updateSupportPricing("priority", { responseTimeHours: Number.parseInt(e.target.value) })
                            }
                            disabled={!supportPricingSettings.priority.isActive}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            value={supportPricingSettings.priority.description}
                            onChange={(e) => updateSupportPricing("priority", { description: e.target.value })}
                            disabled={!supportPricingSettings.priority.isActive}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Support Pricing Strategy</h4>
                    <p className="text-sm text-green-800">
                      Free support encourages user engagement while priority support generates revenue from users who
                      need immediate assistance.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveSupportPricing} disabled={supportLoading}>
                      {supportLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Support Pricing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="currency">
              <div className="space-y-6">
                {/* Currency Overview */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          Currency Management
                        </CardTitle>
                        <CardDescription>Manage supported currencies and exchange rates</CardDescription>
                      </div>
                      <Button onClick={handleRefreshLiveRates} disabled={currencyLoading} variant="outline">
                        {currencyLoading ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <TrendingUp className="w-4 h-4 mr-2" />
                        )}
                        Refresh Live Rates
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {currencies.map((currency) => (
                        <div key={currency.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium">{currency.code}</span>
                              {currency.is_base_currency && (
                                <Badge variant="default" className="text-xs">
                                  Base
                                </Badge>
                              )}
                            </div>
                            <span className="text-lg">{currency.symbol}</span>
                          </div>
                          <p className="text-sm text-gray-600">{currency.name}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={currency.is_active ? "default" : "secondary"} className="text-xs">
                              {currency.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <span className="text-xs text-gray-500">{currency.decimal_places} decimals</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Exchange Rates Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Exchange Rates
                    </CardTitle>
                    <CardDescription>
                      Manage exchange rates between currencies. You can override live rates with custom values.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {exchangeRates.map((rate) => {
                        const rateKey = `${rate.from_currency.code}-${rate.to_currency.code}`
                        const isEditing = editingRate === rateKey
                        const effectiveRate =
                          rate.use_custom_rate && rate.custom_rate ? rate.custom_rate : rate.live_rate

                        return (
                          <div key={rateKey} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-medium">{rate.from_currency.code}</span>
                                  <span className="text-gray-400">→</span>
                                  <span className="font-mono font-medium">{rate.to_currency.code}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">Rate:</span>
                                  <span className="font-mono">{formatRate(effectiveRate)}</span>
                                  {rate.use_custom_rate && (
                                    <Badge variant="outline" className="text-xs">
                                      Custom
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingRate(isEditing ? null : rateKey)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            {isEditing && (
                              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <Label>Live Rate</Label>
                                    <Input value={formatRate(rate.live_rate)} disabled className="font-mono" />
                                    <p className="text-xs text-gray-500">From external API</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Custom Rate</Label>
                                    <Input
                                      type="number"
                                      step="0.000001"
                                      value={rate.custom_rate || ""}
                                      onChange={(e) => {
                                        const newRate = e.target.value ? Number.parseFloat(e.target.value) : null
                                        setExchangeRates((prev) =>
                                          prev.map((r) =>
                                            r.from_currency.code === rate.from_currency.code &&
                                            r.to_currency.code === rate.to_currency.code
                                              ? { ...r, custom_rate: newRate }
                                              : r,
                                          ),
                                        )
                                      }}
                                      placeholder="Enter custom rate"
                                      className="font-mono"
                                    />
                                    <p className="text-xs text-gray-500">Override live rate</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Use Custom Rate</Label>
                                    <div className="flex items-center gap-2 pt-2">
                                      <Switch
                                        checked={rate.use_custom_rate}
                                        onCheckedChange={(checked) => {
                                          setExchangeRates((prev) =>
                                            prev.map((r) =>
                                              r.from_currency.code === rate.from_currency.code &&
                                              r.to_currency.code === rate.to_currency.code
                                                ? { ...r, use_custom_rate: checked }
                                                : r,
                                            ),
                                          )
                                        }}
                                      />
                                      <span className="text-sm">{rate.use_custom_rate ? "Custom" : "Live"}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                  <Button variant="outline" size="sm" onClick={() => setEditingRate(null)}>
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleUpdateExchangeRate(
                                        rate.from_currency.code,
                                        rate.to_currency.code,
                                        rate.custom_rate,
                                        rate.use_custom_rate,
                                      )
                                    }
                                    disabled={currencyLoading}
                                  >
                                    {currencyLoading ? (
                                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <Save className="w-4 h-4 mr-2" />
                                    )}
                                    Save Rate
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Exchange Rate Management</h4>
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>
                          • <strong>Live Rates:</strong> Automatically updated from external APIs
                        </p>
                        <p>
                          • <strong>Custom Rates:</strong> Override live rates with your own values
                        </p>
                        <p>
                          • <strong>Example:</strong> If live rate is 1 USD = 122 BDT, you can set custom rate to 110
                          BDT
                        </p>
                        <p>
                          • <strong>Base Currency:</strong> USD is the base currency for all conversions
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    Notification Settings
                  </CardTitle>
                  <CardDescription>Configure email templates and notification preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center py-12">
                    <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Email Configuration</h3>
                    <p className="text-gray-500 mb-4">Set up SMTP settings and email templates</p>
                    <Button variant="outline" onClick={() => toast.info("Email configuration coming soon!")}>
                      Configure Email Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reservations">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    Microjob Reservation Settings
                  </CardTitle>
                  <CardDescription>
                    Configure local microjob reservation system settings and time limits
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Enable Reservation System</Label>
                      <p className="text-sm text-gray-500">
                        Allow users to reserve microjobs for a specified time period
                      </p>
                    </div>
                    <Switch
                      checked={reservationSettings.isEnabled}
                      onCheckedChange={(checked) => setReservationSettings((prev) => ({ ...prev, isEnabled: checked }))}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="defaultReservationTime">Default Reservation Time</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="defaultReservationTime"
                          type="number"
                          min="1"
                          value={reservationSettings.defaultReservationMinutes}
                          onChange={(e) =>
                            setReservationSettings((prev) => ({
                              ...prev,
                              defaultReservationMinutes: Number.parseInt(e.target.value) || 60,
                            }))
                          }
                          disabled={!reservationSettings.isEnabled}
                          className="flex-1"
                        />
                        <Select
                          value={reservationSettings.timeUnit}
                          onValueChange={(value: "minutes" | "hours") => {
                            const currentValue = reservationSettings.defaultReservationMinutes
                            let newValue = currentValue

                            if (value === "hours" && reservationSettings.timeUnit === "minutes") {
                              newValue = Math.max(1, Math.round(currentValue / 60))
                            } else if (value === "minutes" && reservationSettings.timeUnit === "hours") {
                              newValue = currentValue * 60
                            }

                            setReservationSettings((prev) => ({
                              ...prev,
                              timeUnit: value,
                              defaultReservationMinutes: newValue,
                            }))
                          }}
                          disabled={!reservationSettings.isEnabled}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes">Min</SelectItem>
                            <SelectItem value="hours">Hrs</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-gray-500">
                        {reservationSettings.timeUnit === "hours"
                          ? `${reservationSettings.defaultReservationMinutes} hour(s) = ${reservationSettings.defaultReservationMinutes * 60} minutes`
                          : `${reservationSettings.defaultReservationMinutes} minute(s)`}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxReservationTime">Maximum Reservation Time</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="maxReservationTime"
                          type="number"
                          min="1"
                          value={
                            reservationSettings.timeUnit === "hours"
                              ? Math.round(reservationSettings.maxReservationMinutes / 60)
                              : reservationSettings.maxReservationMinutes
                          }
                          onChange={(e) => {
                            const inputValue = Number.parseInt(e.target.value) || 1
                            const minutes = reservationSettings.timeUnit === "hours" ? inputValue * 60 : inputValue
                            setReservationSettings((prev) => ({
                              ...prev,
                              maxReservationMinutes: minutes,
                            }))
                          }}
                          disabled={!reservationSettings.isEnabled}
                          className="flex-1"
                        />
                        <div className="w-24 flex items-center justify-center text-sm text-gray-500 border rounded-md">
                          {reservationSettings.timeUnit === "hours" ? "Hrs" : "Min"}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Maximum time a user can reserve a microjob ({reservationSettings.maxReservationMinutes} minutes)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxConcurrentReservations">Max Concurrent Reservations Per User</Label>
                    <Input
                      id="maxConcurrentReservations"
                      type="number"
                      min="1"
                      max="20"
                      value={reservationSettings.maxConcurrentReservations}
                      onChange={(e) =>
                        setReservationSettings((prev) => ({
                          ...prev,
                          maxConcurrentReservations: Number.parseInt(e.target.value) || 5,
                        }))
                      }
                      disabled={!reservationSettings.isEnabled}
                      className="w-32"
                    />
                    <p className="text-sm text-gray-500">
                      Maximum number of microjobs a user can reserve simultaneously
                    </p>
                  </div>

                  <Separator />

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Clock className="w-3 h-3 text-white" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-blue-900">Local Storage System</h4>
                        <p className="text-sm text-blue-800">
                          This reservation system uses local browser storage instead of a database. Reservations are
                          stored locally and will persist across browser sessions but are device-specific.
                        </p>
                        <div className="text-xs text-blue-700 space-y-1">
                          <p>• Automatic cleanup of expired reservations every minute</p>
                          <p>• Real-time reservation status updates</p>
                          <p>• No server-side database required</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveReservationSettings} disabled={reservationLoading}>
                      {reservationLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Reservation Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seller-levels">
              <SellerLevelAdmin />
            </TabsContent>

            {/* Feature Settings */}
            <TabsContent value="features">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ToggleLeft className="w-5 h-5 text-orange-600" />
                    Feature Toggles
                  </CardTitle>
                  <CardDescription>Enable or disable platform features</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Microjobs</Label>
                        <p className="text-sm text-gray-500">Allow users to post and apply for microjobs</p>
                      </div>
                      <Switch
                        checked={featureSettings.enableMicrojobs}
                        onCheckedChange={(checked) =>
                          setFeatureSettings((prev) => ({ ...prev, enableMicrojobs: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Marketplace</Label>
                        <p className="text-sm text-gray-500">Enable service marketplace functionality</p>
                      </div>
                      <Switch
                        checked={featureSettings.enableMarketplace}
                        onCheckedChange={(checked) =>
                          setFeatureSettings((prev) => ({ ...prev, enableMarketplace: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Wallet System</Label>
                        <p className="text-sm text-gray-500">Enable user wallets and transactions</p>
                      </div>
                      <Switch
                        checked={featureSettings.enableWallet}
                        onCheckedChange={(checked) =>
                          setFeatureSettings((prev) => ({ ...prev, enableWallet: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Referral System</Label>
                        <p className="text-sm text-gray-500">Allow users to refer others and earn rewards</p>
                      </div>
                      <Switch
                        checked={featureSettings.enableReferrals}
                        onCheckedChange={(checked) =>
                          setFeatureSettings((prev) => ({ ...prev, enableReferrals: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Reviews & Ratings</Label>
                        <p className="text-sm text-gray-500">Enable user reviews and rating system</p>
                      </div>
                      <Switch
                        checked={featureSettings.enableReviews}
                        onCheckedChange={(checked) =>
                          setFeatureSettings((prev) => ({ ...prev, enableReviews: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Chat System</Label>
                        <p className="text-sm text-gray-500">Enable real-time messaging between users</p>
                      </div>
                      <Switch
                        checked={featureSettings.enableChat}
                        onCheckedChange={(checked) => setFeatureSettings((prev) => ({ ...prev, enableChat: checked }))}
                      />
                    </div>
                  </div>

                  {/* Revision System Settings */}
                  {revisionSettingsLoaded && revisionSettings && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <RefreshCw className="mr-2 h-5 w-5" />
                          Revision System Settings
                        </CardTitle>
                        <CardDescription>
                          Configure revision request limits, response timeouts, and automatic refund policies
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Request Changes Limits</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="maxRevisionRequests">Maximum Revision Requests</Label>
                              <Input
                                id="maxRevisionRequests"
                                type="number"
                                min="1"
                                max="10"
                                value={revisionSettings.maxRevisionRequests}
                                onChange={(e) =>
                                  setRevisionSettings((prev) => ({
                                    ...prev!,
                                    maxRevisionRequests: Number.parseInt(e.target.value) || 2,
                                  }))
                                }
                              />
                              <p className="text-sm text-gray-600">
                                How many times a job poster can request revisions per job (shows as "Request Changes (X
                                left)")
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Response Time Limits</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label>Revision Request Response Time</Label>
                              <div className="flex space-x-2">
                                <Input
                                  type="number"
                                  min="1"
                                  value={revisionSettings.revisionRequestTimeoutValue}
                                  onChange={(e) =>
                                    setRevisionSettings((prev) => ({
                                      ...prev!,
                                      revisionRequestTimeoutValue: Number.parseInt(e.target.value) || 24,
                                    }))
                                  }
                                />
                                <Select
                                  value={revisionSettings.revisionRequestTimeoutUnit}
                                  onValueChange={(value: "minutes" | "hours" | "days") =>
                                    setRevisionSettings((prev) => ({
                                      ...prev!,
                                      revisionRequestTimeoutUnit: value,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="minutes">Minutes</SelectItem>
                                    <SelectItem value="hours">Hours</SelectItem>
                                    <SelectItem value="days">Days</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <p className="text-sm text-gray-600">
                                How long workers have to respond when job poster requests changes
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label>Rejection Response Time</Label>
                              <div className="flex space-x-2">
                                <Input
                                  type="number"
                                  min="1"
                                  value={revisionSettings.rejectionResponseTimeoutValue}
                                  onChange={(e) =>
                                    setRevisionSettings((prev) => ({
                                      ...prev!,
                                      rejectionResponseTimeoutValue: Number.parseInt(e.target.value) || 24,
                                    }))
                                  }
                                />
                                <Select
                                  value={revisionSettings.rejectionResponseTimeoutUnit}
                                  onValueChange={(value: "minutes" | "hours" | "days") =>
                                    setRevisionSettings((prev) => ({
                                      ...prev!,
                                      rejectionResponseTimeoutUnit: value,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="minutes">Minutes</SelectItem>
                                    <SelectItem value="hours">Hours</SelectItem>
                                    <SelectItem value="days">Days</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <p className="text-sm text-gray-600">
                                How long workers have to respond when their work is rejected
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Automatic Refund Policy</h4>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label>Enable Automatic Refunds</Label>
                                <p className="text-sm text-gray-600">
                                  Automatically process refunds when response timeouts occur
                                </p>
                              </div>
                              <Switch
                                checked={revisionSettings.enableAutomaticRefunds}
                                onCheckedChange={(checked) =>
                                  setRevisionSettings((prev) => ({
                                    ...prev!,
                                    enableAutomaticRefunds: checked,
                                  }))
                                }
                              />
                            </div>

                            {revisionSettings.enableAutomaticRefunds && (
                              <div className="ml-4 space-y-4 border-l-2 border-blue-200 pl-4">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <Label>Refund on Revision Timeout</Label>
                                    <p className="text-sm text-gray-600">
                                      Refund job poster if worker doesn't respond to revision request within time limit
                                    </p>
                                  </div>
                                  <Switch
                                    checked={revisionSettings.refundOnRevisionTimeout}
                                    onCheckedChange={(checked) =>
                                      setRevisionSettings((prev) => ({
                                        ...prev!,
                                        refundOnRevisionTimeout: checked,
                                      }))
                                    }
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <Label>Refund on Rejection Timeout</Label>
                                    <p className="text-sm text-gray-600">
                                      Refund job poster if worker doesn't respond to rejection within time limit
                                    </p>
                                  </div>
                                  <Switch
                                    checked={revisionSettings.refundOnRejectionTimeout}
                                    onCheckedChange={(checked) =>
                                      setRevisionSettings((prev) => ({
                                        ...prev!,
                                        refundOnRejectionTimeout: checked,
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Abuse Prevention</h4>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label>Enable Revision Warnings</Label>
                                <p className="text-sm text-gray-600">
                                  Show warning messages about revision abuse and penalties
                                </p>
                              </div>
                              <Switch
                                checked={revisionSettings.enableRevisionWarnings}
                                onCheckedChange={(checked) =>
                                  setRevisionSettings((prev) => ({
                                    ...prev!,
                                    enableRevisionWarnings: checked,
                                  }))
                                }
                              />
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label>Enable Revision Penalties</Label>
                                <p className="text-sm text-gray-600">Apply financial penalties for revision abuse</p>
                              </div>
                              <Switch
                                checked={revisionSettings.revisionPenaltyEnabled}
                                onCheckedChange={(checked) =>
                                  setRevisionSettings((prev) => ({
                                    ...prev!,
                                    revisionPenaltyEnabled: checked,
                                  }))
                                }
                              />
                            </div>

                            {revisionSettings.revisionPenaltyEnabled && (
                              <div className="space-y-2 ml-4 border-l-2 border-red-200 pl-4">
                                <Label htmlFor="revisionPenaltyAmount">Penalty Amount ($)</Label>
                                <Input
                                  id="revisionPenaltyAmount"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={revisionSettings.revisionPenaltyAmount}
                                  onChange={(e) =>
                                    setRevisionSettings((prev) => ({
                                      ...prev!,
                                      revisionPenaltyAmount: Number.parseFloat(e.target.value) || 0,
                                    }))
                                  }
                                />
                                <p className="text-sm text-gray-600">
                                  Amount charged to job posters for excessive revision requests
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <Button onClick={saveRevisionSettings} className="w-full">
                          <Save className="mr-2 h-4 w-4" />
                          Save Revision Settings
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {!revisionSettingsLoaded && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <RefreshCw className="mr-2 h-5 w-5" />
                          Revision System Settings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading revision settings...</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveSettings("Feature")} disabled={loading}>
                      {loading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Feature Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
