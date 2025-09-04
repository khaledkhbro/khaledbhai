// Wallet-related types
export interface Wallet {
  id: string
  userId: string
  balance: number // Legacy field for backward compatibility
  depositBalance: number // Cannot be withdrawn
  earningsBalance: number // Can be withdrawn
  pendingBalance: number
  totalEarned: number
  totalSpent: number
  upcomingPayments: number
  pendingPayments: number
  createdAt: string
  updatedAt: string
}

export interface WalletTransaction {
  id: string
  walletId: string
  type: "deposit" | "withdrawal" | "payment" | "earning" | "refund"
  amount: number
  feeAmount: number
  netAmount: number
  balanceType: "deposit" | "earnings"
  description: string
  referenceId?: string
  referenceType?: string
  status: "pending" | "completed" | "failed"
  createdAt: string
}

export interface PaymentMethod {
  id: string
  userId: string
  type: "card" | "paypal" | "bank_account"
  last4?: string
  brand?: string
  isDefault: boolean
  createdAt: string
}

// Admin fee settings interface
export interface AdminFeeSettings {
  id: string
  feeType: "deposit" | "withdrawal" | "transaction" | "tip"
  feePercentage: number
  feeFixed: number
  minimumFee: number
  maximumFee?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Payment schedule interface
export interface PaymentSchedule {
  id: string
  userId: string
  amount: number
  scheduledDate: string
  description: string
  referenceId?: string
  referenceType?: string
  status: "scheduled" | "processed" | "failed" | "cancelled"
  createdAt: string
  processedAt?: string
}

// Real wallet functions using localStorage
export async function getWallet(userId: string): Promise<Wallet> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  const wallets = JSON.parse(localStorage.getItem("wallets") || "{}")

  if (!wallets[userId]) {
    const newWallet: Wallet = {
      id: `wallet_${userId}`,
      userId,
      balance: 0,
      depositBalance: 0,
      earningsBalance: 0,
      pendingBalance: 0,
      totalEarned: 0,
      totalSpent: 0,
      upcomingPayments: 0,
      pendingPayments: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    wallets[userId] = newWallet
    localStorage.setItem("wallets", JSON.stringify(wallets))
    return newWallet
  }

  return wallets[userId]
}

export async function getTransactions(
  walletId: string,
  filters?: {
    type?: string
    status?: string
    limit?: number
  },
): Promise<WalletTransaction[]> {
  await new Promise((resolve) => setTimeout(resolve, 400))

  const transactions = JSON.parse(localStorage.getItem("wallet_transactions") || "[]")
  let filteredTransactions = transactions.filter((t: WalletTransaction) => t.walletId === walletId)

  if (filters?.type) {
    filteredTransactions = filteredTransactions.filter((t: WalletTransaction) => t.type === filters.type)
  }

  if (filters?.status) {
    filteredTransactions = filteredTransactions.filter((t: WalletTransaction) => t.status === filters.status)
  }

  if (filters?.limit) {
    filteredTransactions = filteredTransactions.slice(0, filters.limit)
  }

  return filteredTransactions.sort(
    (a: WalletTransaction, b: WalletTransaction) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export async function getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
  const wallet = await getWallet(userId)
  return getTransactions(wallet.id)
}

export async function getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  await new Promise((resolve) => setTimeout(resolve, 200))

  const paymentMethods = JSON.parse(localStorage.getItem("payment_methods") || "{}")
  return paymentMethods[userId] || []
}

function generateUniqueId(): string {
  // Use crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback to timestamp + random string for better uniqueness
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export async function createDeposit(data: {
  amount: number
  paymentMethodId: string
  userId: string
}): Promise<WalletTransaction> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const wallet = await getWallet(data.userId)
  const feeSettings = await getAdminFeeSettings("deposit")
  const feeAmount = calculateFee(data.amount, feeSettings)
  const netAmount = data.amount - feeAmount

  const newTransaction: WalletTransaction = {
    id: `txn_${generateUniqueId()}`,
    walletId: wallet.id,
    type: "deposit",
    amount: data.amount,
    feeAmount,
    netAmount,
    balanceType: "deposit",
    description: `Deposit from payment method${feeAmount > 0 ? ` (Fee: $${feeAmount.toFixed(2)})` : ""}`,
    status: "completed",
    createdAt: new Date().toISOString(),
  }

  // Update wallet deposit balance
  const wallets = JSON.parse(localStorage.getItem("wallets") || "{}")
  wallets[data.userId].depositBalance += netAmount
  wallets[data.userId].balance += netAmount // Legacy compatibility
  wallets[data.userId].updatedAt = new Date().toISOString()
  localStorage.setItem("wallets", JSON.stringify(wallets))

  // Save transaction and fee collection
  const transactions = JSON.parse(localStorage.getItem("wallet_transactions") || "[]")
  transactions.push(newTransaction)
  localStorage.setItem("wallet_transactions", JSON.stringify(transactions))

  if (feeAmount > 0) {
    await recordFeeCollection(newTransaction.id, "deposit", data.amount, feeSettings, feeAmount)
  }

  return newTransaction
}

export async function createWithdrawal(data: {
  amount: number
  paymentMethodId: string
  userId: string
}): Promise<WalletTransaction> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const wallet = await getWallet(data.userId)

  // Only earnings balance can be withdrawn
  if (wallet.earningsBalance < data.amount) {
    throw new Error("Insufficient earnings balance for withdrawal")
  }

  const feeSettings = await getAdminFeeSettings("withdrawal")
  const feeAmount = calculateFee(data.amount, feeSettings)
  const netAmount = data.amount - feeAmount

  const newTransaction: WalletTransaction = {
    id: `txn_${generateUniqueId()}`,
    walletId: wallet.id,
    type: "withdrawal",
    amount: -data.amount,
    feeAmount,
    netAmount: -netAmount,
    balanceType: "earnings",
    description: `Withdrawal to payment method${feeAmount > 0 ? ` (Fee: $${feeAmount.toFixed(2)})` : ""}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  }

  // Update wallet earnings balance
  const wallets = JSON.parse(localStorage.getItem("wallets") || "{}")
  wallets[data.userId].earningsBalance -= data.amount
  wallets[data.userId].totalSpent += data.amount
  wallets[data.userId].updatedAt = new Date().toISOString()
  localStorage.setItem("wallets", JSON.stringify(wallets))

  // Save transaction and fee collection
  const transactions = JSON.parse(localStorage.getItem("wallet_transactions") || "[]")
  transactions.push(newTransaction)
  localStorage.setItem("wallet_transactions", JSON.stringify(transactions))

  if (feeAmount > 0) {
    await recordFeeCollection(newTransaction.id, "withdrawal", data.amount, feeSettings, feeAmount)
  }

  return newTransaction
}

export async function addPaymentMethod(
  userId: string,
  method: Omit<PaymentMethod, "id" | "userId" | "createdAt">,
): Promise<PaymentMethod> {
  const paymentMethods = JSON.parse(localStorage.getItem("payment_methods") || "{}")

  if (!paymentMethods[userId]) {
    paymentMethods[userId] = []
  }

  const newMethod: PaymentMethod = {
    id: `pm_${Date.now()}`,
    userId,
    ...method,
    createdAt: new Date().toISOString(),
  }

  paymentMethods[userId].push(newMethod)
  localStorage.setItem("payment_methods", JSON.stringify(paymentMethods))

  return newMethod
}

export async function addEarnings(data: {
  amount: number
  userId: string
  description: string
  referenceId?: string
  referenceType?: string
}): Promise<WalletTransaction> {
  const wallet = await getWallet(data.userId)

  const newTransaction: WalletTransaction = {
    id: `txn_${generateUniqueId()}`,
    walletId: wallet.id,
    type: "earning",
    amount: data.amount,
    feeAmount: 0,
    netAmount: data.amount,
    balanceType: "earnings",
    description: data.description,
    referenceId: data.referenceId,
    referenceType: data.referenceType,
    status: "completed",
    createdAt: new Date().toISOString(),
  }

  // Update wallet earnings balance
  const wallets = JSON.parse(localStorage.getItem("wallets") || "{}")
  wallets[data.userId].earningsBalance += data.amount
  wallets[data.userId].totalEarned += data.amount
  wallets[data.userId].updatedAt = new Date().toISOString()
  localStorage.setItem("wallets", JSON.stringify(wallets))

  // Save transaction
  const transactions = JSON.parse(localStorage.getItem("wallet_transactions") || "[]")
  transactions.push(newTransaction)
  localStorage.setItem("wallet_transactions", JSON.stringify(transactions))

  return newTransaction
}

// Admin fee management functions
export async function getAdminFeeSettings(feeType: string): Promise<AdminFeeSettings> {
  const feeSettings = JSON.parse(localStorage.getItem("admin_fee_settings") || "{}")

  if (!feeSettings[feeType]) {
    // Default fee settings
    const defaultSettings: AdminFeeSettings = {
      id: `fee_${feeType}`,
      feeType: feeType as "deposit" | "withdrawal" | "transaction" | "tip",
      feePercentage: feeType === "deposit" ? 2.5 : feeType === "withdrawal" ? 1.0 : feeType === "tip" ? 0 : 3.0,
      feeFixed: feeType === "withdrawal" ? 0.25 : feeType === "tip" ? 0 : 0,
      minimumFee: feeType === "deposit" ? 0.5 : feeType === "tip" ? 0.5 : 0.25,
      maximumFee: feeType === "tip" ? 100 : undefined,
      isActive: feeType === "tip" ? true : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    feeSettings[feeType] = defaultSettings
    localStorage.setItem("admin_fee_settings", JSON.stringify(feeSettings))
    return defaultSettings
  }

  return feeSettings[feeType]
}

export async function updateAdminFeeSettings(
  feeType: string,
  settings: Partial<AdminFeeSettings>,
): Promise<AdminFeeSettings> {
  const feeSettings = JSON.parse(localStorage.getItem("admin_fee_settings") || "{}")

  if (!feeSettings[feeType]) {
    throw new Error("Fee settings not found")
  }

  feeSettings[feeType] = {
    ...feeSettings[feeType],
    ...settings,
    updatedAt: new Date().toISOString(),
  }

  localStorage.setItem("admin_fee_settings", JSON.stringify(feeSettings))
  return feeSettings[feeType]
}

function calculateFee(amount: number, feeSettings: AdminFeeSettings): number {
  if (!feeSettings.isActive) return 0

  let fee = (amount * feeSettings.feePercentage) / 100 + feeSettings.feeFixed

  if (fee < feeSettings.minimumFee) {
    fee = feeSettings.minimumFee
  }

  if (feeSettings.maximumFee && fee > feeSettings.maximumFee) {
    fee = feeSettings.maximumFee
  }

  return Math.round(fee * 100) / 100 // Round to 2 decimal places
}

async function recordFeeCollection(
  transactionId: string,
  feeType: string,
  originalAmount: number,
  feeSettings: AdminFeeSettings,
  feeAmount: number,
): Promise<void> {
  const feeCollections = JSON.parse(localStorage.getItem("admin_fee_collections") || "[]")

  const feeCollection = {
    id: `fee_${generateUniqueId()}`,
    transactionId,
    feeType,
    originalAmount,
    feePercentage: feeSettings.feePercentage,
    feeFixed: feeSettings.feeFixed,
    feeAmount,
    collectedAt: new Date().toISOString(),
  }

  feeCollections.push(feeCollection)
  localStorage.setItem("admin_fee_collections", JSON.stringify(feeCollections))
}

export async function getUpcomingPayments(userId: string): Promise<PaymentSchedule[]> {
  const schedules = JSON.parse(localStorage.getItem("payment_schedules") || "[]")
  return schedules
    .filter((s: PaymentSchedule) => s.userId === userId && s.status === "scheduled")
    .sort(
      (a: PaymentSchedule, b: PaymentSchedule) =>
        new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime(),
    )
}

export async function getPendingPayments(userId: string): Promise<WalletTransaction[]> {
  return getTransactions(`wallet_${userId}`, { status: "pending" })
}

import { createNotification } from "./notifications"

export async function addWalletTransaction(data: {
  userId: string
  type: "deposit" | "withdrawal" | "payment" | "earning" | "refund"
  amount: number
  description: string
  referenceId?: string
  referenceType?: string
  balanceType?: "deposit" | "earnings"
}): Promise<WalletTransaction> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  console.log("[v0] 💰 WALLET: Starting transaction for user:", data.userId)
  console.log("[v0] 💰 WALLET: Transaction type:", data.type, "Amount:", data.amount)
  console.log("[v0] 💰 WALLET: Description:", data.description)
  console.log("[v0] 💰 WALLET: Reference ID:", data.referenceId)

  if (data.referenceId) {
    const existingTransactions = JSON.parse(localStorage.getItem("wallet_transactions") || "[]")
    const duplicateTransaction = existingTransactions.find(
      (t: WalletTransaction) =>
        t.referenceId === data.referenceId && t.referenceType === data.referenceType && t.status === "completed",
    )

    if (duplicateTransaction) {
      console.log(`[v0] ⚠️ WALLET: Duplicate transaction prevented for referenceId: ${data.referenceId}`)
      console.log(`[v0] ⚠️ WALLET: Existing transaction ID: ${duplicateTransaction.id}`)
      throw new Error(`Transaction with reference ID ${data.referenceId} already exists`)
    }
  }

  const wallet = await getWallet(data.userId)
  const balanceType = data.balanceType || (data.type === "earning" ? "earnings" : "deposit")

  console.log("[v0] 💰 WALLET: Current wallet state before transaction:")
  console.log("[v0] 💰 WALLET: - Earnings balance:", wallet.earningsBalance)
  console.log("[v0] 💰 WALLET: - Deposit balance:", wallet.depositBalance)
  console.log("[v0] 💰 WALLET: - Total earned:", wallet.totalEarned)

  const newTransaction: WalletTransaction = {
    id: `txn_${generateUniqueId()}`,
    walletId: wallet.id,
    type: data.type,
    amount: data.amount,
    feeAmount: 0,
    netAmount: data.amount,
    balanceType,
    description: data.description,
    referenceId: data.referenceId,
    referenceType: data.referenceType,
    status: "completed",
    createdAt: new Date().toISOString(),
  }

  // Update wallet balance based on transaction type and balance type
  const wallets = JSON.parse(localStorage.getItem("wallets") || "{}")

  if (data.type === "earning") {
    console.log("[v0] 💰 WALLET: Adding", data.amount, "to earnings balance")
    wallets[data.userId].earningsBalance += data.amount
    wallets[data.userId].totalEarned += data.amount
    console.log("[v0] 💰 WALLET: New earnings balance:", wallets[data.userId].earningsBalance)
    console.log("[v0] 💰 WALLET: New total earned:", wallets[data.userId].totalEarned)
  } else if (data.type === "deposit") {
    console.log("[v0] 💰 WALLET: Adding", data.amount, "to deposit balance")
    wallets[data.userId].depositBalance += data.amount
    console.log("[v0] 💰 WALLET: New deposit balance:", wallets[data.userId].depositBalance)
  } else if (data.type === "withdrawal") {
    const withdrawAmount = Math.abs(data.amount)
    console.log("[v0] 💰 WALLET: Subtracting", withdrawAmount, "from earnings balance")
    wallets[data.userId].earningsBalance -= withdrawAmount
    wallets[data.userId].totalSpent += withdrawAmount
    console.log("[v0] 💰 WALLET: New earnings balance:", wallets[data.userId].earningsBalance)
  } else if (data.type === "payment") {
    const paymentAmount = Math.abs(data.amount)
    console.log("[v0] 💰 WALLET: Subtracting", paymentAmount, "from deposit balance for payment")
    wallets[data.userId].depositBalance -= paymentAmount
    wallets[data.userId].totalSpent += paymentAmount
    console.log("[v0] 💰 WALLET: New deposit balance:", wallets[data.userId].depositBalance)
    console.log("[v0] 💰 WALLET: New total spent:", wallets[data.userId].totalSpent)
  } else if (data.type === "refund") {
    const refundAmount = Math.abs(data.amount)
    if (balanceType === "deposit") {
      console.log("[v0] 💰 WALLET: Adding", refundAmount, "refund to deposit balance")
      wallets[data.userId].depositBalance += refundAmount
      console.log("[v0] 💰 WALLET: New deposit balance:", wallets[data.userId].depositBalance)
    } else {
      console.log("[v0] 💰 WALLET: Adding", refundAmount, "refund to earnings balance")
      wallets[data.userId].earningsBalance += refundAmount
      console.log("[v0] 💰 WALLET: New earnings balance:", wallets[data.userId].earningsBalance)
    }
  }

  wallets[data.userId].updatedAt = new Date().toISOString()
  localStorage.setItem("wallets", JSON.stringify(wallets))

  // Save transaction
  const transactions = JSON.parse(localStorage.getItem("wallet_transactions") || "[]")
  transactions.push(newTransaction)
  localStorage.setItem("wallet_transactions", JSON.stringify(transactions))

  try {
    const notificationTitle = getTransactionNotificationTitle(data.type, data.amount)
    const notificationDescription = data.description

    await createNotification({
      userId: data.userId,
      type: "payment",
      title: notificationTitle,
      description: notificationDescription,
      actionUrl: "/dashboard/wallet",
    })

    console.log("[v0] 🔔 NOTIFICATION: Created transaction notification for user:", data.userId)
  } catch (error) {
    console.error("[v0] ❌ NOTIFICATION: Failed to create transaction notification:", error)
  }

  console.log("[v0] ✅ WALLET: Transaction completed successfully!")
  console.log("[v0] 💰 WALLET: Transaction ID:", newTransaction.id)
  console.log("[v0] 💰 WALLET: Final earnings balance:", wallets[data.userId].earningsBalance)

  return newTransaction
}

function getTransactionNotificationTitle(type: string, amount: number): string {
  const absAmount = Math.abs(amount)
  const formattedAmount = `$${absAmount.toFixed(2)}`

  switch (type) {
    case "earning":
      return `💰 Earnings Added: ${formattedAmount}`
    case "deposit":
      return `💳 Deposit Successful: ${formattedAmount}`
    case "withdrawal":
      return `🏦 Withdrawal Processed: ${formattedAmount}`
    case "payment":
      return `💸 Payment Made: ${formattedAmount}`
    case "refund":
      return `🔄 Refund Received: ${formattedAmount}`
    default:
      return `💰 Transaction: ${formattedAmount}`
  }
}

export async function validateTipBalance(
  userId: string,
  tipAmount: number,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const wallet = await getWallet(userId)

    // Check if user has sufficient deposit balance for tip
    if (wallet.depositBalance < tipAmount) {
      return {
        valid: false,
        error: `Insufficient deposit balance. Required: $${tipAmount.toFixed(2)}, Available: $${wallet.depositBalance.toFixed(2)}`,
      }
    }

    // Get tip settings to check limits
    const tipSettings = await getAdminFeeSettings("tip")

    if (tipSettings.isActive) {
      // Check minimum tip
      if (tipAmount < tipSettings.minimumFee) {
        return {
          valid: false,
          error: `Minimum tip amount is $${tipSettings.minimumFee.toFixed(2)}`,
        }
      }

      // Check maximum tip
      if (tipSettings.maximumFee && tipAmount > tipSettings.maximumFee) {
        return {
          valid: false,
          error: `Maximum tip amount is $${tipSettings.maximumFee.toFixed(2)}`,
        }
      }
    }

    return { valid: true }
  } catch (error) {
    console.error("[v0] Error validating tip balance:", error)
    return {
      valid: false,
      error: "Failed to validate tip balance",
    }
  }
}

export async function processTipPayment(data: {
  employerId: string
  workerId: string
  tipAmount: number
  description: string
  referenceId: string
}): Promise<{ success: boolean; error?: string; transactions?: WalletTransaction[] }> {
  try {
    console.log("[v0] 🎁 TIP: Processing tip payment:", data.tipAmount, "from", data.employerId, "to", data.workerId)

    // Validate tip balance first
    const validation = await validateTipBalance(data.employerId, data.tipAmount)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    const tipSettings = await getAdminFeeSettings("tip")
    let feeAmount = 0

    if (tipSettings.isActive) {
      feeAmount = calculateFee(data.tipAmount, tipSettings)
    }

    const netTipAmount = data.tipAmount - feeAmount

    // Deduct tip amount from employer's deposit balance
    const employerTransaction = await addWalletTransaction({
      userId: data.employerId,
      type: "payment",
      amount: -data.tipAmount,
      description: `Tip payment: ${data.description}${feeAmount > 0 ? ` (Fee: $${feeAmount.toFixed(2)})` : ""}`,
      referenceId: data.referenceId,
      referenceType: "tip_payment",
      balanceType: "deposit",
    })

    // Add tip to worker's earnings balance
    const workerTransaction = await addWalletTransaction({
      userId: data.workerId,
      type: "earning",
      amount: netTipAmount,
      description: `Tip received: ${data.description}`,
      referenceId: data.referenceId,
      referenceType: "tip",
      balanceType: "earnings",
    })

    console.log("[v0] ✅ TIP: Tip processed successfully!")
    console.log("[v0] 💰 TIP: Employer charged:", data.tipAmount, "Worker received:", netTipAmount, "Fee:", feeAmount)

    return {
      success: true,
      transactions: [employerTransaction, workerTransaction],
    }
  } catch (error) {
    console.error("[v0] ❌ TIP: Failed to process tip payment:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to process tip payment",
    }
  }
}
