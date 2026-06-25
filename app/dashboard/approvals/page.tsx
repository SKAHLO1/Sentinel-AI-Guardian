"use client"

import { Topbar } from "@/components/sentinel/topbar"
import { ApprovalManager } from "@/components/sentinel/approval-manager"

export default function ApprovalsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Topbar title="Approval Manager" subtitle="Review and revoke all token approvals across your wallets" />
      <div className="pt-14 p-4 md:p-6">
        <ApprovalManager />
      </div>
    </div>
  )
}
