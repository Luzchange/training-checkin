import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat, NotFoundException } from '@zxing/library';
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  UserPlus,
  Volume2,
  VolumeX,
  Vibrate,
  AlertCircle,
  HelpCircle,
  StopCircle,
} from 'lucide-react';
import { parseBarcodePayload } from '../services/barcodeParser';
import { BarcodeParseResult, ScanFeedbackOptions } from '../types';

interface MobileScannerProps {
  onScanResult: (result: BarcodeParseResult) => void;
  onOpenManualEntry: () => void;
  feedbackOptions: ScanFeedbackOptions;
  onToggleFeedback: (type: 'sound' | 'vibration') => void;
}

export const MobileScanner: React.FC<MobileScannerProps> = ({
  onScanResult,
  onOpenManualEntry,
  feedbackOptions,
  onToggleFeedback,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(true);
  const animationFrameIdRef = useRef<number | null>(null);

  // In-memory scan suppression (debouncing)
  // Prevents repeated rapid scans when holding a card in front of camera
  const lastScanTimeRef = useRef<number>(0);
  const lastScanPayloadRef = useRef<string>('');

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (readerRef.current) {
      // BrowserMultiFormatReader doesn't have a direct destroy, but stopping the stream stops decoding
    }
    setIsScanning(false);
    setTorchOn(false);
    setTorchAvailable(false);
  }, []);

  // Stop camera on unmount or tab backgrounding
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopCamera();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      stopCamera();
    };
  }, [stopCamera]);

  // Request list of video devices
  const refreshDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);

      // Prefer rear camera if not already selected
      if (!selectedDeviceId && videoInputs.length > 0) {
        const backCamera = videoInputs.find(
          (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment')
        );
        setSelectedDeviceId(backCamera ? backCamera.deviceId : videoInputs[0].deviceId);
      }
    } catch (err) {
      console.warn('Could not enumerate devices', err);
    }
  };

  // Start Camera and Decoder
  const startCamera = async (deviceId?: string) => {
    setErrorMessage(null);
    stopCamera();

    // Context check: Camera requires secure context (HTTPS or localhost)
    if (window.isSecureContext === false) {
      setErrorMessage(
        'Camera access requires a secure context (HTTPS). Please ensure you are running over HTTPS or localhost.'
      );
      setHasPermission(false);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Camera API is not supported on this device/browser.');
      setHasPermission(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: { ideal: 'environment' }, // Prefer rear-facing camera for barcode scanning
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasPermission(true);
      setShowExplanation(false);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check torch capability on the active track
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;
        if (capabilities.torch) {
          setTorchAvailable(true);
        }
      }

      await refreshDevices();

      // Initialize ZXing reader with PDF417 & Code 39 hints and TRY_HARDER
      if (!readerRef.current) {
        const hints = new Map<DecodeHintType, any>();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.PDF_417,
          BarcodeFormat.CODE_39,
          BarcodeFormat.QR_CODE,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        readerRef.current = new BrowserMultiFormatReader(hints);
      }

      setIsScanning(true);

      // Start decoding loop from video element
      readerRef.current.decodeFromVideoElement(videoRef.current!, (result, error) => {
        if (result) {
          const rawText = result.getText();
          const now = Date.now();

          // Debounce check: Suppress repeated scans of identical payload within 3 seconds
          if (rawText === lastScanPayloadRef.current && now - lastScanTimeRef.current < 3000) {
            return;
          }

          lastScanPayloadRef.current = rawText;
          lastScanTimeRef.current = now;

          // Parse immediately and discard raw payload
          const parseResult = parseBarcodePayload(rawText);
          onScanResult(parseResult);
        }

        if (error && !(error instanceof NotFoundException)) {
          // Normal frame with no barcode found is NotFoundException, ignore.
        }
      });
    } catch (err: unknown) {
      stopCamera();
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setErrorMessage('Camera permission was denied. Please allow camera access in your browser settings.');
        setHasPermission(false);
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera found on this device.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setErrorMessage('Camera is currently in use by another application or tab.');
      } else {
        setErrorMessage(`Camera error: ${error.message || 'Unable to start camera'}`);
      }
    }
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchOn;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Failed to toggle torch', err);
      }
    }
  };

  // Switch camera if multiple cameras available
  const switchCamera = () => {
    if (videoDevices.length < 2) return;
    const currentIndex = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    const nextDevice = videoDevices[nextIndex];
    setSelectedDeviceId(nextDevice.deviceId);
    startCamera(nextDevice.deviceId);
  };

  return (
    <div className="mobile-scanner space-y-4">
      {/* Pre-camera explanation screen */}
      {showExplanation && !isScanning && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <HelpCircle className="w-5 h-5 text-primary" />
            <span>Before Starting Camera</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4 leading-relaxed">
            <li>
              <strong>Scan the FRONT barcode:</strong> Scan the PDF417 2D barcode on the front of the CAC, <em>not</em> the linear Code 39 barcode on the back.
            </li>
            <li>
              <strong>Privacy:</strong> Video frames and raw barcode strings are processed in device memory only and are never saved or transmitted.
            </li>
            <li>
              <strong>Permissions:</strong> Camera access is requested solely to decode the front card symbol.
            </li>
            <li>
              <strong>Approval:</strong> Ensure your unit/organization authorizes using this web tool for sign-in.
            </li>
          </ul>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => startCamera()}
              className="btn btn-primary flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Start Scanning</span>
            </button>
            <button
              type="button"
              onClick={onOpenManualEntry}
              className="btn btn-outline py-3 text-sm font-medium flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Manual Entry</span>
            </button>
          </div>
        </div>
      )}

      {/* Error message card */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-semibold">Scanner Notice</p>
            <p className="text-xs leading-relaxed">{errorMessage}</p>
            <div className="flex gap-2 pt-1">
              {hasPermission === false ? (
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="btn btn-secondary text-xs px-3 py-1.5"
                >
                  Retry Permission
                </button>
              ) : null}
              <button
                type="button"
                onClick={onOpenManualEntry}
                className="btn btn-primary text-xs px-3 py-1.5"
              >
                Use Manual Check-In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewfinder and Camera Feed */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] max-h-[460px] flex items-center justify-center border-2 border-border shadow-inner">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover ${!isScanning ? 'hidden' : 'block'}`}
        />

        {!isScanning && (
          <div className="text-center p-6 text-muted-foreground flex flex-col items-center">
            <Camera className="w-12 h-12 mb-3 stroke-1 text-muted-foreground/60" />
            <p className="text-sm font-medium">Camera is inactive</p>
            <p className="text-xs text-muted-foreground/80 mt-1 max-w-[200px]">
              Tap Start Scanning to begin reading front CAC barcodes
            </p>
          </div>
        )}

        {/* Reticle / Target Overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
            <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">
              Scan FRONT barcode (PDF417)
            </div>

            {/* Target Box */}
            <div className="relative w-64 h-40 border-2 border-primary/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white" />
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500/60 animate-pulse" />
            </div>

            <div className="text-[11px] text-white/80 bg-black/60 px-3 py-1 rounded-full">
              Position front barcode inside the box
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-card border border-border">
        {/* Left: Camera Start/Stop / Switch */}
        <div className="flex items-center gap-1.5">
          {isScanning ? (
            <button
              type="button"
              onClick={stopCamera}
              className="btn btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
            >
              <StopCircle className="w-4 h-4 text-destructive" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startCamera(selectedDeviceId || undefined)}
              className="btn btn-primary text-xs px-3 py-2 flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4" />
              <span>Start</span>
            </button>
          )}

          {videoDevices.length > 1 && (
            <button
              type="button"
              onClick={switchCamera}
              title="Switch Camera"
              aria-label="Switch between available cameras"
              className="btn btn-ghost p-2"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {torchAvailable && (
            <button
              type="button"
              onClick={toggleTorch}
              title={torchOn ? 'Turn torch off' : 'Turn torch on'}
              aria-label={torchOn ? 'Turn torch off' : 'Turn torch on'}
              className={`btn btn-ghost p-2 ${torchOn ? 'text-amber-500' : ''}`}
            >
              {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Right: Audio/Haptic toggles & Manual fallback */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleFeedback('sound')}
            title={feedbackOptions.soundEnabled ? 'Mute scan sound' : 'Enable scan sound'}
            aria-label={feedbackOptions.soundEnabled ? 'Mute scan sound' : 'Enable scan sound'}
            className={`btn btn-ghost p-2 ${feedbackOptions.soundEnabled ? 'text-primary' : 'text-muted-foreground'}`}
          >
            {feedbackOptions.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => onToggleFeedback('vibration')}
            title={feedbackOptions.vibrationEnabled ? 'Disable vibration' : 'Enable vibration'}
            aria-label={feedbackOptions.vibrationEnabled ? 'Disable vibration' : 'Enable vibration'}
            className={`btn btn-ghost p-2 ${feedbackOptions.vibrationEnabled ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Vibrate className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenManualEntry}
            className="btn btn-outline text-xs px-3 py-2 flex items-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Manual</span>
          </button>
        </div>
      </div>
    </div>
  );
};

