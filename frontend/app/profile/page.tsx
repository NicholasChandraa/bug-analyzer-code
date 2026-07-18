import { Button } from "@/components/ui/button";
import { ProfileCard } from "@/domains/user/components/profile-card"
import Link from "next/link";

/**
 * Next.js Router Page: Profile
 * 
 * Semi-DDD rules:
 * - Files in `frontend/app/` are strictly for layout, routing config, metadata, or entry gates.
 * - Do not implement custom JSX layouts, forms, state, or complex components here.
 * - Always import and delegate rendering to domain feature components (e.g. `<ProfileCard />`).
 */
export default function ProfilePage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      <ProfileCard />
      <Button asChild variant="outline" className="mt-4">
        <Link href="/dashboard">Back to Dashboard</Link>
      </Button>
    </main>
  )
}
