"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useProfile } from "../hooks/use-profile"

/**
 * ProfileCard UI component.
 * Displays the loaded user profile information in a card layout.
 * 
 * Semi-DDD rules:
 * - Domain components (`domains/[feature]/components/*`) are responsible for UI layout and rendering.
 * - They should never perform direct HTTP calls or manage global state; instead, they consume data
 *   and actions via domain-specific hooks (`useProfile`).
 */
export function ProfileCard() {
  const { profile, isLoading, error } = useProfile()

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading profile...</p>
  if (error) return <p className="text-sm text-red-500">{error}</p>
  if (!profile) return null

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{profile.name}</CardTitle>
        <CardDescription>{profile.email}</CardDescription>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        User ID: {profile.id}
      </CardContent>
    </Card>
  )
}
