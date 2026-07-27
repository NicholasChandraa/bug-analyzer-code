"use client"

import React, { useState, useEffect } from "react"
import { triageService } from "../services/triage.service"
import type { BugReportResponseDTO } from "@restack/shared"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bug, FileCode, CheckCircle, Clock, AlertTriangle } from "lucide-react"

export function BugReportList() {
  const [bugReports, setBugReports] = useState<BugReportResponseDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true)
        const reports = await triageService.listBugReports()
        setBugReports(reports)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load bug reports")
      } finally {
        setLoading(false)
      }
    }
    loadReports()
  }, [])

  const getStatusBadge = (status: BugReportResponseDTO["status"]) => {
    switch (status) {
      case "resolved":
        return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Selesai</Badge>
      case "in_progress":
        return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" /> Sedang Diperbaiki</Badge>
      default:
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Open</Badge>
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Memuat laporan bug...</div>
  }

  if (error) {
    return <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-md">{error}</div>
  }

  if (bugReports.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/20">
        <Bug className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-base font-semibold">Belum Ada Laporan Bug Terverifikasi</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Laporan bug yang dianalisis dan dikonfirmasi oleh Triage Agent akan muncul di sini.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {bugReports.map((report) => (
        <Card key={report.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-primary" />
                  <code>{report.filePath}</code>
                  {report.lineEstimate && (
                    <span className="text-xs font-normal text-muted-foreground">
                      (Baris {report.lineEstimate})
                    </span>
                  )}
                </CardTitle>
                {report.repositoryName && (
                  <p className="text-xs text-muted-foreground">
                    Repo: <strong className="text-foreground">{report.repositoryName}</strong>
                  </p>
                )}
              </div>
              {getStatusBadge(report.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <span className="font-semibold text-foreground">Penyebab / Alasan Bug:</span>
              <p className="text-muted-foreground mt-0.5 whitespace-pre-wrap">{report.reason}</p>
            </div>
            <div>
              <span className="font-semibold text-foreground">Saran Perbaikan Kode:</span>
              <pre className="bg-muted p-3 rounded-md overflow-x-auto text-[11px] font-mono mt-1 border">
                <code>{report.suggestedFix}</code>
              </pre>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
