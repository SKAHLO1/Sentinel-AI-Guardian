"use client"

import { Topbar } from "@/components/sentinel/topbar"
import { ApprovalManager } from "@/components/sentinel/approval-manager"

export default function ApprovalsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Topbar title="Approval Manager" subtitle="Review and revoke all token approvals across your wallets" />
      <div className="pt-14 px-4 md:px-6 pb-6">
        <ApprovalManager />
      </div>
    </div>
  )
}
