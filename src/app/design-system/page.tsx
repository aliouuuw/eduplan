import { notFound } from "next/navigation"
import { Check, ChevronDown, Plus, Search } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { classLabel, frSpaces } from "@/lib/fr"


export const metadata = { title: "Système de design · EduPlan" }

// Dev-only preview of every component in A+ Plat vif. Compare with .impeccable/mocks/teacher/.
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound()

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-8 py-12">
      <header>
        <h1 className="text-[38px] leading-tight">Système de design</h1>
        <p className="mt-1.5 text-muted-foreground">
          A+ Plat vif · corail = maintenant, lavande = progrès · Poppins · décisions D32 et D33
        </p>
      </header>

      <Section title="Couleurs par fonction">
        <div className="grid grid-cols-2 gap-x-10 gap-y-3 sm:grid-cols-4">
          <Swatch name="Encre" token="foreground" className="bg-foreground" />
          <Swatch name="Encre 2" token="ink-2" className="bg-ink-2" />
          <Swatch name="Encre 3" token="muted-foreground" className="bg-muted-foreground" />
          <Swatch name="Feuille" token="card" className="bg-card shadow-lift" />
          <Swatch name="Maintenant" token="now" className="fill-now" />
          <Swatch name="Maintenant, texte" token="now-ink" className="bg-now-ink" />
          <Swatch name="Progrès" token="progress" className="fill-progress" />
          <Swatch name="Progrès, texte" token="progress-ink" className="bg-progress-ink" />
        </div>
      </Section>

      <Section title="Typographie">
        <div className="flex flex-col gap-2">
          <p className="font-display text-[44px] leading-tight">Bonjour, Aïssatou</p>
          <p className="font-display text-[26px]">{classLabel("3ème B")}, salle 7</p>
          <p className="font-display text-lg">Rythme des notes jusqu&apos;au conseil</p>
          <p>Corps de texte : 9 notes saisies, 10 attendues à ce jour.</p>
          <p className="text-[13.5px] text-muted-foreground">Légende : trimestre 1, semaine 8 sur 12</p>
          <p className="font-display text-[56px] leading-none">
            53 <span className="font-sans text-lg font-normal tracking-normal text-muted-foreground">copies</span>
            <span className="ml-8">8,5</span>
            <span className="font-sans text-lg font-normal tracking-normal text-muted-foreground"> / 20</span>
          </p>
        </div>
      </Section>

      <Section title="Boutons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            <Check />
            Faire l&apos;appel
          </Button>
          <Button variant="outline">
            <Plus />
            Nouveau
          </Button>
          <Button variant="secondary">Secondaire</Button>
          <Button variant="ghost">Discret</Button>
          <Button variant="destructive">Supprimer</Button>
          <Button variant="link">Tout voir</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm">Notion faite</Button>
          <Button size="lg">Valider l&apos;appel</Button>
          <Button variant="outline" size="icon" aria-label="Ajouter">
            <Plus />
          </Button>
          <Button disabled>Désactivé</Button>
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Champs</CardTitle>
            <CardDescription>Capsules pour une ligne, blocs arrondis pour le texte long.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher" className="pl-10" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ds-email">Adresse e-mail</Label>
              <Input id="ds-email" defaultValue="a.diop@ecole-dakar.sn" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ds-invalid">Note sur 20</Label>
              <Input id="ds-invalid" aria-invalid defaultValue="23" />
              <p className="text-[13px] text-now-ink">La note doit être entre 0 et 20.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Classe</Label>
              <Select defaultValue="3b">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4a">4ème A</SelectItem>
                  <SelectItem value="4b">4ème B</SelectItem>
                  <SelectItem value="3b">3ème B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ds-appr">Appréciation du trimestre 1</Label>
              <Textarea
                id="ds-appr"
                defaultValue="Khady participe bien à l'oral, mais ses résultats écrits baissent depuis octobre."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Choix</CardTitle>
            <CardDescription>Cases rondes, interrupteurs, contrôles segmentés.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <Label className="font-normal text-foreground">
                <Checkbox defaultChecked /> Devoir maison n°3 corrigé
              </Label>
              <Label className="font-normal text-foreground">
                <Checkbox /> Contrôle Pythagore à saisir
              </Label>
            </div>
            <RadioGroup defaultValue="p" className="flex gap-6">
              {[
                ["p", "Présent"],
                ["a", "Absent"],
                ["r", "Retard"],
              ].map(([v, l]) => (
                <Label key={v} className="font-normal text-foreground">
                  <RadioGroupItem value={v} /> {l}
                </Label>
              ))}
            </RadioGroup>
            <div className="flex items-center justify-between">
              <span className="text-[14.5px]">Très bonne participation à l&apos;oral</span>
              <span className="flex items-center gap-2 text-[12.5px] text-ink-2">
                Visible famille <Switch defaultChecked aria-label="Visible famille" />
              </span>
            </div>
            <ToggleGroup type="single" defaultValue="tous">
              <ToggleGroupItem value="tous" className="h-9 px-4">
                Tous 31
              </ToggleGroupItem>
              <ToggleGroupItem value="suivre" className="h-9 px-4">
                À suivre 1
              </ToggleGroupItem>
              <ToggleGroupItem value="abs" className="h-9 px-4">
                Absences
              </ToggleGroupItem>
            </ToggleGroup>
            <div className="flex flex-wrap gap-2">
              <Badge>Progrès</Badge>
              <Badge variant="secondary">Neutre</Badge>
              <Badge variant="destructive">À suivre</Badge>
              <Badge variant="outline">Coef. 2</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Section title="Onglets">
        <Tabs defaultValue="programme">
          <TabsList>
            <TabsTrigger value="travail">Travail</TabsTrigger>
            <TabsTrigger value="programme">Programme</TabsTrigger>
            <TabsTrigger value="eleves">
              Élèves <span className="text-[12.5px] font-normal text-muted-foreground">31</span>
            </TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
          <TabsContent value="programme" className="text-muted-foreground">
            Le contenu de l&apos;onglet Programme.
          </TabsContent>
        </Tabs>
      </Section>

      <div className="grid gap-6 lg:grid-cols-[1fr_372px]">
        <Card>
          <CardHeader>
            <CardTitle>Programme</CardTitle>
            <CardDescription>Trimestre 1</CardDescription>
            <CardAction>
              <Button variant="link">Détail</Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <ProgressRow cls="4ème A" note="1 notion d'avance" value={72.2} ahead />
            <ProgressRow cls="4ème B" note="2 notions de retard" value={55.6} />
            <ProgressRow cls="3ème B" note="2 notions de retard" value={55} />
          </CardContent>
        </Card>

        <Card className="wash-now">
          <CardContent className="flex flex-col gap-4">
            <span className="flex items-center gap-2 text-sm font-medium text-now-ink">
              <i className="size-2 rounded-full bg-now shadow-glow-now" />
              En cours depuis 10:00
            </span>
            <div>
              <p className="font-display text-[30px] leading-tight">{classLabel("3ème B")}, salle 7</p>
              <p className="text-muted-foreground">Mathématiques · 31 élèves · 1 excusé</p>
            </div>
            <Progress value={40} tone="now" glow label="Cours en cours, 40 %" />
            <Button className="w-full">
              <Check />
              Faire l&apos;appel
            </Button>
          </CardContent>
        </Card>
      </div>

      <Section title="Caractère">
        <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
          <Trait title="Deux voix typographiques">
            Poppins porte les deux : une voix d&apos;affichage (titres, grands chiffres, noms de classe, 500,
            approche serrée) et une voix d&apos;interface pour tout le reste.
          </Trait>
          <Trait title="Typographie française">
            <span className="font-display text-[22px] text-foreground">
              {classLabel("6ème A")} · {classLabel("1ère S")} · {classLabel("2nde A")}
            </span>
            <br />
            {frSpaces("Échéance : 11 décembre. Prêt ? « Très bon travail »")}
          </Trait>
          <Trait title="Onglet qui glisse">
            La feuille blanche de l&apos;onglet actif glisse d&apos;un onglet à l&apos;autre. Sans JavaScript,
            l&apos;onglet actif garde sa propre feuille.
          </Trait>
          <Trait title="Grain du fond">
            Un grain très fin sous le fond lavande efface les bandes du dégradé. Il ne passe jamais sur le
            contenu.
          </Trait>
        </div>
      </Section>

      <Section title="Alertes">
        <div className="grid gap-4 lg:grid-cols-2">
          <Alert>
            <AlertTitle>Le cahier de textes suggère une notion</AlertTitle>
            <AlertDescription>Thalès, configuration triangle. Confirmez-la dans l&apos;onglet Programme.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>2 absences sans justificatif</AlertTitle>
            <AlertDescription>M. Ndiaye, F. Sarr · 4ème A</AlertDescription>
          </Alert>
        </div>
      </Section>

      <Card>
        <CardHeader>
          <CardTitle>Élèves</CardTitle>
          <CardDescription>moyenne de la classe 12,5 / 20</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Élève</TableHead>
                <TableHead>Moyenne</TableHead>
                <TableHead>Évolution</TableHead>
                <TableHead>Absences</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Cheikh Diallo</TableCell>
                <TableCell>10,2</TableCell>
                <TableCell className="text-now-ink">−0,6</TableCell>
                <TableCell>
                  2 <span className="text-now-ink">non justifiées</span>
                </TableCell>
              </TableRow>
              <TableRow data-state="selected">
                <TableCell className="font-medium">Khady Fall</TableCell>
                <TableCell className="text-now-ink">8,5</TableCell>
                <TableCell className="text-now-ink">−2,5</TableCell>
                <TableCell>0</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Ndeye Faye</TableCell>
                <TableCell>13,0</TableCell>
                <TableCell className="text-progress-ink">+0,5</TableCell>
                <TableCell>1 justifiée</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Section title="Superpositions">
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Ouvrir une boîte de dialogue</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rendre les copies</DialogTitle>
                <DialogDescription>
                  22 copies corrigées seront rendues aux élèves de la 4ème A. Les familles verront les notes.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost">Annuler</Button>
                <Button>Rendre les copies</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Actions <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Khady Fall</DropdownMenuLabel>
              <DropdownMenuItem>Ajouter une remarque</DropdownMenuItem>
              <DropdownMenuItem>Écrire aux parents</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Retirer le suivi</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Section>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </section>
  )
}

function Swatch({ name, token, className }: { name: string; token: string; className: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`size-10 shrink-0 rounded-md ${className}`} />
      <span className="flex flex-col">
        <span className="text-[14.5px] font-medium">{name}</span>
        <span className="text-[12.5px] text-muted-foreground">{token}</span>
      </span>
    </div>
  )
}

function Trait({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="font-display text-lg">{title}</h3>
      <p className="text-[14.5px] leading-relaxed text-ink-2">{children}</p>
    </div>
  )
}

function ProgressRow({ cls, note, value, ahead }: { cls: string; note: string; value: number; ahead?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-[17px]">{classLabel(cls)}</span>
        <span className={`text-[13.5px] font-medium ${ahead ? "text-progress-ink" : "text-now-ink"}`}>{note}</span>
      </div>
      <Progress value={value} expected={66.7} glow={ahead} label={`${cls}, programme`} />
    </div>
  )
}
