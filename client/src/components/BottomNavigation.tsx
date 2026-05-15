import { useEffect, useState, type CSSProperties } from "react";
import { Disc3, Library, Settings, SlidersHorizontal } from "lucide-react";

type TabType = "player" | "library" | "search" | "eq" | "dsp" | "fx" | "settings";

type BottomNavigationProps = {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onLibraryTab: () => void;
  eqEnabled: boolean;
  epicenterEnabled: boolean;
  spatialEffectsEnabled: boolean;
  t: (key: string) => string;
};

const getAndroidNavigationOffset = () => {
  if (typeof window === "undefined") return 0;
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isAndroid = userAgent.includes("android");
  const hasTouch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  if (!isAndroid || !hasTouch) return 0;
  const viewportGap = window.visualViewport
    ? Math.max(0, window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop)
    : 0;
  const screenGap = Math.max(0, window.screen.height - window.innerHeight);
  const detectedGap = Math.max(viewportGap, screenGap);
  if (detectedGap >= 24) return Math.min(24, detectedGap);
  return 8;
};

export function BottomNavigation({
  activeTab,
  onTabChange,
  onLibraryTab,
  eqEnabled,
  epicenterEnabled,
  spatialEffectsEnabled,
  t,
}: BottomNavigationProps) {
  const [androidNavigationOffset, setAndroidNavigationOffset] = useState(0);

  useEffect(() => {
    const updateOffset = () => setAndroidNavigationOffset(getAndroidNavigationOffset());
    updateOffset();
    window.visualViewport?.addEventListener("resize", updateOffset);
    window.visualViewport?.addEventListener("scroll", updateOffset);
    window.addEventListener("resize", updateOffset);
    window.addEventListener("orientationchange", updateOffset);
    return () => {
      window.visualViewport?.removeEventListener("resize", updateOffset);
      window.visualViewport?.removeEventListener("scroll", updateOffset);
      window.removeEventListener("resize", updateOffset);
      window.removeEventListener("orientationchange", updateOffset);
    };
  }, []);

  const dspActive = ["dsp", "eq", "fx"].includes(activeTab);
  const dspOnline = eqEnabled || epicenterEnabled || spatialEffectsEnabled;
  const itemClass = (active: boolean) =>
    `relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors ${
      active ? "text-[var(--ep-red)]" : "text-[var(--ep-text-muted)]"
    }`;

  const label = (key: string, fallback: string) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  return (
    <nav
      className="fixed left-0 right-0 z-50 mx-3 rounded-t-3xl border border-b-0 border-[var(--ep-border)] bg-[#080808]/98 px-2 pt-2 shadow-[0_-12px_34px_rgba(0,0,0,0.65)] bottom-nav-safe"
      style={{ bottom: `${androidNavigationOffset}px`, "--android-navigation-offset": `${androidNavigationOffset}px` } as CSSProperties}
    >
      <div className="flex items-center justify-around rounded-2xl bg-[linear-gradient(180deg,#121212,#060606)] p-1">
        <button onClick={() => onTabChange("player")} className={itemClass(activeTab === "player")}>
          {activeTab === "player" && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[var(--ep-red)] shadow-[0_0_12px_rgba(255,16,42,0.8)]" />}
          <Disc3 className="h-5 w-5" strokeWidth={1.7} />
          <span className="text-[10px] font-black uppercase tracking-[0.12em]">Inicio</span>
        </button>
        <button onClick={onLibraryTab} className={itemClass(activeTab === "library" || activeTab === "search")}>
          {(activeTab === "library" || activeTab === "search") && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[var(--ep-red)] shadow-[0_0_12px_rgba(255,16,42,0.8)]" />}
          <Library className="h-5 w-5" strokeWidth={1.7} />
          <span className="text-[10px] font-black uppercase tracking-[0.12em]">{label("tabs.library", "Biblioteca")}</span>
        </button>
        <button onClick={() => onTabChange("dsp")} className={itemClass(dspActive)}>
          {dspActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[var(--ep-red)] shadow-[0_0_12px_rgba(255,16,42,0.8)]" />}
          {dspOnline && <span className="absolute right-3 top-2 h-1.5 w-1.5 rounded-full bg-[var(--ep-red)] shadow-[0_0_8px_rgba(255,16,42,0.85)]" />}
          <SlidersHorizontal className="h-5 w-5" strokeWidth={1.7} />
          <span className="text-[10px] font-black uppercase tracking-[0.12em]">DSP</span>
        </button>
        <button onClick={() => onTabChange("settings")} className={itemClass(activeTab === "settings")}>
          {activeTab === "settings" && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[var(--ep-red)] shadow-[0_0_12px_rgba(255,16,42,0.8)]" />}
          <Settings className="h-5 w-5" strokeWidth={1.7} />
          <span className="text-[10px] font-black uppercase tracking-[0.12em]">{label("tabs.settings", "Ajustes")}</span>
        </button>
      </div>
    </nav>
  );
}
