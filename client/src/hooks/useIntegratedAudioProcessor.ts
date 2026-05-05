/**
 * Glassmorphism Nocturno Design
 * Hook integrado que combina Epicenter DSP + Ecualizador de 31 bandas
 * Arquitectura: AudioElement → Epicenter Worklet → Equalizer Filters → Destination
 * 
 * v1.1.1 - Agregado soporte para:
 * - Callback onTrackEnded para continuar reproducción automática
 * - Crossfade entre canciones
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface StreamingParams {
  sweepFreq: number;
  width: number;
  intensity: number;
  balance: number;
  volume: number;
}

const clampStreamingParam = (name: keyof StreamingParams, value: number): number => {
  switch (name) {
    case 'sweepFreq':
      return Math.max(27, Math.min(63, value));
    case 'width':
    case 'intensity':
    case 'balance':
    case 'volume':
      return Math.max(0, Math.min(100, value));
    default:
      return value;
  }
};

const clampStreamingParams = (params: StreamingParams): StreamingParams => ({
  sweepFreq: clampStreamingParam('sweepFreq', params.sweepFreq),
  width: clampStreamingParam('width', params.width),
  intensity: clampStreamingParam('intensity', params.intensity),
  balance: clampStreamingParam('balance', params.balance),
  volume: clampStreamingParam('volume', params.volume),
});

export interface EqualizerBand {
  frequency: number;
  gain: number;
  label: string;
}

export interface AudioAnalysisResult {
  bandGains: number[];
  suggestedDsp: Partial<StreamingParams>;
}

export interface CrossfadeConfig {
  enabled: boolean;
  duration: number; // segundos
}

export interface ReverbEffectConfig {
  reverbEnabled: boolean;
  reverbAmount: number;
  concertHallEnabled: boolean;
  concertHallAmount: number;
}

export const EQ_GAIN_MIN = -3;
export const EQ_GAIN_MAX = 3;

const clampEffectAmount = (value: number): number =>
  Math.max(0, Math.min(100, value));

const EQ_31_FREQUENCIES = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160,
  200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
  2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000,
];

const formatEqLabel = (frequency: number) => {
  if (frequency >= 1000) {
    const khz = frequency / 1000;
    return Number.isInteger(khz) ? `${khz} kHz` : `${khz.toFixed(1)} kHz`;
  }
  return `${frequency} Hz`;
};

export const DEFAULT_EQ_BANDS: EqualizerBand[] = EQ_31_FREQUENCIES.map((frequency) => ({
  frequency,
  gain: 0,
  label: formatEqLabel(frequency),
}));

export interface IntegratedAudioController {
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loadFile: (file: File | string, dspParams: StreamingParams) => Promise<void>;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setDspParam: (name: keyof StreamingParams, value: number) => void;
  setEqBandGain: (index: number, gain: number) => void;
  setEqEnabled: (enabled: boolean) => void;
  setEpicenterEnabled: (enabled: boolean) => void;
  setEqPreampDb: (preampDb: number) => void;
  getAnalyserNode: () => AnalyserNode | null;
  getCurrentDspParams: () => StreamingParams;
  setOnTrackEnded: (callback: (() => void) | null) => void;
  setOnTrackError: (callback: ((error: Error) => void) | null) => void;
  setCrossfadeConfig: (config: CrossfadeConfig) => void;
  setReverbEnabled: (enabled: boolean) => void;
  setReverbAmount: (amount: number) => void;
  setConcertHallEnabled: (enabled: boolean) => void;
  setConcertHallAmount: (amount: number) => void;
  resetAfterError: () => void;
  eqBands: EqualizerBand[];
  eqEnabled: boolean;
  epicenterEnabled: boolean;
  reverbEnabled: boolean;
  reverbAmount: number;
  concertHallEnabled: boolean;
  concertHallAmount: number;
}

export function useIntegratedAudioProcessor(): IntegratedAudioController {
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const eqFiltersRef = useRef<BiquadFilterNode[]>([]);
  const eqLowFiltersRef = useRef<BiquadFilterNode[]>([]);
  const eqHighFiltersRef = useRef<BiquadFilterNode[]>([]);
  const eqInputGainRef = useRef<GainNode | null>(null);
  const eqLowSplitRef = useRef<BiquadFilterNode | null>(null);
  const eqHighSplitRef = useRef<BiquadFilterNode | null>(null);
  const eqOutputGainRef = useRef<GainNode | null>(null);
  const effectsInputGainRef = useRef<GainNode | null>(null);
  const effectsDryGainRef = useRef<GainNode | null>(null);
  const effectsOutputGainRef = useRef<GainNode | null>(null);
  const reverbConvolverRef = useRef<ConvolverNode | null>(null);
  const reverbWetGainRef = useRef<GainNode | null>(null);
  const concertHallConvolverRef = useRef<ConvolverNode | null>(null);
  const concertHallWetGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const bypassConnectionRef = useRef<boolean>(false);
  const fixedAudioChainConnectedRef = useRef(false);
  const objectUrlRef = useRef<string | null>(null);
  const dspParamsRef = useRef<StreamingParams>({
    sweepFreq: 45,
    width: 50,
    intensity: 100,
    balance: 100,
    volume: 100,
  });
  
  // Callback para cuando termina una canción
  const onTrackEndedRef = useRef<(() => void) | null>(null);
  const onTrackErrorRef = useRef<((error: Error) => void) | null>(null);
  
  // Configuración de crossfade
  const crossfadeConfigRef = useRef<CrossfadeConfig>({
    enabled: false,
    duration: 5,
  });
  const crossfadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCrossfadingRef = useRef(false);
  const pendingCrossfadeInRef = useRef(false);
  
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [eqBands, setEqBands] = useState<EqualizerBand[]>(DEFAULT_EQ_BANDS);
  const [eqEnabled, setEqEnabledState] = useState(true);
  const [epicenterEnabled, setEpicenterEnabledState] = useState(false);
  const eqEnabledRef = useRef(true);
  const epicenterEnabledRef = useRef(false);
  const [reverbEnabled, setReverbEnabledState] = useState(false);
  const [reverbAmount, setReverbAmountState] = useState(25);
  const [concertHallEnabled, setConcertHallEnabledState] = useState(false);
  const [concertHallAmount, setConcertHallAmountState] = useState(35);
  const reverbEnabledRef = useRef(false);
  const reverbAmountRef = useRef(25);
  const concertHallEnabledRef = useRef(false);
  const concertHallAmountRef = useRef(35);
  const eqBandsRef = useRef<EqualizerBand[]>(DEFAULT_EQ_BANDS);
  const eqUserPreampDbRef = useRef(0);

  useEffect(() => {
    eqBandsRef.current = eqBands;
  }, [eqBands]);


  const createReverbImpulse = useCallback(
    (ctx: AudioContext, seconds: number, decay: number) => {
      const sampleRate = ctx.sampleRate;
      const length = Math.max(1, Math.floor(sampleRate * seconds));
      const impulse = ctx.createBuffer(2, length, sampleRate);

      for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
        const data = impulse.getChannelData(channel);
        for (let index = 0; index < length; index += 1) {
          const progress = index / length;
          const earlyReflection = index < sampleRate * 0.08 ? 1.15 : 1;
          const tail = Math.pow(1 - progress, decay);
          data[index] = (Math.random() * 2 - 1) * tail * earlyReflection;
        }
      }

      return impulse;
    },
    [],
  );

  const applyReverbMix = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const activeWet = Math.max(
      reverbEnabledRef.current ? reverbAmountRef.current / 100 : 0,
      concertHallEnabledRef.current ? concertHallAmountRef.current / 100 : 0,
    );
    const dryLevel = Math.max(0.55, 1 - activeWet * 0.45);

    effectsDryGainRef.current?.gain.linearRampToValueAtTime(
      dryLevel,
      ctx.currentTime + 0.05,
    );
    reverbWetGainRef.current?.gain.linearRampToValueAtTime(
      reverbEnabledRef.current ? (reverbAmountRef.current / 100) * 0.45 : 0,
      ctx.currentTime + 0.05,
    );
    concertHallWetGainRef.current?.gain.linearRampToValueAtTime(
      concertHallEnabledRef.current
        ? (concertHallAmountRef.current / 100) * 0.55
        : 0,
      ctx.currentTime + 0.05,
    );
  }, []);

  useEffect(() => {
    return () => {
      if (crossfadeTimeoutRef.current) {
        clearTimeout(crossfadeTimeoutRef.current);
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const initAudioChain = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    
    // Crear master gain para crossfade
    if (!masterGainRef.current) {
      masterGainRef.current = ctx.createGain();
      masterGainRef.current.gain.value = 1.0;
    }
    
    if (!analyserNodeRef.current) {
      analyserNodeRef.current = ctx.createAnalyser();
      analyserNodeRef.current.fftSize = 4096;
      analyserNodeRef.current.smoothingTimeConstant = 0.65;
    }

    if (!effectsInputGainRef.current) {
      effectsInputGainRef.current = ctx.createGain();
      effectsDryGainRef.current = ctx.createGain();
      effectsOutputGainRef.current = ctx.createGain();
      reverbConvolverRef.current = ctx.createConvolver();
      reverbWetGainRef.current = ctx.createGain();
      concertHallConvolverRef.current = ctx.createConvolver();
      concertHallWetGainRef.current = ctx.createGain();

      reverbConvolverRef.current.buffer = createReverbImpulse(ctx, 1.4, 2.4);
      concertHallConvolverRef.current.buffer = createReverbImpulse(ctx, 3.8, 2.0);

      effectsInputGainRef.current.connect(effectsDryGainRef.current);
      effectsDryGainRef.current.connect(effectsOutputGainRef.current);

      effectsInputGainRef.current.connect(reverbConvolverRef.current);
      reverbConvolverRef.current.connect(reverbWetGainRef.current);
      reverbWetGainRef.current.connect(effectsOutputGainRef.current);

      effectsInputGainRef.current.connect(concertHallConvolverRef.current);
      concertHallConvolverRef.current.connect(concertHallWetGainRef.current);
      concertHallWetGainRef.current.connect(effectsOutputGainRef.current);

      applyReverbMix();
    }

    // Inicializar Epicenter Worklet
    if (!workletNodeRef.current) {
      try {
        const workletPath = new URL('/epicenter-worklet.js', window.location.origin).href;
        await ctx.audioWorklet.addModule(workletPath);
        
        workletNodeRef.current = new AudioWorkletNode(ctx, 'epicenter-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [2],
          parameterData: {
            sweepFreq: 45,
            width: 50,
            intensity: 0, // Comenzar con 0 (desactivado)
            balance: 100,
            volume: 100,
          },
        });
      } catch (error) {
        console.error('Error loading AudioWorklet:', error);
        throw error;
      }
    }

    // Inicializar Ecualizador con split de bandas:
    // - <=100 Hz solo afectan ruta de bajos
    // - >100 Hz solo afectan ruta de medios/agudos
    if (eqFiltersRef.current.length === 0) {
      eqInputGainRef.current = ctx.createGain();
      eqOutputGainRef.current = ctx.createGain();
      eqLowSplitRef.current = ctx.createBiquadFilter();
      eqLowSplitRef.current.type = 'lowpass';
      eqLowSplitRef.current.frequency.value = 120;
      eqLowSplitRef.current.Q.value = 0.707;

      eqHighSplitRef.current = ctx.createBiquadFilter();
      eqHighSplitRef.current.type = 'highpass';
      eqHighSplitRef.current.frequency.value = 120;
      eqHighSplitRef.current.Q.value = 0.707;

      eqLowFiltersRef.current = [];
      eqHighFiltersRef.current = [];
      eqFiltersRef.current = eqBandsRef.current.map((band, index) => {
        const filter = ctx.createBiquadFilter();
        filter.type =
          index === 0
            ? 'lowshelf'
            : index === DEFAULT_EQ_BANDS.length - 1
              ? 'highshelf'
              : 'peaking';
        filter.frequency.value = band.frequency;
        filter.Q.value = 1.0;
        filter.gain.value = eqEnabledRef.current ? band.gain : 0;
        if (band.frequency <= 100) {
          eqLowFiltersRef.current.push(filter);
        } else {
          eqHighFiltersRef.current.push(filter);
        }
        return filter;
      });

      let lowNode: AudioNode = eqLowSplitRef.current;
      for (const filter of eqLowFiltersRef.current) {
        lowNode.connect(filter);
        lowNode = filter;
      }

      let highNode: AudioNode = eqHighSplitRef.current;
      for (const filter of eqHighFiltersRef.current) {
        highNode.connect(filter);
        highNode = filter;
      }

      eqInputGainRef.current.connect(eqLowSplitRef.current);
      eqInputGainRef.current.connect(eqHighSplitRef.current);
      lowNode.connect(eqOutputGainRef.current);
      highNode.connect(eqOutputGainRef.current);
    }

    // Conectar la parte fija de la cadena (ya no conectamos el source aquí)
    // Cadena base: Worklet → Equalizer → Efectos espaciales → MasterGain → Destination
    if (
      !fixedAudioChainConnectedRef.current &&
      workletNodeRef.current &&
      eqInputGainRef.current &&
      eqOutputGainRef.current &&
      effectsInputGainRef.current &&
      effectsOutputGainRef.current &&
      masterGainRef.current
    ) {
      workletNodeRef.current.connect(eqInputGainRef.current);
      eqOutputGainRef.current.connect(effectsInputGainRef.current);
      effectsOutputGainRef.current.connect(masterGainRef.current);
      masterGainRef.current.connect(ctx.destination);
      fixedAudioChainConnectedRef.current = true;
    }
  }, [applyReverbMix, createReverbImpulse]);

  // Función para reconectar la cadena según el estado de los efectos
  const updateAudioRouting = useCallback(() => {
    if (!sourceNodeRef.current || !audioContextRef.current) return;
    
    const source = sourceNodeRef.current;
    
    // Desconectar todo primero
    try {
      source.disconnect();
    } catch (e) {
      // Ya estaba desconectado
    }
    
    // Determinar si necesitamos bypass completo
    const needsBypass =
      !epicenterEnabledRef.current &&
      !eqEnabledRef.current &&
      !reverbEnabledRef.current &&
      !concertHallEnabledRef.current;
    
    if (needsBypass && masterGainRef.current) {
      // BYPASS COMPLETO: Source → MasterGain → Destination
      // Audio 100% puro sin procesamiento
      source.connect(masterGainRef.current);
      if (analyserNodeRef.current) source.connect(analyserNodeRef.current);
      bypassConnectionRef.current = true;
      console.log('🎵 AUDIO PURO: Bypass completo activado (sin procesamiento)');
    } else if (workletNodeRef.current) {
      // Usar cadena de procesamiento normal
      // Source → Worklet → Equalizer → Efectos espaciales → MasterGain → Destination
      source.connect(workletNodeRef.current);
      if (analyserNodeRef.current) source.connect(analyserNodeRef.current);
      bypassConnectionRef.current = false;
      console.log('🎛️ AUDIO CON EFECTOS: Cadena de procesamiento activada');
    }
  }, []);

  // Función para iniciar crossfade (fade out)
  const startCrossfadeOut = useCallback(() => {
    if (!masterGainRef.current || !audioContextRef.current || isCrossfadingRef.current) return;
    
    const ctx = audioContextRef.current;
    const duration = crossfadeConfigRef.current.duration;
    
    isCrossfadingRef.current = true;

    masterGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
    masterGainRef.current.gain.setValueAtTime(masterGainRef.current.gain.value, ctx.currentTime);
    masterGainRef.current.gain.linearRampToValueAtTime(0.0, ctx.currentTime + duration);

    crossfadeTimeoutRef.current = setTimeout(() => {
      crossfadeTimeoutRef.current = null;
      if (onTrackEndedRef.current) {
        onTrackEndedRef.current();
      }
      isCrossfadingRef.current = false;
    }, duration * 1000);
  }, []);

  // Función para fade in al cargar nueva canción
  const startCrossfadeIn = useCallback(() => {
    if (!masterGainRef.current || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const duration = crossfadeConfigRef.current.duration;
    
    masterGainRef.current.gain.cancelScheduledValues(ctx.currentTime);

    if (crossfadeConfigRef.current.enabled) {
      masterGainRef.current.gain.setValueAtTime(0.0, ctx.currentTime);
      masterGainRef.current.gain.linearRampToValueAtTime(1.0, ctx.currentTime + duration);
    } else {
      masterGainRef.current.gain.setValueAtTime(1.0, ctx.currentTime);
    }
  }, []);

  const loadFile = useCallback(async (file: File | string, params: StreamingParams) => {
    // Limpiar cualquier crossfade pendiente
    if (crossfadeTimeoutRef.current) {
      clearTimeout(crossfadeTimeoutRef.current);
      crossfadeTimeoutRef.current = null;
    }
    isCrossfadingRef.current = false;
    
    await initAudioChain();
    const ctx = audioContextRef.current!;
    
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    
    const audioElement = new Audio();
    audioElementRef.current = audioElement;
    
    // Configuración para reproducción en background
    audioElement.preload = 'auto';
    audioElement.crossOrigin = 'anonymous';
    
    // Importante para que siga reproduciendo en background en móviles
    (audioElement as any).mozAudioChannelType = 'content';
    
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    const previousAudioUrl = audioElement.src;
    if (typeof file === 'string') {
      audioElement.src = '';
      audioElement.src = file;
    } else {
      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      audioElement.src = '';
      audioElement.src = objectUrl;
    }
    console.log('[AudioResolve]', { previousAudioUrl, newAudioUrl: audioElement.src, audioElementSrc: audioElement.src });
    audioElement.load();
    
    try {
      const sourceNode = ctx.createMediaElementSource(audioElement);
      sourceNodeRef.current = sourceNode;
      // La conexión se hará dinámicamente según el estado de los efectos
      updateAudioRouting();
    } catch (error) {
      console.error('Error creating MediaElementAudioSourceNode:', error);
      throw error;
    }
    
    // Guardar parámetros iniciales ya normalizados a los topes reales de UI.
    const clampedParams = clampStreamingParams(params);
    dspParamsRef.current = { ...clampedParams };
    
    // Establecer intensity a 0 si Epicenter está desactivado.
    const finalParams = {
      ...clampedParams,
      intensity: epicenterEnabledRef.current ? clampedParams.intensity : 0,
    };
    
    const paramEntries = Object.entries(finalParams) as [keyof StreamingParams, number][];
    for (const [key, value] of paramEntries) {
      const param = workletNodeRef.current!.parameters.get(key);
      if (param) {
        param.setValueAtTime(value, ctx.currentTime);
      }
    }
    
    setIsReady(false);
    setCurrentTime(0);
    setDuration(0);
    
    const onLoadedMetadata = () => {
      setDuration(audioElement.duration);
      setIsReady(true);
      pendingCrossfadeInRef.current = crossfadeConfigRef.current.enabled;
      if (!crossfadeConfigRef.current.enabled && masterGainRef.current && audioContextRef.current) {
        masterGainRef.current.gain.setValueAtTime(1.0, audioContextRef.current.currentTime);
      }
    };
    
    const onTimeUpdate = () => {
      setCurrentTime(audioElement.currentTime);
      
      // Verificar si debemos iniciar crossfade
      if (crossfadeConfigRef.current.enabled && !isCrossfadingRef.current) {
        const timeRemaining = audioElement.duration - audioElement.currentTime;
        const crossfadeDuration = crossfadeConfigRef.current.duration;
        
        if (timeRemaining <= crossfadeDuration && timeRemaining > 0) {
          startCrossfadeOut();
        }
      }
    };
    
    const onEnded = () => {
      setIsPlaying(false);
      
      // Si NO estamos en crossfade, llamar al callback para siguiente canción
      if (!isCrossfadingRef.current && onTrackEndedRef.current) {
        // Reset del gain para la siguiente canción
        if (masterGainRef.current && audioContextRef.current) {
          masterGainRef.current.gain.setValueAtTime(1.0, audioContextRef.current.currentTime);
        }
        onTrackEndedRef.current();
      }
    };

    const onError = () => {
      const mediaError = audioElement.error;
      const message = mediaError
        ? `Audio playback error (code ${mediaError.code})`
        : 'Audio playback error';
      setIsPlaying(false);
      setIsReady(false);
      if (onTrackErrorRef.current) {
        onTrackErrorRef.current(new Error(message));
      }
    };
    
    audioElement.addEventListener('loadedmetadata', onLoadedMetadata);
    audioElement.addEventListener('timeupdate', onTimeUpdate);
    audioElement.addEventListener('ended', onEnded);
    audioElement.addEventListener('error', onError);
  }, [initAudioChain, startCrossfadeIn, startCrossfadeOut, updateAudioRouting]);

  const play = useCallback(() => {
    if (!audioElementRef.current || !audioContextRef.current) return;
    const element = audioElementRef.current;
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    void element.play().catch((error) => {
      setIsPlaying(false);
      if (onTrackErrorRef.current) {
        onTrackErrorRef.current(error instanceof Error ? error : new Error('Audio playback failed'));
      }
    });
    if (pendingCrossfadeInRef.current) {
      startCrossfadeIn();
      pendingCrossfadeInRef.current = false;
    }
    setIsPlaying(true);
  }, [startCrossfadeIn]);

  const pause = useCallback(() => {
    if (!audioElementRef.current) return;
    audioElementRef.current.pause();
    setIsPlaying(false);
  }, []);

  const seek = useCallback((time: number) => {
    if (!audioElementRef.current) return;
    
    // Si estamos en crossfade y el usuario hace seek, cancelar el crossfade
    if (isCrossfadingRef.current) {
      if (crossfadeTimeoutRef.current) {
        clearTimeout(crossfadeTimeoutRef.current);
        crossfadeTimeoutRef.current = null;
      }
      isCrossfadingRef.current = false;
      
      // Restaurar volumen
      if (masterGainRef.current && audioContextRef.current) {
        masterGainRef.current.gain.cancelScheduledValues(audioContextRef.current.currentTime);
        masterGainRef.current.gain.setValueAtTime(1.0, audioContextRef.current.currentTime);
      }
    }
    
    audioElementRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const setDspParam = useCallback((name: keyof StreamingParams, value: number) => {
    const node = workletNodeRef.current;
    const ctx = audioContextRef.current;
    if (!node || !ctx) return;
    
    const clampedValue = clampStreamingParam(name, value);

    // Guardar el parámetro
    dspParamsRef.current = { ...dspParamsRef.current, [name]: clampedValue };
    
    const param = node.parameters.get(name);
    if (!param) return;
    
    // Usar linearRampToValueAtTime para cambios suaves sin reinicio
    param.linearRampToValueAtTime(clampedValue, ctx.currentTime + 0.05);
  }, []);


  const applyEqOutputGain = useCallback((bandsSnapshot: EqualizerBand[]) => {
    if (!eqOutputGainRef.current || !audioContextRef.current) return;

    const maxPositiveGain = bandsSnapshot.reduce((max, band) => Math.max(max, band.gain), 0);
    const clippingCompensationDb = -Math.max(0, maxPositiveGain - 3);
    const effectivePreampDb = eqUserPreampDbRef.current + clippingCompensationDb;
    const linear = Math.pow(10, effectivePreampDb / 20);
    eqOutputGainRef.current.gain.setValueAtTime(linear, audioContextRef.current.currentTime);
  }, []);

  const setEqPreampDb = useCallback((preampDb: number) => {
    eqUserPreampDbRef.current = preampDb;
    applyEqOutputGain(eqBandsRef.current);
  }, [applyEqOutputGain]);

  const getAnalyserNode = useCallback(() => analyserNodeRef.current, []);

  const getCurrentDspParams = useCallback(() => ({ ...dspParamsRef.current }), []);

  const setEqBandGain = useCallback((index: number, gain: number) => {
    const clampedGain = Math.max(EQ_GAIN_MIN, Math.min(EQ_GAIN_MAX, gain));

    setEqBands((prev) => {
      const newBands = [...prev];
      newBands[index] = { ...newBands[index], gain: clampedGain };
      eqBandsRef.current = newBands;
      applyEqOutputGain(newBands);
      return newBands;
    });

    if (eqFiltersRef.current[index]) {
      eqFiltersRef.current[index].gain.value = eqEnabled ? clampedGain : 0;
    }
  }, [applyEqOutputGain, eqEnabled]);

  const setEqEnabled = useCallback((enabled: boolean) => {
    eqEnabledRef.current = enabled;
    setEqEnabledState(enabled);

    const snapshot = eqBandsRef.current;
    eqFiltersRef.current.forEach((filter, index) => {
      filter.gain.value = enabled ? snapshot[index].gain : 0;
    });

    if (enabled) {
      applyEqOutputGain(snapshot);
    } else if (eqOutputGainRef.current && audioContextRef.current) {
      eqOutputGainRef.current.gain.setValueAtTime(1, audioContextRef.current.currentTime);
    }

    // Actualizar el enrutamiento de audio
    setTimeout(() => {
      updateAudioRouting();
      if (enabled) {
        const latest = eqBandsRef.current;
        eqFiltersRef.current.forEach((filter, index) => {
          filter.gain.value = latest[index].gain;
        });
      }
    }, 0);
  }, [applyEqOutputGain, updateAudioRouting]);

  const setEpicenterEnabled = useCallback((enabled: boolean) => {
    epicenterEnabledRef.current = enabled;
    setEpicenterEnabledState(enabled);
    
    const ctx = audioContextRef.current;
    const node = workletNodeRef.current;
    
    if (!ctx || !node) return;
    
    // Cambiar la intensidad del Epicenter
    const intensityParam = node.parameters.get('intensity');
    if (intensityParam) {
      const targetIntensity = enabled ? dspParamsRef.current.intensity : 0;
      intensityParam.linearRampToValueAtTime(targetIntensity, ctx.currentTime + 0.05);
    }
    
    // Actualizar el enrutamiento de audio
    setTimeout(() => updateAudioRouting(), 0);
  }, [updateAudioRouting]);

  const setOnTrackEnded = useCallback((callback: (() => void) | null) => {
    onTrackEndedRef.current = callback;
  }, []);

  const setOnTrackError = useCallback((callback: ((error: Error) => void) | null) => {
    onTrackErrorRef.current = callback;
  }, []);

  const setCrossfadeConfig = useCallback((config: CrossfadeConfig) => {
    crossfadeConfigRef.current = config;
  }, []);

  const setReverbEnabled = useCallback((enabled: boolean) => {
    reverbEnabledRef.current = enabled;
    setReverbEnabledState(enabled);
    applyReverbMix();
    setTimeout(() => updateAudioRouting(), 0);
  }, [applyReverbMix, updateAudioRouting]);

  const setReverbAmount = useCallback((amount: number) => {
    const clampedAmount = clampEffectAmount(amount);
    reverbAmountRef.current = clampedAmount;
    setReverbAmountState(clampedAmount);
    applyReverbMix();
  }, [applyReverbMix]);

  const setConcertHallEnabled = useCallback((enabled: boolean) => {
    concertHallEnabledRef.current = enabled;
    setConcertHallEnabledState(enabled);
    applyReverbMix();
    setTimeout(() => updateAudioRouting(), 0);
  }, [applyReverbMix, updateAudioRouting]);

  const setConcertHallAmount = useCallback((amount: number) => {
    const clampedAmount = clampEffectAmount(amount);
    concertHallAmountRef.current = clampedAmount;
    setConcertHallAmountState(clampedAmount);
    applyReverbMix();
  }, [applyReverbMix]);

  const resetAfterError = useCallback(() => {
    if (crossfadeTimeoutRef.current) {
      clearTimeout(crossfadeTimeoutRef.current);
      crossfadeTimeoutRef.current = null;
    }

    isCrossfadingRef.current = false;
    pendingCrossfadeInRef.current = false;

    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.removeAttribute('src');
      audioElementRef.current.load();
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (_error) {
        // no-op
      }
      sourceNodeRef.current = null;
    }

    if (masterGainRef.current && audioContextRef.current) {
      masterGainRef.current.gain.setValueAtTime(1.0, audioContextRef.current.currentTime);
    }

    setIsReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  return {
    isReady,
    isPlaying,
    currentTime,
    duration,
    loadFile,
    play,
    pause,
    seek,
    setDspParam,
    setEqBandGain,
    setEqEnabled,
    setEpicenterEnabled,
    setEqPreampDb,
    getAnalyserNode,
    getCurrentDspParams,
    setOnTrackEnded,
    setOnTrackError,
    setCrossfadeConfig,
    setReverbEnabled,
    setReverbAmount,
    setConcertHallEnabled,
    setConcertHallAmount,
    resetAfterError,
    eqBands,
    eqEnabled,
    epicenterEnabled,
    reverbEnabled,
    reverbAmount,
    concertHallEnabled,
    concertHallAmount,
  };
}

export default useIntegratedAudioProcessor;
