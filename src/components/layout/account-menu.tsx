"use client"

import { LogOut } from "lucide-react"
import { signOut } from "next-auth/react"

import { Avatar } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// The account in the dock: who is signed in, in which role, and the way out.
export function AccountMenu({ name, email, roleLabel }: { name: string; email?: string | null; roleLabel: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Compte de ${name}`}
        className="rounded-full transition-[box-shadow] hover:shadow-tab focus-visible:shadow-tab"
      >
        <Avatar name={name} />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="text-[14.5px] font-medium text-foreground">{name}</span>
          <span className="text-[12.5px]">{roleLabel}</span>
          {email && <span className="truncate text-[12.5px]">{email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/login" })}>
          <LogOut />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
