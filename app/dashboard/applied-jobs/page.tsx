"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Search,
  Filter,
  Clock,
  XCircle,
  RefreshCw,
  Upload,
  AlertTriangle,
  Info,
  Timer,
  CheckCircle,
} from "lucide-react"
import { toast } from "sonner"
import { getUserApplications, getJobById, type Job } from "@/lib/jobs"
import { getWorkProofsByJob, type WorkProof } from "@/lib/work-proofs"
import { acceptRejection, createDispute } from "@/lib/work-proofs"
import { getRevisionSettingsFromAPI, type RevisionSettings } from "@/lib/admin-settings"

interface JobApplication {
  id: string
  jobId: string
  applicantId: string // Changed from workerId to applicantId
  coverLetter: string
  proposedBudget: number
  estimatedDuration: string
  portfolioLinks: string[]
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled"
  createdAt: string
  appliedAt?: string
  job?: Job | null
  applicant?: {
    id: string
    firstName: string
    lastName: string
    username: string
    rating: number
    totalReviews: number
    skills: string[]
  }
}

interface WorkProofSubmission {
  title: string
  description: string
  screenshots: File[]
  proofLinks: string[]
  additionalNotes: string
}

const AppliedJobsPage = () => {
  const { user } = useAuth()
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [jobs, setJobs] = useState<{ [key: string]: Job }>({})
  const [workProofs, setWorkProofs] = useState<{ [key: string]: WorkProof[] }>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [submittingProof, setSubmittingProof] = useState(false)
  const [disputeModalOpen, setDisputeModalOpen] = useState(false)
  const [disputeSubmission, setDisputeSubmission] = useState({
    reason: "",
    requestedAction: "payment" as const,
  })
  const [proofSubmission, setProofSubmission] = useState({
    description: "",
    screenshots: [] as File[],
    proofLinks: [""],
    additionalNotes: "",
  })

  const [rejectionResponseModalOpen, setRejectionResponseModalOpen] = useState(false)
  const [selectedRejectedProof, setSelectedRejectedProof] = useState<WorkProof | null>(null)
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false)
  const [selectedRevisionProof, setSelectedRevisionProof] = useState<WorkProof | null>(null)
  const [revisionSettings, setRevisionSettings] = useState<RevisionSettings | null>(null)
  const [viewSubmissionModalOpen, setViewSubmissionModalOpen] = useState(false)
  const [selectedWorkProof, setSelectedWorkProof] = useState<WorkProof | null>(null)

  const [countdowns, setCountdowns] = useState<{ [key: string]: string }>({})

  const calculateCountdown = (deadline: string, proofStatus?: string): string => {
    // If job is already auto-processed, don't show countdown
    if (proofStatus === "cancelled_by_worker" || proofStatus === "rejected_accepted") {
      return "AUTO_PROCESSED"
    }

    const now = new Date().getTime()
    const deadlineTime = new Date(deadline).getTime()
    const timeLeft = deadlineTime - now

    if (timeLeft <= 0) {
      return "EXPIRED"
    }

    const hours = Math.floor(timeLeft / (1000 * 60 * 60))
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

    if (hours > 0) {
      return `${hours}h ${minutes}m left`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s left`
    } else {
      return `${seconds}s left`
    }
  }

  const processExpiredTimeout = async (proofId: string, proofStatus: string) => {
    try {
      console.log("[v0] Processing expired timeout for proof:", proofId, "status:", proofStatus)

      const response = await fetch("/api/test-cron", {
        method: "GET",
      })

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] Timeout processing completed:", result)

        // Show success message based on the type of timeout
        if (proofStatus === "rejected") {
          toast.success("Rejection timeout expired - Refund processed automatically!")
        } else if (proofStatus === "revision_requested") {
          toast.success("Revision timeout expired - Job cancelled and refunded automatically!")
        }

        // Refresh the applications data to show updated status
        await refreshApplications()
      } else {
        console.error("[v0] Failed to process timeout:", response.status)
        toast.error("Failed to process expired timeout. Please refresh the page.")
      }
    } catch (error) {
      console.error("[v0] Error processing expired timeout:", error)
      toast.error("Failed to process expired timeout. Please refresh the page.")
    }
  }

  const updateCountdowns = () => {
    const newCountdowns: { [key: string]: string } = {}
    const expiredProofs: { proofId: string; status: string }[] = []

    Object.values(workProofs)
      .flat()
      .forEach((proof) => {
        if (proof.status === "rejected" && proof.rejectionDeadline) {
          const countdown = calculateCountdown(proof.rejectionDeadline, proof.status)
          newCountdowns[proof.id] = countdown

          if (countdown === "EXPIRED" && countdowns[proof.id] !== "EXPIRED") {
            expiredProofs.push({ proofId: proof.id, status: proof.status })
          }
        } else if (proof.status === "revision_requested" && proof.revisionDeadline) {
          const countdown = calculateCountdown(proof.revisionDeadline, proof.status)
          newCountdowns[proof.id] = countdown

          if (countdown === "EXPIRED" && countdowns[proof.id] !== "EXPIRED") {
            expiredProofs.push({ proofId: proof.id, status: proof.status })
          }
        } else if (proof.status === "cancelled_by_worker" || proof.status === "rejected_accepted") {
          newCountdowns[proof.id] = "AUTO_PROCESSED"
        }
      })

    setCountdowns(newCountdowns)

    expiredProofs.forEach(({ proofId, status }) => {
      processExpiredTimeout(proofId, status)
    })
  }

  useEffect(() => {
    if (user?.id) {
      console.log("[v0] Applied Jobs page mounted, loading data for user:", user.id)
      loadWorkProofs()
    }
  }, [user?.id])

  useEffect(() => {
    const interval = setInterval(updateCountdowns, 1000) // Update every second
    return () => clearInterval(interval)
  }, [workProofs, countdowns]) // Include countdowns in dependencies to detect changes

  useEffect(() => {
    if (!user?.id) return

    const refreshInterval = setInterval(() => {
      console.log("[v0] Periodic refresh of application data")
      refreshApplications()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(refreshInterval)
  }, [user?.id])

  const handleRejectionResponse = (proof: WorkProof) => {
    setSelectedRejectedProof(proof)
    setRejectionResponseModalOpen(true)
  }

  const handleRevisionResubmit = (proof: WorkProof) => {
    setSelectedRevisionProof(proof)
    setResubmitModalOpen(true)
  }

  const handleAcceptRejection = async () => {
    if (!selectedRejectedProof) return

    try {
      await acceptRejection(selectedRejectedProof.id)
      toast.success("Rejection accepted. Refund processed to employer.")
      setRejectionResponseModalOpen(false)
      await refreshApplications()
    } catch (error) {
      console.error("Error accepting rejection:", error)
      toast.error("Failed to accept rejection")
    }
  }

  const handleCreateDispute = async () => {
    console.log("[v0] Starting dispute submission...")
    console.log("[v0] Selected proof:", selectedRejectedProof?.id)
    console.log("[v0] Dispute data:", disputeSubmission)

    if (!selectedRejectedProof || !disputeSubmission.reason) {
      console.log("[v0] Validation failed - missing required fields")
      toast.error("Please fill in all required fields")
      return
    }

    try {
      console.log("[v0] Calling createDispute function...")
      await createDispute(selectedRejectedProof.id, disputeSubmission)
      console.log("[v0] Dispute created successfully")
      toast.success("Dispute submitted successfully! Admin will review your case.")
      setRejectionResponseModalOpen(false)
      setDisputeModalOpen(false)
      setDisputeSubmission({
        reason: "",
        requestedAction: "payment" as const,
      })
      await refreshApplications()
    } catch (error) {
      console.error("[v0] Error submitting dispute:", error)

      if (error instanceof Error && error.message.includes("already exists and is pending resolution")) {
        toast.error(
          "A dispute for this job is already being reviewed by our admin team. Please check your existing disputes or wait for the current dispute to be resolved.",
        )
        // Close the modal since the user can't create another dispute
        setRejectionResponseModalOpen(false)
        setDisputeModalOpen(false)
        setDisputeSubmission({
          reason: "",
          requestedAction: "payment" as const,
        })
      } else {
        // Handle other errors with the original error message
        toast.error(`Failed to submit dispute: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }
  }

  const handleCancelJob = async (proofId: string) => {
    if (!confirm("Are you sure you want to cancel this job? The employer will receive a full refund.")) {
      return
    }

    try {
      console.log("[v0] Cancelling job for proof:", proofId)

      // Find the work proof to get job and application details
      const proof = Object.values(workProofs)
        .flat()
        .find((p) => p.id === proofId)
      if (!proof) {
        throw new Error("Work proof not found")
      }

      const { cancelJobByWorker } = await import("@/lib/work-proofs")
      await cancelJobByWorker(proofId)

      toast.success("Job cancelled successfully. Employer has been refunded.")
      await refreshApplications()
    } catch (error) {
      console.error("Error cancelling job:", error)
      toast.error("Failed to cancel job")
    }
  }

  const loadWorkProofs = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      console.log("[v0] Loading applications for user:", user.id)
      const userApplications = await getUserApplications(user.id)
      console.log("[v0] Found applications:", userApplications.length)
      setApplications(userApplications)

      const jobIds = [...new Set(userApplications.map((app) => app.jobId))]
      console.log("[v0] Loading jobs for IDs:", jobIds)
      const jobsData: { [key: string]: Job } = {}
      const workProofsData: { [key: string]: WorkProof[] } = {}

      console.log("[v0] Processing expired deadlines immediately...")
      try {
        const response = await fetch("/api/test-cron-now", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const result = await response.json()
          console.log("[v0] Immediate processing completed:", result)
        } else {
          console.log("[v0] Immediate processing failed:", response.status)
        }
      } catch (error) {
        console.error("[v0] Error in immediate processing:", error)
      }

      await Promise.all(
        jobIds.map(async (jobId) => {
          try {
            const job = await getJobById(jobId)
            if (job) {
              jobsData[jobId] = job
              console.log("[v0] Loaded job:", job.title)
            }

            const proofs = await getWorkProofsByJob(jobId)
            workProofsData[jobId] = proofs.filter((proof) => proof.workerId === user.id)
            console.log("[v0] Found work proofs for job", jobId, ":", workProofsData[jobId].length)
          } catch (error) {
            console.error(`Error loading data for job ${jobId}:`, error)
          }
        }),
      )

      setJobs(jobsData)
      setWorkProofs(workProofsData)
      console.log("[v0] Applied jobs data loaded successfully")
    } catch (error) {
      console.error("Error loading applications:", error)
      toast.error("Failed to load your jobs")
    } finally {
      setLoading(false)
    }
  }

  const refreshApplications = async () => {
    if (!user?.id) return

    try {
      const userApplications = await getUserApplications(user.id)
      setApplications(userApplications)

      const jobIds = [...new Set(userApplications.map((app) => app.jobId))]
      const jobsData: { [key: string]: Job } = {}
      const workProofsData: { [key: string]: WorkProof[] } = {}

      await Promise.all(
        jobIds.map(async (jobId) => {
          try {
            const job = await getJobById(jobId)
            if (job) {
              jobsData[jobId] = job
            }

            const proofs = await getWorkProofsByJob(jobId)
            workProofsData[jobId] = proofs.filter((proof) => proof.workerId === user.id)
          } catch (error) {
            console.error(`Error loading data for job ${jobId}:`, error)
          }
        }),
      )

      setJobs(jobsData)
      setWorkProofs(workProofsData)
    } catch (error) {
      console.error("Error refreshing applications:", error)
      toast.error("Failed to refresh applications")
    }
  }

  const handleSubmitWork = (application: JobApplication) => {
    // Implementation for submitting work
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    // Implementation for handling file upload
  }

  const removeScreenshot = (index: number) => {
    // Implementation for removing screenshot
  }

  const addProofLink = () => {
    // Implementation for adding proof link
  }

  const updateProofLink = (index: number, value: string) => {
    // Implementation for updating proof link
  }

  const removeProofLink = (index: number) => {
    // Implementation for removing proof link
  }

  const submitProof = async () => {
    // Implementation for submitting proof
  }

  const handleResubmitWork = async () => {
    if (!selectedRevisionProof || !user?.id) return

    try {
      setSubmittingProof(true)
      console.log("[v0] Resubmitting work for proof:", selectedRevisionProof.id)

      const formData = new FormData()
      const form = document.querySelector("#resubmit-form") as HTMLFormElement
      if (!form) throw new Error("Form not found")

      const workDescription = (form.querySelector('[name="workDescription"]') as HTMLTextAreaElement)?.value || ""
      const proofLinks = (form.querySelector('[name="proofLinks"]') as HTMLTextAreaElement)?.value || ""
      const additionalNotes = (form.querySelector('[name="additionalNotes"]') as HTMLTextAreaElement)?.value || ""

      if (!workDescription.trim()) {
        toast.error("Please provide a work description")
        return
      }

      const { resubmitWork } = await import("@/lib/work-proofs")
      await resubmitWork(selectedRevisionProof.id, {
        description: workDescription,
        proofLinks: proofLinks.split("\n").filter((link) => link.trim()),
        additionalNotes,
        proofFiles: [],
      })

      toast.success("Work resubmitted successfully!")
      setResubmitModalOpen(false)
      setSelectedRevisionProof(null)
      await refreshApplications()
    } catch (error) {
      console.error("Error resubmitting work:", error)
      toast.error("Failed to resubmit work")
    } finally {
      setSubmittingProof(false)
    }
  }

  const handleViewSubmission = (application: JobApplication) => {
    // Implementation for handling view submission
  }

  const getStatusDisplay = (status: string) => {
    return {
      label: "Waiting",
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: <Clock className="h-3 w-3" />,
    }
  }

  const getJobStatus = (application: JobApplication): string => {
    const proofs = application.jobId ? workProofs[application.jobId] || [] : []
    const latestProof = proofs[proofs.length - 1]

    if (latestProof) {
      // Check if job was automatically cancelled due to expired deadlines
      if (latestProof.status === "cancelled_by_worker") {
        return "auto_cancelled"
      }
      // Check if rejection was automatically accepted (refunded)
      if (latestProof.status === "rejected_accepted") {
        return "auto_refunded"
      }
      return latestProof.status
    }

    return application.status
  }

  const readyJobs = applications.filter((app) => getJobStatus(app) === "ready")
  const submittedJobs = applications.filter((app) => getJobStatus(app) === "submitted")
  const completedJobs = applications.filter((app) => getJobStatus(app) === "completed")
  const waitingJobs = applications.filter((app) => getJobStatus(app) === "waiting")
  const revisionJobs = applications.filter((app) => getJobStatus(app) === "revision_requested")
  const rejectedJobs = applications.filter((app) => getJobStatus(app) === "rejected")
  const disputedJobs = applications.filter((app) => getJobStatus(app) === "disputed")
  const autoCancelledJobs = applications.filter((app) => getJobStatus(app) === "auto_cancelled")
  const autoRefundedJobs = applications.filter((app) => getJobStatus(app) === "auto_refunded")

  const renderApplicationCard = (application: JobApplication) => {
    const job = application.job || jobs[application.jobId]
    if (!job) return null

    const jobProofs = workProofs[application.jobId] || []
    const userProof = jobProofs.find((proof) => proof.applicationId === application.id)
    const status = userProof?.status || application.status

    const getCountdownDisplay = (proof: WorkProof) => {
      const countdown = countdowns[proof.id]
      if (!countdown) return null

      const isExpired = countdown === "EXPIRED"
      const isUrgent = countdown.includes("m") && !countdown.includes("h")

      return (
        <div
          className={`p-3 rounded-lg border-2 ${
            isExpired
              ? "bg-red-100 border-red-300"
              : isUrgent
                ? "bg-orange-100 border-orange-300"
                : "bg-yellow-100 border-yellow-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            <Timer
              className={`h-4 w-4 ${isExpired ? "text-red-600" : isUrgent ? "text-orange-600" : "text-yellow-600"}`}
            />
            <span
              className={`font-semibold ${
                isExpired ? "text-red-800" : isUrgent ? "text-orange-800" : "text-yellow-800"
              }`}
            >
              {isExpired ? "⚠️ DEADLINE EXPIRED - ACTION REQUIRED!" : `⏰ ${countdown}`}
            </span>
          </div>
          {isExpired && (
            <p className="text-sm text-red-700 mt-1">
              You must take action now or the system will auto-process this request.
            </p>
          )}
        </div>
      )
    }

    return (
      <Card key={application.id} className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-lg">{job.title}</span>
            <Badge className={getStatusColor(status)}>{getStatusLabel(status)}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
            <div className="flex items-center">
              <Clock className="mr-1 h-3 w-3" />
              Applied {new Date(application.createdAt).toLocaleDateString()}
            </div>
          </div>
          <p className="text-sm text-gray-600 line-clamp-1">{job?.description}</p>

          {status === "rejected" && userProof && (
            <div className="space-y-3">
              {getCountdownDisplay(userProof)}

              <div className="flex items-center space-x-2 p-3 bg-red-50 rounded text-sm text-red-800">
                <XCircle className="h-4 w-4" />
                <span>
                  Work rejected - You have{" "}
                  {formatTimeDisplay(
                    revisionSettings?.rejectionResponseTimeoutValue || 24,
                    revisionSettings?.rejectionResponseTimeoutUnit || "hours",
                  )}{" "}
                  to respond
                </span>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">⚠️ Important Warning</p>
                    <p>
                      Filing false disputes or submitting fake work may result in account suspension and penalty fees.
                      Only dispute if you genuinely believe your work met the requirements.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => handleRejectionResponse(userProof)}
                  size="sm"
                  className="h-7 text-xs px-3 bg-red-600 hover:bg-red-700"
                >
                  Respond to Rejection
                </Button>
              </div>
            </div>
          )}

          {status === "revision_requested" && userProof && (
            <div className="space-y-3">
              {getCountdownDisplay(userProof)}

              <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded text-sm text-yellow-800">
                <RefreshCw className="h-4 w-4" />
                <span>
                  Revision requested - You have{" "}
                  {formatTimeDisplay(
                    revisionSettings?.revisionRequestTimeoutValue || 24,
                    revisionSettings?.revisionRequestTimeoutUnit || "hours",
                  )}{" "}
                  to resubmit
                </span>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Revision Guidelines</p>
                    <p>
                      Employers can request up to {revisionSettings?.maxRevisionRequests || 2} revisions maximum. If you
                      don't resubmit within{" "}
                      {formatTimeDisplay(
                        revisionSettings?.revisionRequestTimeoutValue || 24,
                        revisionSettings?.revisionRequestTimeoutUnit || "hours",
                      )}
                      , the job will be automatically cancelled with a refund to the employer.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => handleRevisionResubmit(userProof)}
                  size="sm"
                  className="h-7 text-xs px-3 bg-yellow-600 hover:bg-yellow-700"
                >
                  Resubmit Work
                </Button>
                <Button
                  onClick={() => handleCancelJob(userProof.id)}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-3 bg-transparent"
                >
                  Cancel Job
                </Button>
              </div>
            </div>
          )}

          {status === "auto_cancelled" && userProof && (
            <div className="space-y-3">{renderDeadlineWarning(userProof)}</div>
          )}

          {status === "auto_refunded" && userProof && (
            <div className="space-y-3">{renderDeadlineWarning(userProof)}</div>
          )}
        </CardContent>
      </Card>
    )
  }

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "ready":
        return "Ready to Work"
      case "submitted":
        return "Under Review"
      case "approved":
      case "auto_approved":
        return "Completed"
      case "rejected":
        return "Action Required"
      case "revision_requested":
        return "Revision Needed"
      case "rejected_accepted":
        return "Rejection Accepted"
      case "disputed":
        return "Under Dispute"
      case "cancelled_by_worker":
        return "Cancelled"
      case "auto_cancelled":
        return "Auto-Cancelled"
      case "auto_refunded":
        return "Auto-Refunded"
      default:
        return "Waiting"
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "ready":
        return "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 shadow-lg shadow-blue-200 font-semibold px-3 py-1.5 animate-pulse"
      case "submitted":
        return "bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-500 shadow-lg shadow-purple-200 font-semibold px-3 py-1.5"
      case "approved":
      case "auto_approved":
        return "bg-gradient-to-r from-green-500 to-green-600 text-white border-green-500 shadow-lg shadow-green-200 font-semibold px-3 py-1.5 ring-2 ring-green-300"
      case "rejected":
        return "bg-gradient-to-r from-red-500 to-red-600 text-white border-red-500 shadow-lg shadow-red-200 font-semibold px-3 py-1.5 animate-bounce"
      case "revision_requested":
        return "bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-yellow-500 shadow-lg shadow-yellow-200 font-semibold px-3 py-1.5 ring-2 ring-yellow-300"
      case "rejected_accepted":
        return "bg-gradient-to-r from-gray-500 to-gray-600 text-white border-gray-500 shadow-lg shadow-gray-200 font-semibold px-3 py-1.5"
      case "disputed":
        return "bg-gradient-to-r from-orange-500 to-red-500 text-white border-orange-500 shadow-lg shadow-orange-200 font-semibold px-3 py-1.5 ring-2 ring-orange-300 animate-pulse"
      case "cancelled_by_worker":
        return "bg-gradient-to-r from-slate-500 to-slate-600 text-white border-slate-500 shadow-lg shadow-slate-200 font-semibold px-3 py-1.5"
      case "auto_cancelled":
        return "bg-green-100 text-green-800 border-green-300"
      case "auto_refunded":
        return "bg-green-100 text-green-800 border-green-300"
      default:
        return "bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-400 shadow-lg shadow-gray-200 font-semibold px-3 py-1.5"
    }
  }

  const renderDeadlineWarning = (proof: WorkProof) => {
    const countdown = countdowns[proof.id]
    if (!countdown) return null

    const isAutoProcessed = countdown === "AUTO_PROCESSED"
    const isExpired = countdown === "EXPIRED"
    const isUrgent = countdown.includes("m") && !countdown.includes("h")

    if (isAutoProcessed) {
      return (
        <div className="p-3 rounded-lg border-2 bg-green-100 border-green-300">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-green-800">✅ AUTO-PROCESSED - REFUND ISSUED</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            This request was automatically processed and refunded due to deadline expiration.
          </p>
        </div>
      )
    }

    return (
      <div
        className={`p-3 rounded-lg border-2 ${
          isExpired
            ? "bg-red-100 border-red-300"
            : isUrgent
              ? "bg-orange-100 border-orange-300"
              : "bg-yellow-100 border-yellow-300"
        }`}
      >
        <div className="flex items-center space-x-2">
          <Timer
            className={`h-4 w-4 ${isExpired ? "text-red-600" : isUrgent ? "text-orange-600" : "text-yellow-600"}`}
          />
          <span
            className={`font-semibold ${isExpired ? "text-red-800" : isUrgent ? "text-orange-800" : "text-yellow-800"}`}
          >
            {isExpired ? "⚠️ DEADLINE EXPIRED - ACTION REQUIRED!" : `⏰ ${countdown}`}
          </span>
        </div>
        {isExpired && (
          <p className="text-sm text-red-700 mt-1">
            You must take action now or the system will auto-process this request.
          </p>
        )}
      </div>
    )
  }

  useEffect(() => {
    const loadRevisionSettings = async () => {
      try {
        const settings = await getRevisionSettingsFromAPI()
        setRevisionSettings(settings)
        console.log("[v0] Loaded revision settings from API in applied jobs:", settings)
      } catch (error) {
        console.error("Failed to load revision settings in applied jobs:", error)
        // Set default settings if API fails
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
      }
    }

    loadRevisionSettings()
  }, [])

  const formatTimeDisplay = (value: number, unit: string) => {
    if (unit === "minutes") {
      return value === 1 ? "1 minute" : `${value} minutes`
    } else if (unit === "hours") {
      return value === 1 ? "1 hour" : `${value} hours`
    } else if (unit === "days") {
      return value === 1 ? "1 day" : `${value} days`
    }
    // Fallback to hours if unit is not recognized
    return value === 1 ? "1 hour" : `${value} hours`
  }

  if (loading) {
    return (
      <>
        <DashboardHeader title="My Jobs" description="Track your work and earnings" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your jobs...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <DashboardHeader title="Applied Jobs" description="Track your job applications and submissions" />

      <div className="flex-1 overflow-auto p-6">
        {applications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Applied Jobs Yet</h3>
            <p className="text-gray-500 mb-4">
              You haven't applied to any jobs yet. Start browsing available jobs to find work opportunities.
            </p>
            <Button onClick={() => (window.location.href = "/jobs")} className="bg-blue-600 hover:bg-blue-700">
              Browse Jobs
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="md:w-64"
                />
                <Button variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center space-x-4">
                <Select onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="ready">Ready to Work</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="revision_requested">Revision Requested</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                    <SelectItem value="auto_cancelled">Auto-Cancelled</SelectItem>
                    <SelectItem value="auto_refunded">Auto-Refunded</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {applications.map((application) => renderApplicationCard(application))}
            </div>

            {autoCancelledJobs.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  Auto-Cancelled Jobs ({autoCancelledJobs.length})
                </h3>
                <div className="grid gap-4">
                  {autoCancelledJobs.map((application) => (
                    <Card
                      key={application.id}
                      className="hover:shadow-md transition-shadow bg-green-100 text-green-800"
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="text-lg">{jobs[application.jobId]?.title}</span>
                          <Badge className="bg-green-100 text-green-800 border-green-300">
                            Auto-Cancelled - Refunded
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                          <div className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            Applied {new Date(application.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-1">{jobs[application.jobId]?.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {autoRefundedJobs.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  Auto-Refunded Jobs ({autoRefundedJobs.length})
                </h3>
                <div className="grid gap-4">
                  {autoRefundedJobs.map((application) => (
                    <Card
                      key={application.id}
                      className="hover:shadow-md transition-shadow bg-green-100 text-green-800"
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="text-lg">{jobs[application.jobId]?.title}</span>
                          <Badge className="bg-green-100 text-green-800 border-green-300">Auto-Refunded</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                          <div className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            Applied {new Date(application.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-1">{jobs[application.jobId]?.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Enhanced Rejection Response Modal */}
        <Dialog open={rejectionResponseModalOpen} onOpenChange={setRejectionResponseModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Work Rejected - Choose Your Response</DialogTitle>
              <p className="text-sm text-gray-600">
                {selectedRejectedProof && revisionSettings
                  ? `Your work was rejected. You have ${revisionSettings.rejectionResponseTimeoutValue} ${revisionSettings.rejectionResponseTimeoutUnit} to respond or it will be automatically accepted.`
                  : "Your work was rejected. You have 24 hours to respond or it will be automatically accepted."}
              </p>
            </DialogHeader>

            {selectedRejectedProof && (
              <div className="space-y-4">
                {countdowns[selectedRejectedProof.id] && (
                  <div
                    className={`p-3 rounded-lg border-2 ${
                      countdowns[selectedRejectedProof.id] === "EXPIRED"
                        ? "bg-red-100 border-red-300"
                        : countdowns[selectedRejectedProof.id].includes("m") &&
                            !countdowns[selectedRejectedProof.id].includes("h")
                          ? "bg-orange-100 border-orange-300"
                          : "bg-yellow-100 border-yellow-300"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Timer
                        className={`h-4 w-4 ${
                          countdowns[selectedRejectedProof.id] === "EXPIRED"
                            ? "text-red-600"
                            : countdowns[selectedRejectedProof.id].includes("m") &&
                                !countdowns[selectedRejectedProof.id].includes("h")
                              ? "text-orange-600"
                              : "text-yellow-600"
                        }`}
                      />
                      <span
                        className={`font-semibold ${
                          countdowns[selectedRejectedProof.id] === "EXPIRED"
                            ? "text-red-800"
                            : countdowns[selectedRejectedProof.id].includes("m") &&
                                !countdowns[selectedRejectedProof.id].includes("h")
                              ? "text-orange-800"
                              : "text-yellow-800"
                        }`}
                      >
                        {countdowns[selectedRejectedProof.id] === "EXPIRED"
                          ? "⚠️ DEADLINE EXPIRED - CHOOSE NOW!"
                          : `⏰ ${countdowns[selectedRejectedProof.id]} to respond`}
                      </span>
                    </div>
                  </div>
                )}

                <div className="bg-red-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2 text-red-900">Rejection Details</h4>
                  <p className="text-sm text-red-800 mb-2">
                    <strong>Job:</strong> {selectedRejectedProof.title}
                  </p>
                  <p className="text-sm text-red-800 mb-2">
                    <strong>Rejected:</strong>{" "}
                    {selectedRejectedProof.reviewedAt
                      ? new Date(selectedRejectedProof.reviewedAt).toLocaleDateString()
                      : "Recently"}
                  </p>
                  {selectedRejectedProof.reviewFeedback && (
                    <div className="bg-white p-3 rounded border border-red-200">
                      <p className="text-sm text-red-800">
                        <strong>Employer's Feedback:</strong>
                      </p>
                      <p className="text-sm text-red-700 mt-1">{selectedRejectedProof.reviewFeedback}</p>
                    </div>
                  )}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">⚠️ Important Warning</h4>
                  <p className="text-sm text-yellow-800 mb-3">
                    Filing false disputes or submitting fake work may result in account suspension and penalty fees.
                    Only dispute if you genuinely believe your work met the requirements.
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded p-3 mt-3">
                    <p className="text-xs text-red-700">
                      <strong>Dispute Consequences:</strong> If admin finds your dispute invalid, you may face: •
                      Account warning or temporary suspension • Reduced priority in future job applications • Potential
                      penalty fees for wasting admin time
                    </p>
                  </div>
                </div>

                <div className="flex flex-col space-y-3">
                  <Button onClick={handleAcceptRejection} className="w-full bg-gray-600 hover:bg-gray-700">
                    Accept Rejection ( Job poster gets refund)
                  </Button>

                  <Button
                    onClick={() => {
                      setRejectionResponseModalOpen(false)
                      setDisputeModalOpen(true)
                    }}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    File a Dispute (Admin Review)
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setRejectionResponseModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={disputeModalOpen} onOpenChange={setDisputeModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">File a Dispute</DialogTitle>
              <p className="text-sm text-gray-600">Explain why you believe the rejection is unfair.</p>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dispute-reason">Reason for Dispute</Label>
                <Textarea
                  id="dispute-reason"
                  placeholder="Explain why you disagree with the rejection..."
                  rows={3}
                  value={disputeSubmission.reason}
                  onChange={(e) => setDisputeSubmission({ ...disputeSubmission, reason: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requested-action">Requested Action</Label>
                <select
                  id="requested-action"
                  className="w-full border rounded-md px-3 py-2"
                  value={disputeSubmission.requestedAction}
                  onChange={(e) =>
                    setDisputeSubmission({
                      ...disputeSubmission,
                      requestedAction: e.target.value as "payment",
                    })
                  }
                >
                  <option value="payment">Request Payment</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setDisputeModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDispute} className="bg-orange-600 hover:bg-orange-700">
                Submit Dispute
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={resubmitModalOpen} onOpenChange={setResubmitModalOpen}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-0 overflow-hidden">
            <div className="flex flex-col h-full max-h-[95vh]">
              <DialogHeader className="px-6 py-4 border-b bg-white sticky top-0 z-10">
                <DialogTitle className="text-lg font-semibold">Resubmit Work for Revision</DialogTitle>
                <p className="text-sm text-gray-600">Provide the revised work based on employer feedback</p>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {selectedRevisionProof && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium mb-2 text-yellow-900">Revision Details</h4>
                    <p className="text-sm text-yellow-800 mb-2">
                      <strong>Job:</strong> {selectedRevisionProof.title}
                    </p>
                    <p className="text-sm text-yellow-800 mb-2">
                      <strong>Requested:</strong>{" "}
                      {selectedRevisionProof.reviewedAt
                        ? new Date(selectedRevisionProof.reviewedAt).toLocaleDateString()
                        : "Recently"}
                    </p>
                    {selectedRevisionProof.reviewFeedback && (
                      <div className="bg-white p-3 rounded border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          <strong>Employer's Feedback:</strong>
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">{selectedRevisionProof.reviewFeedback}</p>
                      </div>
                    )}
                  </div>
                )}

                <form id="resubmit-form" className="space-y-4">
                  <div>
                    <Label htmlFor="workDescription">Work Description *</Label>
                    <Textarea
                      id="workDescription"
                      name="workDescription"
                      placeholder="Describe what you completed and how you met the requirements"
                      className="min-h-[100px]"
                      defaultValue={selectedRevisionProof?.submissionText || ""}
                    />
                  </div>

                  <div>
                    <Label htmlFor="proofLinks">External Proof Links (Optional)</Label>
                    <Textarea
                      id="proofLinks"
                      name="proofLinks"
                      placeholder="https://link-to-your-completed-work.com"
                      className="min-h-[80px]"
                      defaultValue={selectedRevisionProof?.proofLinks?.join("\n") || ""}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Add links to YouTube videos, social media posts, websites, or other external proof
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="additionalNotes"
                      name="additionalNotes"
                      placeholder="Any additional information about your work..."
                      className="min-h-[80px]"
                      defaultValue={selectedRevisionProof?.additionalNotes || ""}
                    />
                  </div>
                </form>
              </div>

              <div className="sticky bottom-0 bg-white border-t pt-4 mt-6 -mx-6 px-6 pb-4">
                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={() => setResubmitModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleResubmitWork}
                    disabled={submittingProof}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    {submittingProof ? "Resubmitting Work..." : "Resubmit Revised Work"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={viewSubmissionModalOpen} onOpenChange={setViewSubmissionModalOpen}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-0 overflow-hidden">
            <div className="flex flex-col h-full max-h-[95vh]">
              <DialogHeader className="px-6 py-4 border-b bg-white sticky top-0 z-10">
                <DialogTitle className="text-lg font-semibold">My Submission Details</DialogTitle>
                <p className="text-sm text-gray-600">View the details of your submitted work</p>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {selectedWorkProof && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Work Description</Label>
                      <p className="text-sm text-gray-800 whitespace-pre-line">{selectedWorkProof.description}</p>
                    </div>

                    {selectedWorkProof.proofFiles && selectedWorkProof.proofFiles.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-base font-semibold">📸 Proof Screenshots/Files</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {selectedWorkProof.proofFiles.map((file, index) => (
                            <div
                              key={index}
                              className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50"
                            >
                              <div className="relative group">
                                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-green-200 max-w-xs">
                                  {file.type.startsWith("image/") ? (
                                    <img
                                      src={file.url || "/placeholder.svg"}
                                      alt={`Screenshot ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                      <div className="text-center">
                                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-600 font-medium">{file.name}</p>
                                        <p className="text-xs text-gray-500">{file.type.split("/")[1].toUpperCase()}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 truncate flex-1 mr-2">{file.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedWorkProof.proofLinks && selectedWorkProof.proofLinks.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">External Proof Links</Label>
                        <ul className="list-disc pl-5 space-y-1">
                          {selectedWorkProof.proofLinks.map((link, index) => (
                            <li key={index} className="text-sm text-gray-800">
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {link}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedWorkProof.additionalNotes && (
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">Additional Notes</Label>
                        <p className="text-sm text-gray-800 whitespace-pre-line">{selectedWorkProof.additionalNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-white border-t pt-4 mt-6 -mx-6 px-6 pb-4">
                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={() => setViewSubmissionModalOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}

export default AppliedJobsPage
