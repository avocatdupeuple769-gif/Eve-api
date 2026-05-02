import { Shell } from "@/components/layout/shell";
import { usePreferences } from "@/hooks/use-preferences";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const LANGUAGES = [
  "English", "French", "Spanish", "Portuguese", 
  "Arabic", "Chinese", "Japanese", "Swahili", "Fang"
];

export default function SettingsPage() {
  const { preferences, updatePreferences } = usePreferences();

  return (
    <Shell>
      <div className="flex h-full flex-col px-8 py-10 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-serif text-foreground mb-12 tracking-wide">Preferences</h1>
        
        <div className="space-y-10">
          {/* Language Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-mono tracking-widest text-primary uppercase">Communication</h2>
            <div className="p-6 rounded-2xl border border-border bg-card/30 flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base text-foreground">Preferred Language</Label>
                <p className="text-sm text-muted-foreground">The native tongue EVE will use.</p>
              </div>
              <Select 
                value={preferences.language} 
                onValueChange={(val) => updatePreferences({ language: val })}
              >
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Voice Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-mono tracking-widest text-primary uppercase">Audio</h2>
            <div className="p-6 rounded-2xl border border-border bg-card/30 flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base text-foreground">Voice Synthesis</Label>
                <p className="text-sm text-muted-foreground">Allow EVE to speak her responses aloud.</p>
              </div>
              <Switch 
                checked={preferences.voiceEnabled} 
                onCheckedChange={(checked) => updatePreferences({ voiceEnabled: checked })}
                data-testid="switch-voice"
              />
            </div>
          </div>

          {/* Theme Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-mono tracking-widest text-primary uppercase">Appearance</h2>
            <div className="p-6 rounded-2xl border border-border bg-card/30 flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base text-foreground">Theme Mode</Label>
                <p className="text-sm text-muted-foreground">EVE exists primarily in darkness.</p>
              </div>
              <Select 
                value={preferences.theme} 
                onValueChange={(val: "dark" | "light" | "system") => updatePreferences({ theme: val })}
              >
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark (Recommended)</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

        </div>
      </div>
    </Shell>
  );
}
