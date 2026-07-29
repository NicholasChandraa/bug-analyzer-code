"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useProfile } from "../hooks/use-profile"
import { ShieldCheck, User } from "lucide-react"

/**
 * ProfileCard UI component.
 * Displays the loaded user profile information in a card layout with explicit Role badge.
 */
export function ProfileCard() {
  const { profile, isLoading, error } = useProfile()

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading profile...</p>
  if (error) return <p className="text-sm text-red-500">{error}</p>
  if (!profile) return null

  const isAdmin = profile.role === "admin"

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{profile.name}</CardTitle>
            <CardDescription className="text-sm">{profile.email}</CardDescription>
          </div>
          {isAdmin ? (
            <Badge className="bg-orange-500 text-white font-bold flex items-center gap-1 shadow-sm border-transparent">
              <ShieldCheck className="w-3.5 h-3.5" /> ADMIN
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> USER
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-1 border-t pt-3">
        <div>User ID: <span className="font-mono text-foreground">{profile.id}</span></div>
        <div>Role Akses: <span className="font-semibold text-foreground capitalize">{profile.role}</span></div>
      </CardContent>
    </Card>
  )
}
