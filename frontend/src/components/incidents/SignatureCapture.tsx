import { useEffect, useRef, useState } from 'react';

type SignatureCaptureProps = {
  signerName: string;
  onSignerNameChange: (value: string) => void;
  onSignatureChange: (payload: { type: 'typed' | 'drawn'; data: string }) => void;
  disabled?: boolean;
  autoSignerName?: string;
  hideNameField?: boolean;
};

function isTouchDevice() {
  return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

export function SignatureCapture({
  signerName,
  onSignerNameChange,
  onSignatureChange,
  disabled,
  autoSignerName,
  hideNameField,
}: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [mode, setMode] = useState<'drawn' | 'typed'>(() => (isTouchDevice() ? 'drawn' : 'typed'));
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (mode === 'typed') {
      onSignatureChange({ type: 'typed', data: signerName.trim() });
    }
  }, [mode, signerName, onSignatureChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== 'drawn') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#111827';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }, [mode]);

  const exportDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSignatureChange({ type: 'drawn', data: canvas.toDataURL('image/png') });
  };

  const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0] ?? e.changedTouches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || mode !== 'drawn') return;
    e.preventDefault();
    drawingRef.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    const point = getPoint(e);
    ctx?.beginPath();
    ctx?.moveTo(point.x, point.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingRef.current || disabled || mode !== 'drawn') return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    const point = getPoint(e);
    ctx?.lineTo(point.x, point.y);
    ctx?.stroke();
    setHasDrawn(true);
  };

  const endDraw = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    exportDrawing();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignatureChange({ type: 'drawn', data: '' });
  };

  return (
    <div className="space-y-3">
      {!hideNameField && (
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Parakstītāja vārds, uzvārds *</label>
          <input
            className="input-field"
            value={signerName}
            onChange={(e) => onSignerNameChange(e.target.value)}
            placeholder="Piem., Jānis Bērziņš"
            disabled={disabled}
          />
        </div>
      )}
      {hideNameField && autoSignerName && (
        <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
          Parakstītājs: <span className="font-medium text-gray-800">{autoSignerName}</span>
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border ${
            mode === 'drawn'
              ? 'border-primary-500 bg-primary-50 text-primary-800'
              : 'border-gray-200 text-gray-600'
          }`}
          onClick={() => setMode('drawn')}
          disabled={disabled}
        >
          Zīmēt parakstu
        </button>
        <button
          type="button"
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border ${
            mode === 'typed'
              ? 'border-primary-500 bg-primary-50 text-primary-800'
              : 'border-gray-200 text-gray-600'
          }`}
          onClick={() => setMode('typed')}
          disabled={disabled}
        >
          Ierakstīt vārdu
        </button>
      </div>

      {mode === 'drawn' ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            {isTouchDevice()
              ? 'Parakstieties ar pirkstu ekrānā'
              : 'Varat zīmēt ar peli vai pārslēgties uz ierakstīšanu'}
          </p>
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              className="w-full h-36 touch-none cursor-crosshair block"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          </div>
          <button
            type="button"
            className="text-sm text-gray-600 hover:text-gray-800"
            onClick={clearCanvas}
            disabled={disabled || !hasDrawn}
          >
            Notīrīt parakstu
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
          Datorā pietiek ar vārda un uzvārda ievadi — tas tiks izmantots kā paraksts aktā.
        </p>
      )}
    </div>
  );
}

export function isSignatureReady(
  signerName: string,
  signature: { type: 'typed' | 'drawn'; data: string },
  autoSignerName?: string
): boolean {
  const effectiveName = signerName.trim() || autoSignerName?.trim() || '';
  if (signature.type === 'typed') {
    if (!effectiveName) return false;
    return effectiveName.length > 1;
  }
  if (signature.type === 'drawn') {
    if (autoSignerName && !signerName.trim()) {
      return signature.data.startsWith('data:image/');
    }
    if (!effectiveName) return false;
    return signature.data.startsWith('data:image/');
  }
  return false;
}
