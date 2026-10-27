"use client"

import * as React from "react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

// Candidate type families for validation. Fontshare faces load from its API (ITF Free Font License, §14);
// Google families load from Google Fonts (SIL Open Font License). The pick is then self-hosted.
const OPTIONS = [
  { id: "ranade", label: "Ranade", note: "actuel · Fontshare", sans: "", display: "", weight: "500", tracking: "-0.02em" },
  { id: "doux", label: "Doux", note: "Chillax · arrondie, comme les capsules", sans: "'Chillax'", display: "'Chillax'", weight: "500", tracking: "-0.02em" },
  { id: "instrument", label: "Instrument", note: "Instrument Sans · nette, un peu étroite", sans: "'Instrument Sans'", display: "'Instrument Sans'", weight: "500", tracking: "-0.025em" },
  { id: "pt", label: "PT Sans", note: "PT Sans · humaniste, très lisible · 400 et 700 seulement", sans: "'PT Sans'", display: "'PT Sans'", weight: "700", tracking: "-0.01em" },
  { id: "poppins", label: "Poppins", note: "Poppins · géométrique, ronde", sans: "'Poppins'", display: "'Poppins'", weight: "500", tracking: "-0.025em" },
  { id: "google", label: "Google Sans", note: "Google Sans · ouverte, amicale", sans: "'Google Sans'", display: "'Google Sans'", weight: "500", tracking: "-0.02em" },
] as const

const FONT_CSS = [
  "https://api.fontshare.com/v2/css?f[]=chillax@400,500,600&display=swap",
  "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=PT+Sans:wght@400;700&family=Poppins:wght@400;500;600;700&family=Google+Sans:wght@400;500;600;700&display=swap",
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
