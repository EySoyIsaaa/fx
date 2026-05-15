import { ChevronLeft, ChevronRight, SlidersHorizontal, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { KnobControl } from "@/components/KnobControl";
import type { DspParamConfig, TranslateFn } from "@/components/home/types";

interface HomeDspViewProps {
  t: TranslateFn;
  epicenterEnabled: boolean;
  params: DspParamConfig[];
  onOpenAutoModal: () => void;
  onToggleEpicenter: () => void;
  onOpenEq?: () => void;
  onOpenFx?: () => void;
}

const presets = ["Deep", "Clean", "Punch", "Demo", "Extreme"];

export function HomeDspView({
  t,
  epicenterEnabled,
  params,
  onOpenAutoModal,
  onToggleEpicenter,
  onOpenEq,
  onOpenFx,
}: HomeDspViewProps) {
  const mainParam = params.find((param) => param.key === "intensity") ?? params[0];
  const secondaryParams = params.filter((param) => param.key !== mainParam.key);

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-32 pt-12" data-testid="dsp-view">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="premium-title text-[10px] font-black text-[var(--ep-red)]">EpicenterDSP 7.0</p>
          <h2 className="premium-title mt-1 text-2xl font-black text-white">{t("dsp.title")}</h2>
          <p className="mt-1 text-xs text-[var(--ep-text-secondary)]">{t("dsp.subtitle")}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button onClick={onOpenAutoModal} className="h-auto rounded-full border border-[rgba(255,16,42,0.45)] bg-[#101010] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white hover:bg-[#181818]">
            {t("dsp.autoButton")}
          </Button>
          <div className="flex items-center gap-2 rounded-full border border-[var(--ep-border)] bg-[#0b0b0b] px-3 py-1.5">
            <span className={`h-2 w-2 rounded-full ${epicenterEnabled ? "bg-[var(--ep-red)] shadow-[0_0_10px_rgba(255,16,42,0.9)]" : "bg-zinc-700"}`} />
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--ep-text-secondary)]">{epicenterEnabled ? "Active" : "Bypass"}</span>
            <Switch checked={epicenterEnabled} onCheckedChange={onToggleEpicenter} />
          </div>
        </div>
      </header>

      <section className="premium-card rounded-3xl p-5 text-center">
        <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(255,16,42,0.35)] bg-black px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--ep-text-secondary)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--ep-red)]" />
          Epicenter Engine {epicenterEnabled ? "Active" : "Standby"}
        </div>
        <KnobControl {...mainParam} label="INTENSIDAD" size={172} featured disabled={mainParam.disabled} />
        <div className="mt-4 h-9 overflow-hidden rounded-xl border border-[var(--ep-border)] bg-black/80 px-4 py-2">
          <div className="flex h-full items-end justify-center gap-1">
            {Array.from({ length: 32 }).map((_, index) => (
              <span
                key={index}
                className="w-1 rounded-t bg-[var(--ep-red)] shadow-[0_0_8px_rgba(255,16,42,0.35)]"
                style={{ height: `${18 + ((index * 7) % 19)}px`, opacity: epicenterEnabled ? 0.28 + (index % 5) * 0.12 : 0.12 }}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-[var(--ep-border)] bg-[#0b0b0b] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="premium-title text-[10px] font-black text-[var(--ep-text-muted)]">PRESET ACTUAL</p>
            <h3 className="dsp-numeric text-3xl font-black text-white">Deep</h3>
          </div>
          <div className="flex items-center gap-2 text-[var(--ep-text-secondary)]">
            <ChevronLeft className="h-5 w-5" />
            <ChevronRight className="h-5 w-5" />
          </div>
        </div>
        <div className="flex items-center justify-center gap-2">
          {presets.map((preset) => (
            <span key={preset} className={`h-1.5 rounded-full ${preset === "Deep" ? "w-7 bg-[var(--ep-red)]" : "w-1.5 bg-[var(--ep-border)]"}`} />
          ))}
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        {secondaryParams.map((param) => (
          <div key={param.key} className={`premium-card rounded-2xl p-3 ${param.key === "volume" ? "red-glow-subtle" : ""}`}>
            <KnobControl {...param} size={92} featured={false} />
          </div>
        ))}
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={onOpenEq} className="premium-card rounded-2xl p-4 text-left">
          <SlidersHorizontal className="mb-3 h-5 w-5 text-[var(--ep-red)]" />
          <p className="premium-title text-xs font-black text-white">EQ DSP</p>
          <p className="mt-1 text-[11px] text-[var(--ep-text-muted)]">Curva, faders y Q factor</p>
        </button>
        <button onClick={onOpenFx} className="premium-card rounded-2xl p-4 text-left">
          <Waves className="mb-3 h-5 w-5 text-[var(--ep-red)]" />
          <p className="premium-title text-xs font-black text-white">Rack FX</p>
          <p className="mt-1 text-[11px] text-[var(--ep-text-muted)]">Boost, enhancer, salida</p>
        </button>
      </section>

      <p className="mt-5 px-5 text-center text-xs leading-relaxed text-[var(--ep-text-muted)]">{t("dsp.description")}</p>
    </div>
  );
}

export default HomeDspView;
