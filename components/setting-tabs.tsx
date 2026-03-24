"use client"

import { useGetUser } from "@/hooks/api/user/useGetUser"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccountOverview } from "@/components/account-overview"
import { DangerZone } from "@/components/danger-zone"
import { UserProfileForm } from "@/components/user-profile-form"

interface SettingTabsProps {
  userId: string
}

export default function SettingTabs({ userId }: SettingTabsProps) {
  const { data: user } = useGetUser(userId)

  if (!user) return null

  return (
    <div className="space-y-6">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="danger">Security</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="profile" className="space-y-6">
            <UserProfileForm
              user={{
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                image: user.image,
                emailVerified: user.emailVerified,
              }}
            />
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <AccountOverview
              user={{
                id: user.id,
                name: user.name,
                email: user.email,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
              }}
            />
          </TabsContent>
          <TabsContent value="danger" className="space-y-6">
            <DangerZone userId={user.id} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
