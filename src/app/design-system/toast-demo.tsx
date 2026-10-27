"use client"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"

// Toasts confirm what happened and, when it can be undone, offer to undo it.
export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="outline"
        onClick={() =>
          toast.success("Appel validé", {
            description: "3ᵉ B · 27 présents, 2 absents. Les familles sont prévenues.",
            action: { label: "Annuler", onClick: () => {} },
          })
        }
      >
        Toast de succès
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.error("Les copies n'ont pas été rendues", {
            description: "La connexion a été coupée. Réessayez dans un instant.",
          })
        }
      >
        Toast d&apos;erreur
      </Button>
    </div>
  )
}
