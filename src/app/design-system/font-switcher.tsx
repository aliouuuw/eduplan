"use client"

import * as React from "react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

// Candidate type pairings for validation. The faces load from the Fontshare API (allowed by the
// ITF Free Font License, §14); the picked one is then self-hosted like Ranade.
const OPTIONS = [
  { id: "ranade", label: "Ranade", note: "actuel · une seule voix", sans: "", display: "", weight: "500", tracking: "-0.02em" },
  { id: "doux", label: "Doux", note: "Chillax · arrondie, comme les capsules", sans: "'Chillax'", display: "'Chillax'", weight: "500", tracking: "-0.02em" },
  { id: "lettre", label: "Lettre", note: "Gambarino + Synonym · une main d'enseignant", sans: "'Synonym'", display: "'Gambarino'", weight: "400", tracking: "-0.005em" },
  { id: "atelier", label: "Atelier", note: "Rowan + Supreme · l'institution, précise", sans: "'Supreme'", display: "'Rowan'", weight: "500", tracking: "-0.015em" },
] as const

const FONT_CSS = [
  "https://api.fontshare.com/v2/css?f[]=chillax@400,500,600&display=swap",
  "https://api.fontshare.com/v2/css?f[]=gambarino@400&display=swap",
  "https://api.fontshare.com/v2/css?f[]=synonym@400,500,600&display=swap",
  "https://api.fontshare.com/v2/css?f[]=rowan@400,500,600&display=swap",
  "https://api.fontshare.com/v2/css?f[]=supreme@400,500,700&display=swap",
]

function vars(id: string): React.CSSProperties {
  const o = OPTIONS.find((x) => x.id === id) ?? OPTIONS[0]
  return {
    ...(o.sans ? { "--ff-sans": o.sans } : {}),
    ...(o.display ? { "--ff-display": o.display } : {}),
    "--fw-display": o.weight,
    "--ls-display": o.tracking,
  } as React.CSSProperties
}

// Wraps the preview: the chosen pairing's variables sit on this element, so every child re-resolves
// --font-sans and --font-display. `initial` comes from ?font= so a pairing can be linked.
export function FontStage({ initial, children }: { initial?: string; children: React.ReactNode }) {
  const [id, setId] = React.useState<string>(OPTIONS.some((o) => o.id === initial) ? initial! : "ranade")
  const option = OPTIONS.find((o) => o.id === id) ?? OPTIONS[0]

  return (
    <div style={vars(id)} className="font-sans">
      {FONT_CSS.map((href) => (
        <link key={href} rel="stylesheet" href={href} precedence="fonts" />
      ))}
      <div className="sticky top-4 z-40 mx-auto flex w-fit max-w-[calc(100%-2rem)] flex-wrap items-center gap-x-5 gap-y-2 rounded-full bg-white/80 py-2 pr-5 pl-2 shadow-lift backdrop-blur-md">
        <ToggleGroup type="single" value={id} onValueChange={(v) => v && setId(v)} aria-label="Typographie">
          {OPTIONS.map((o) => (
            <ToggleGroupItem key={o.id} value={o.id} className="h-9 px-4">
              {o.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <span className="text-[13.5px] text-muted-foreground">{option.note}</span>
      </div>
      {children}
    </div>
  )
}
