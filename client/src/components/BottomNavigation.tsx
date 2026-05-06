import { useEffect, useState, type CSSProperties } from "react";
import {
  Disc3,
  Library,
  Search,
  Settings,
  SlidersHorizontal,
  Waves,
} from "lucide-react";

type TabType =
  | "player"
  | "library"
  | "search"
  | "eq"
  | "dsp"
  | "fx"
  | "settings";

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
    ? Math.max(
        0,
        window.innerHeight -
          window.visualViewport.height -
          window.visualViewport.offsetTop,
      )
    : 0;
  const screenGap = Math.max(0, window.screen.height - window.innerHeight);
  const detectedGap = Math.max(viewportGap, screenGap);

  if (detectedGap >= 24) return Math.min(34, detectedGap);

  // Some Android WebViews report a zero safe-area even when the 3-button
  // navigation bar overlays the bottom edge, so reserve a small lift.
  return 16;
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
    const updateOffset = () =>
      setAndroidNavigationOffset(getAndroidNavigationOffset());
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

  const indicator =
    "absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]";
  const itemClass = (tab: TabType, extra = "") =>
    `flex flex-col items-center gap-1 px-2 py-2 transition-colors ${extra} ${
      activeTab === tab ? "text-white" : "text-zinc-600"
    }`;

  return (
    <nav
      className="fixed left-0 right-0 flex items-center justify-around px-2 pt-3 border-t border-zinc-900 bg-black/95 backdrop-blur-xl z-50 bottom-nav-safe"
      style={
        {
          bottom: `${androidNavigationOffset}px`,
          "--android-navigation-offset": `${androidNavigationOffset}px`,
        } as CSSProperties
      }
    >
      <button
        onClick={() => onTabChange("player")}
        className={itemClass("player")}
      >
        <Disc3 className="w-5 h-5" strokeWidth={1.5} />
        <span className="text-[10px] font-medium">{t("tabs.now")}</span>
      </button>
      <button onClick={onLibraryTab} className={itemClass("library")}>
        <Library className="w-5 h-5" strokeWidth={1.5} />
        <span className="text-[10px] font-medium">{t("tabs.library")}</span>
      </button>
      <button
        onClick={() => onTabChange("search")}
        className={itemClass("search")}
      >
        <Search className="w-5 h-5" strokeWidth={1.5} />
        <span className="text-[10px] font-medium">{t("tabs.search")}</span>
      </button>
      <button
        onClick={() => onTabChange("eq")}
        className={itemClass("eq", "relative")}
      >
        {eqEnabled && <span className={indicator} />}
        <SlidersHorizontal className="w-5 h-5" strokeWidth={1.5} />
        <span className="text-[10px] font-medium">{t("tabs.eq")}</span>
      </button>
      <button
        onClick={() => onTabChange("dsp")}
        className={itemClass("dsp", "relative")}
      >
        {epicenterEnabled && <span className={indicator} />}
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
          <path d="M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
        </svg>
        <span className="text-[10px] font-medium">{t("tabs.dsp")}</span>
      </button>
      <button
        onClick={() => onTabChange("fx")}
        className={itemClass("fx", "relative")}
      >
        {spatialEffectsEnabled && <span className={indicator} />}
        <Waves className="w-5 h-5" strokeWidth={1.5} />
        <span className="text-[10px] font-medium">{t("tabs.fx")}</span>
      </button>
      <button
        onClick={() => onTabChange("settings")}
        className={itemClass("settings")}
      >
        <Settings className="w-5 h-5" strokeWidth={1.5} />
        <span className="text-[10px] font-medium">{t("tabs.settings")}</span>
      </button>
    </nav>
  );
}
