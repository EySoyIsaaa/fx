import { ChevronDown, Disc3, GripVertical, Pause, Play, Plus, SkipBack, SkipForward, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AudioQualityBadge } from "@/components/AudioQualityBadge";
import { TrackArtwork } from "@/components/TrackArtwork";
import type { Track } from "@/hooks/useAudioQueue";
import type { TranslateFn } from "@/components/home/types";

type TouchStartState = { index: number; y: number } | null;

interface PlayerQueueState {
  queue: Track[];
  currentTrack: Track | null;
  currentTrackIndex: number;
  playTrack: (index: number) => void;
  removeFromQueue: (trackId: string) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  previousTrack: () => void;
  nextTrack: () => void;
}

interface AudioProcessorState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  seek: (time: number) => void;
  pause: () => void;
  play: () => void;
}

interface HomePlayerViewProps {
  isVisible: boolean;
  t: TranslateFn;
  showQueue: boolean;
  onToggleQueue: () => void;
  onCloseQueue: () => void;
  onOpenFilePicker: () => void;
  queue: PlayerQueueState;
  audioProcessor: AudioProcessorState;
  draggedIndex: number | null;
  onDraggedIndexChange: (index: number | null) => void;
  touchStart: TouchStartState;
  onTouchStartChange: (value: TouchStartState) => void;
  formatTime: (seconds: number) => string;
  hiresAudioBadgeUrl: string;
}

export function HomePlayerView({
  isVisible,
  t,
  showQueue,
  onToggleQueue,
  onCloseQueue,
  onOpenFilePicker,
  queue,
  audioProcessor,
  draggedIndex,
  onDraggedIndexChange,
  touchStart,
  onTouchStartChange,
  formatTime,
}: HomePlayerViewProps) {
  if (!isVisible) return null;

  const track = queue.currentTrack;
  const progress = audioProcessor.duration > 0 ? (audioProcessor.currentTime / audioProcessor.duration) * 100 : 0;

  if (showQueue) {
    return (
      <div className="flex flex-1 flex-col px-4 pb-28 pt-12" data-testid="player-view">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="premium-title text-[10px] font-black text-[var(--ep-red)]">Playback Queue</p>
            <h2 className="premium-title text-2xl font-black text-white">{t("player.playbackQueue")}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onOpenFilePicker} className="hardware-button rounded-full p-2 text-white"><Plus className="h-5 w-5" /></button>
            <button onClick={onCloseQueue} className="rounded-full border border-[var(--ep-border)] bg-[#111] p-2 text-[var(--ep-text-secondary)]"><ChevronDown className="h-5 w-5" /></button>
          </div>
        </header>
        <ScrollArea className="min-h-0 flex-1 rounded-3xl border border-[var(--ep-border)] bg-[#080808] p-2">
          {queue.queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Disc3 className="mb-3 h-12 w-12 text-zinc-800" strokeWidth={1} />
              <p className="text-sm text-[var(--ep-text-muted)]">{t("player.queueEmpty")}</p>
            </div>
          ) : (
            <div className="space-y-1 pb-4">
              {queue.queue.map((item, index) => {
                const isCurrent = track?.id === item.id;
                return (
                  <div key={item.id} className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${isCurrent ? "border-[rgba(255,16,42,0.65)] bg-[#141414]" : "border-transparent hover:bg-[#101010]"}`}>
                    <div
                      className="cursor-grab touch-none p-1 text-[var(--ep-text-muted)] active:cursor-grabbing"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        onDraggedIndexChange(index);
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggedIndex !== null && draggedIndex !== index) queue.reorderQueue(draggedIndex, index);
                        onDraggedIndexChange(null);
                      }}
                      onDragEnd={() => onDraggedIndexChange(null)}
                      onTouchStart={(event) => {
                        event.stopPropagation();
                        onDraggedIndexChange(index);
                        onTouchStartChange({ index, y: event.touches[0].clientY });
                      }}
                      onTouchMove={(event) => {
                        event.stopPropagation();
                        if (!touchStart || draggedIndex === null) return;
                        const diff = event.touches[0].clientY - touchStart.y;
                        const newIndex = Math.max(0, Math.min(queue.queue.length - 1, touchStart.index + Math.round(diff / 72)));
                        if (newIndex !== draggedIndex) {
                          queue.reorderQueue(draggedIndex, newIndex);
                          onDraggedIndexChange(newIndex);
                        }
                      }}
                      onTouchEnd={() => {
                        onDraggedIndexChange(null);
                        onTouchStartChange(null);
                      }}
                    >
                      <GripVertical className="h-5 w-5" />
                    </div>
                    <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => queue.playTrack(index)}>
                      <div className="h-11 w-11 flex-none overflow-hidden rounded-lg border border-[var(--ep-border)] bg-[#111]"><TrackArtwork src={item.coverUrl} alt={item.title} iconClassName="h-5 w-5 text-zinc-600" /></div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-bold ${isCurrent ? "text-white" : "text-[var(--ep-text-secondary)]"}`}>{item.title}</p>
                        <div className="flex items-center gap-2"><p className="truncate text-xs text-[var(--ep-text-muted)]">{item.artist}</p><AudioQualityBadge bitDepth={item.bitDepth} sampleRate={item.sampleRate} bitrate={item.bitrate} isHiRes={item.isHiRes} compact /></div>
                      </div>
                    </button>
                    <button onClick={() => queue.removeFromQueue(item.id)} className="p-2 text-zinc-600 hover:text-[var(--ep-red)]"><X className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-5 pb-28 pt-12" data-testid="player-view">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="premium-title text-[10px] font-black text-[var(--ep-red)]">EpicenterDSP</p>
          <h1 className="premium-title text-xl font-black text-white">7.0 Head Unit</h1>
        </div>
        <button onClick={onToggleQueue} className="rounded-full border border-[var(--ep-border)] bg-[#0d0d0d] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ep-text-secondary)]">
          {t("player.queue")} ({queue.queue.length})
        </button>
      </header>

      <div className="flex flex-1 flex-col justify-center">
        <div className="relative mx-auto w-full max-w-[340px]">
          <div className="absolute -inset-3 rounded-[2rem] bg-[radial-gradient(circle,rgba(255,16,42,0.18),transparent_64%)]" />
          <div className="album-shadow relative aspect-square overflow-hidden rounded-[1.6rem] border border-[var(--ep-border)] bg-[#101010]">
            <TrackArtwork src={track?.coverUrl} alt={track?.title || "No track"} iconClassName="h-20 w-20 text-zinc-700" />
          </div>
        </div>

        <div className="mt-7 text-center">
          <h2 className="line-clamp-2 text-2xl font-black leading-tight text-white">{track?.title || t("player.noTrack")}</h2>
          <p className="mt-1 truncate text-sm text-[var(--ep-text-secondary)]">{track?.artist || t("player.addMusic")}</p>
          {track && <div className="mt-4"><AudioQualityBadge bitDepth={track.bitDepth} sampleRate={track.sampleRate} bitrate={track.bitrate} isHiRes={track.isHiRes} /></div>}
        </div>

        <div className="mt-6">
          <input
            type="range"
            min={0}
            max={audioProcessor.duration || 0}
            value={audioProcessor.currentTime}
            onChange={(event) => audioProcessor.seek(parseFloat(event.target.value))}
            className="progress-slider w-full"
            disabled={!track}
          />
          <div className="mt-2 flex justify-between text-[10px] font-bold tabular-nums text-[var(--ep-text-muted)]">
            <span>{formatTime(audioProcessor.currentTime)}</span>
            <span>{formatTime(audioProcessor.duration)}</span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-8">
          <button onClick={queue.previousTrack} disabled={!track} className="text-[var(--ep-text-secondary)] disabled:opacity-30"><SkipBack className="h-7 w-7" fill="currentColor" /></button>
          <button onClick={audioProcessor.isPlaying ? audioProcessor.pause : audioProcessor.play} disabled={!track} className="hardware-button flex h-20 w-20 items-center justify-center rounded-full text-white disabled:opacity-40">
            {audioProcessor.isPlaying ? <Pause className="h-8 w-8" fill="currentColor" /> : <Play className="ml-1 h-9 w-9" fill="currentColor" />}
          </button>
          <button onClick={queue.nextTrack} disabled={!track} className="text-[var(--ep-text-secondary)] disabled:opacity-30"><SkipForward className="h-7 w-7" fill="currentColor" /></button>
        </div>

        <div className="mx-auto mt-6 flex w-full max-w-sm items-center gap-3 rounded-2xl border border-[var(--ep-border)] bg-[#090909] px-4 py-3">
          <span className="h-2 w-2 rounded-full bg-[var(--ep-red)] shadow-[0_0_9px_rgba(255,16,42,0.9)]" />
          <div className="min-w-0 flex-1">
            <p className="premium-title text-[10px] font-black text-white">Epicenter Engine Active</p>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#1d1d1d]"><div className="h-full bg-[var(--ep-red)] transition-all" style={{ width: `${Math.max(6, progress)}%` }} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePlayerView;
