import { KnobControl } from "@/components/KnobControl";
import { Switch } from "@/components/ui/switch";
import type { TranslateFn } from "@/components/home/types";

interface HomeFxViewProps {
  t: TranslateFn;
  reverbEnabled: boolean;
  reverbAmount: number;
  concertHallEnabled: boolean;
  concertHallAmount: number;
  onToggleReverb: (enabled: boolean) => void;
  onReverbAmountChange: (value: number) => void;
  onToggleConcertHall: (enabled: boolean) => void;
  onConcertHallAmountChange: (value: number) => void;
}

export function HomeFxView({
  t,
  reverbEnabled,
  reverbAmount,
  concertHallEnabled,
  concertHallAmount,
  onToggleReverb,
  onReverbAmountChange,
  onToggleConcertHall,
  onConcertHallAmountChange,
}: HomeFxViewProps) {
  const effectsEnabled = reverbEnabled || concertHallEnabled;

  return (
    <div className="flex-1 flex flex-col" data-testid="fx-view">
      <header className="flex items-center justify-between px-6 pt-12 pb-4 border-b border-zinc-900">
        <div>
          <h2 className="text-xl font-bold">{t("fx.title")}</h2>
          <p className="text-xs text-zinc-600 mt-0.5">{t("fx.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full transition-all ${
              effectsEnabled
                ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                : "bg-zinc-700"
            }`}
          />
          <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            {effectsEnabled ? t("fx.on") : t("fx.off")}
          </span>
        </div>
      </header>

      <div className="flex-1 flex flex-col justify-center gap-5 px-4 py-8">
        <section className="card-elevated rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h3 className="text-sm font-bold tracking-[0.12em] uppercase">
                {t("fx.reverb")}
              </h3>
              <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                {t("fx.reverbDescription")}
              </p>
            </div>
            <Switch checked={reverbEnabled} onCheckedChange={onToggleReverb} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              <p>{t("fx.reverbSpecOne")}</p>
              <p>{t("fx.reverbSpecTwo")}</p>
              <p>{t("fx.reverbSpecThree")}</p>
            </div>
            <KnobControl
              label={t("fx.amount")}
              value={reverbAmount}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={onReverbAmountChange}
              disabled={!reverbEnabled}
            />
          </div>
        </section>

        <section className="card-elevated rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h3 className="text-sm font-bold tracking-[0.12em] uppercase">
                {t("fx.concertHall")}
              </h3>
              <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                {t("fx.concertHallDescription")}
              </p>
            </div>
            <Switch
              checked={concertHallEnabled}
              onCheckedChange={onToggleConcertHall}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              <p>{t("fx.concertSpecOne")}</p>
              <p>{t("fx.concertSpecTwo")}</p>
              <p>{t("fx.concertSpecThree")}</p>
            </div>
            <KnobControl
              label={t("fx.amount")}
              value={concertHallAmount}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={onConcertHallAmountChange}
              disabled={!concertHallEnabled}
            />
          </div>
        </section>

        <p className="text-center text-xs text-zinc-600 px-6 leading-relaxed">
          {t("fx.description")}
        </p>
      </div>
    </div>
  );
}

export default HomeFxView;
