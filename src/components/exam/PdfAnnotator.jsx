import { useState, useRef, useEffect, useCallback } from 'react';
import { FileText, ZoomIn, ZoomOut, Pencil, Highlighter, Eraser, Undo2, Redo2, Trash2, MousePointer2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import './PdfAnnotator.css';

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

const TOOLS = {
  SELECT: 'select',
  PEN: 'pen',
  HIGHLIGHT: 'highlight',
  ERASER: 'eraser',
};

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#ffffff', // white
  '#000000', // black
];

const HIGHLIGHT_COLORS = [
  '#fde047', // yellow (default)
  '#86efac', // green
  '#93c5fd', // blue
  '#fca5a5', // red
  '#d8b4fe', // purple
  '#fdba74', // orange
];

const PEN_WIDTHS = [1, 2, 3, 5, 8];

/**
 * PDF Annotator - renders PDF via pdfjs-dist canvas with annotation overlay.
 * Supports: Pen (freehand), Highlight (semi-transparent), Eraser, Undo/Redo, Color/Width picker.
 */
export default function PdfAnnotator({ examId, initialPdfUrl }) {
  const [pdfUrl, setPdfUrl] = useState(() => {
    return initialPdfUrl || sessionStorage.getItem('current_pdf') || null;
  });

  useEffect(() => {
    if (initialPdfUrl) setPdfUrl(initialPdfUrl);
  }, [initialPdfUrl]);

  const [zoom, setZoom] = useState(100);
  const [activeTool, setActiveTool] = useState(TOOLS.SELECT);
  const [penColor, setPenColor] = useState('#ef4444');
  const [highlightColor, setHighlightColor] = useState('#fde047');
  const [penWidth, setPenWidth] = useState(2);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [pdfDoc, setPdfDoc] = useState(null);

  // Annotation data: per-page strokes
  // { [pageIndex]: [ { tool, color, width, opacity, points: [{x,y}] } ] }
  const [annotations, setAnnotations] = useState({});
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Drawing state
  const isDrawing = useRef(false);
  const currentStroke = useRef(null);
  const pagesContainerRef = useRef(null);
  const canvasRefs = useRef({}); // { pageIndex: { pdf: canvas, annotation: canvas } }
  const renderTasks = useRef({}); // Track active render tasks

  // Load PDF document
  useEffect(() => {
    if (!pdfUrl) return;
    let isMounted = true;

    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: 'https://unpkg.com/pdfjs-dist@5.7.284/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@5.7.284/standard_fonts/',
        });
        const doc = await loadingTask.promise;
        if (!isMounted) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
      } catch (err) {
        console.error('Error loading PDF:', err);
        if (isMounted) {
          setPdfUrl(null);
          sessionStorage.removeItem('current_pdf');
        }
      }
    };

    loadPdf();
    return () => { isMounted = false; };
  }, [pdfUrl]);

  // Render PDF pages when doc or zoom changes
  useEffect(() => {
    if (!pdfDoc) return;
    let isMounted = true;

    const renderPages = async () => {
      for (let i = 0; i < numPages; i++) {
        if (!isMounted) break;
        
        try {
          const page = await pdfDoc.getPage(i + 1);
          // Base scale 1.4 so that 100% UI zoom = 140% actual zoom (fits screen perfectly)
          const scale = (zoom / 100) * 1.4;
          const viewport = page.getViewport({ scale: scale * 1.5 }); // 1.5x for crisp rendering

          const refs = canvasRefs.current[i];
          if (!refs?.pdf) continue;

          const pdfCanvas = refs.pdf;
          pdfCanvas.width = viewport.width;
          pdfCanvas.height = viewport.height;
          pdfCanvas.style.width = `${viewport.width / 1.5}px`;
          pdfCanvas.style.height = `${viewport.height / 1.5}px`;

          const ctx = pdfCanvas.getContext('2d', { willReadFrequently: true });

          // Cancel previous render task for this page if it exists
          if (renderTasks.current[i]) {
            try {
              renderTasks.current[i].cancel();
            } catch (e) {
              // Ignore cancellation errors
            }
          }

          const renderTask = page.render({ canvasContext: ctx, viewport });
          renderTasks.current[i] = renderTask;

          await renderTask.promise;

          // Resize annotation canvas to match
          const annoCanvas = refs.annotation;
          if (annoCanvas && isMounted) {
            annoCanvas.width = viewport.width;
            annoCanvas.height = viewport.height;
            annoCanvas.style.width = `${viewport.width / 1.5}px`;
            annoCanvas.style.height = `${viewport.height / 1.5}px`;

            // Redraw existing annotations
            redrawAnnotations(i);
          }
        } catch (err) {
          // It's normal for rendering to be cancelled when zoom changes rapidly
          if (err.name !== 'RenderingCancelledException') {
            console.warn(`Render error on page ${i + 1}:`, err);
          }
        }
      }
    };

    renderPages();
    
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, numPages, zoom]);

  // Redraw all annotations for a specific page
  const redrawAnnotations = useCallback((pageIndex) => {
    const refs = canvasRefs.current[pageIndex];
    if (!refs?.annotation) return;

    const canvas = refs.annotation;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pageAnnotations = annotations[pageIndex] || [];
    for (const stroke of pageAnnotations) {
      drawStroke(ctx, stroke, canvas.width, canvas.height);
    }
  }, [annotations]);

  // Redraw annotations when annotations state changes
  useEffect(() => {
    for (let i = 0; i < numPages; i++) {
      redrawAnnotations(i);
    }
  }, [annotations, numPages, redrawAnnotations]);

  // Draw a single stroke on canvas
  const drawStroke = (ctx, stroke, canvasWidth, canvasHeight) => {
    if (!stroke.points || stroke.points.length < 2) return;

    ctx.save();
    ctx.globalAlpha = stroke.opacity;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width * (canvasWidth / 600); // Scale width relative to canvas
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'highlight') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.lineCap = 'square';
    }

    ctx.beginPath();
    const firstPoint = stroke.points[0];
    ctx.moveTo(firstPoint.x * canvasWidth, firstPoint.y * canvasHeight);

    for (let i = 1; i < stroke.points.length; i++) {
      const point = stroke.points[i];
      ctx.lineTo(point.x * canvasWidth, point.y * canvasHeight);
    }

    ctx.stroke();
    ctx.restore();
  };

  // Get page index and normalized coords from mouse/touch event
  const getEventCoords = (e, pageIndex) => {
    const refs = canvasRefs.current[pageIndex];
    if (!refs?.annotation) return null;

    const canvas = refs.annotation;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  };

  // Eraser: find and remove stroke near point
  const eraseAtPoint = (pageIndex, point) => {
    const pageAnnotations = annotations[pageIndex] || [];
    const threshold = 0.02; // ~2% of canvas size

    const indexToRemove = pageAnnotations.findIndex(stroke => {
      return stroke.points.some(p => {
        const dx = p.x - point.x;
        const dy = p.y - point.y;
        return Math.sqrt(dx * dx + dy * dy) < threshold;
      });
    });

    if (indexToRemove !== -1) {
      const removedStroke = pageAnnotations[indexToRemove];
      setUndoStack(prev => [...prev, { type: 'erase', pageIndex, stroke: removedStroke, index: indexToRemove }]);
      setRedoStack([]);

      setAnnotations(prev => ({
        ...prev,
        [pageIndex]: prev[pageIndex].filter((_, i) => i !== indexToRemove),
      }));
    }
  };

  // Mouse/Touch event handlers
  const handlePointerDown = (e, pageIndex) => {
    if (activeTool === TOOLS.SELECT) return;

    const coords = getEventCoords(e, pageIndex);
    if (!coords) return;

    isDrawing.current = true;

    if (activeTool === TOOLS.ERASER) {
      eraseAtPoint(pageIndex, coords);
      return;
    }

    const color = activeTool === TOOLS.HIGHLIGHT ? highlightColor : penColor;
    const width = activeTool === TOOLS.HIGHLIGHT ? penWidth * 5 : penWidth;
    const opacity = activeTool === TOOLS.HIGHLIGHT ? 0.35 : 1;

    currentStroke.current = {
      tool: activeTool,
      color,
      width,
      opacity,
      points: [coords],
      pageIndex,
    };
  };

  const handlePointerMove = (e, pageIndex) => {
    if (!isDrawing.current) return;

    const coords = getEventCoords(e, pageIndex);
    if (!coords) return;

    if (activeTool === TOOLS.ERASER) {
      eraseAtPoint(pageIndex, coords);
      return;
    }

    if (currentStroke.current && currentStroke.current.pageIndex === pageIndex) {
      currentStroke.current.points.push(coords);

      // Live preview: draw current stroke on canvas
      const refs = canvasRefs.current[pageIndex];
      if (refs?.annotation) {
        const canvas = refs.annotation;
        const ctx = canvas.getContext('2d');
        // Redraw all + current stroke
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const pageAnnotations = annotations[pageIndex] || [];
        for (const stroke of pageAnnotations) {
          drawStroke(ctx, stroke, canvas.width, canvas.height);
        }
        drawStroke(ctx, currentStroke.current, canvas.width, canvas.height);
      }
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (currentStroke.current && currentStroke.current.points.length >= 2) {
      const { pageIndex, ...strokeData } = currentStroke.current;

      setAnnotations(prev => ({
        ...prev,
        [pageIndex]: [...(prev[pageIndex] || []), strokeData],
      }));

      setUndoStack(prev => [...prev, { type: 'draw', pageIndex }]);
      setRedoStack([]);
    }

    currentStroke.current = null;
  };

  // Undo
  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    if (lastAction.type === 'draw') {
      const { pageIndex } = lastAction;
      const pageAnnotations = annotations[pageIndex] || [];
      const removedStroke = pageAnnotations[pageAnnotations.length - 1];

      setAnnotations(prev => ({
        ...prev,
        [pageIndex]: prev[pageIndex].slice(0, -1),
      }));

      setRedoStack(prev => [...prev, { type: 'draw', pageIndex, stroke: removedStroke }]);
    } else if (lastAction.type === 'erase') {
      const { pageIndex, stroke, index } = lastAction;

      setAnnotations(prev => {
        const arr = [...(prev[pageIndex] || [])];
        arr.splice(index, 0, stroke);
        return { ...prev, [pageIndex]: arr };
      });

      setRedoStack(prev => [...prev, { type: 'erase', pageIndex, stroke, index }]);
    } else if (lastAction.type === 'clear') {
      setAnnotations(lastAction.previousAnnotations);
      setRedoStack(prev => [...prev, lastAction]);
    }
  };

  // Redo
  const handleRedo = () => {
    if (redoStack.length === 0) return;

    const lastRedo = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));

    if (lastRedo.type === 'draw') {
      const { pageIndex, stroke } = lastRedo;

      setAnnotations(prev => ({
        ...prev,
        [pageIndex]: [...(prev[pageIndex] || []), stroke],
      }));

      setUndoStack(prev => [...prev, { type: 'draw', pageIndex }]);
    } else if (lastRedo.type === 'erase') {
      const { pageIndex, stroke, index } = lastRedo;

      setAnnotations(prev => ({
        ...prev,
        [pageIndex]: prev[pageIndex].filter((_, i) => i !== index),
      }));

      setUndoStack(prev => [...prev, { type: 'erase', pageIndex, stroke, index }]);
    } else if (lastRedo.type === 'clear') {
      setUndoStack(prev => [...prev, lastRedo]);
      setAnnotations({});
    }
  };

  // Clear all
  const handleClearAll = () => {
    if (Object.keys(annotations).length === 0) return;

    setUndoStack(prev => [...prev, { type: 'clear', previousAnnotations: { ...annotations } }]);
    setRedoStack([]);
    setAnnotations({});
  };

  const handleZoomIn = () => setZoom(z => Math.min(z + 20, 250));
  const handleZoomOut = () => setZoom(z => Math.max(z - 20, 50));

  // Register canvas refs for each page
  const setCanvasRef = (pageIndex, type) => (el) => {
    if (!canvasRefs.current[pageIndex]) {
      canvasRefs.current[pageIndex] = {};
    }
    canvasRefs.current[pageIndex][type] = el;
  };

  // Cursor style based on active tool
  const getCursorClass = () => {
    switch (activeTool) {
      case TOOLS.PEN: return 'pdf-annotator__page--pen';
      case TOOLS.HIGHLIGHT: return 'pdf-annotator__page--highlight';
      case TOOLS.ERASER: return 'pdf-annotator__page--eraser';
      default: return '';
    }
  };

  if (!pdfUrl) {
    return (
      <div className="pdf-upload">
        <div className="pdf-upload__icon">
          <FileText size={32} />
        </div>
        <h3 className="pdf-upload__title">Chưa có đề thi PDF</h3>
        <p className="pdf-upload__desc">
          Vui lòng quay lại trang chủ để tải đề thi lên.
        </p>
      </div>
    );
  }

  return (
    <div className="pdf-annotator">
      {/* Toolbar */}
      <div className="pdf-annotator__toolbar">
        <div className="pdf-annotator__toolbar-left">
          <FileText size={16} />
          <span className="pdf-annotator__filename">Đề thi</span>
        </div>

        <div className="pdf-annotator__toolbar-center">
          {/* Tool buttons */}
          <button
            className={`pdf-annotator__tool-btn ${activeTool === TOOLS.SELECT ? 'pdf-annotator__tool-btn--active' : ''}`}
            onClick={() => { setActiveTool(TOOLS.SELECT); setShowColorPicker(false); }}
            title="Con trỏ"
          >
            <MousePointer2 size={16} />
          </button>

          <div className="pdf-annotator__tool-separator" />

          <button
            className={`pdf-annotator__tool-btn ${activeTool === TOOLS.PEN ? 'pdf-annotator__tool-btn--active' : ''}`}
            onClick={() => {
              setActiveTool(TOOLS.PEN);
              setShowColorPicker(activeTool === TOOLS.PEN ? !showColorPicker : true);
            }}
            title="Bút vẽ"
          >
            <Pencil size={16} />
            <span className="pdf-annotator__color-dot" style={{ backgroundColor: penColor }} />
          </button>

          <button
            className={`pdf-annotator__tool-btn ${activeTool === TOOLS.HIGHLIGHT ? 'pdf-annotator__tool-btn--active' : ''}`}
            onClick={() => {
              setActiveTool(TOOLS.HIGHLIGHT);
              setShowColorPicker(activeTool === TOOLS.HIGHLIGHT ? !showColorPicker : true);
            }}
            title="Highlight"
          >
            <Highlighter size={16} />
            <span className="pdf-annotator__color-dot" style={{ backgroundColor: highlightColor }} />
          </button>

          <button
            className={`pdf-annotator__tool-btn ${activeTool === TOOLS.ERASER ? 'pdf-annotator__tool-btn--active' : ''}`}
            onClick={() => { setActiveTool(TOOLS.ERASER); setShowColorPicker(false); }}
            title="Tẩy xóa"
          >
            <Eraser size={16} />
          </button>

          <div className="pdf-annotator__tool-separator" />

          <button
            className="pdf-annotator__tool-btn"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="Hoàn tác (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>

          <button
            className="pdf-annotator__tool-btn"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Làm lại (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>

          <button
            className="pdf-annotator__tool-btn pdf-annotator__tool-btn--danger"
            onClick={handleClearAll}
            disabled={Object.keys(annotations).length === 0}
            title="Xóa tất cả"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="pdf-annotator__toolbar-right">
          <button className="pdf-annotator__zoom-btn" onClick={handleZoomOut} title="Thu nhỏ">
            <ZoomOut size={16} />
          </button>
          <span className="pdf-annotator__zoom-level">{zoom}%</span>
          <button className="pdf-annotator__zoom-btn" onClick={handleZoomIn} title="Phóng to">
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* Color/Width Picker Popover */}
      {showColorPicker && (activeTool === TOOLS.PEN || activeTool === TOOLS.HIGHLIGHT) && (
        <div className="pdf-annotator__picker">
          <div className="pdf-annotator__picker-section">
            <span className="pdf-annotator__picker-label">Màu</span>
            <div className="pdf-annotator__picker-colors">
              {(activeTool === TOOLS.HIGHLIGHT ? HIGHLIGHT_COLORS : DEFAULT_COLORS).map(color => (
                <button
                  key={color}
                  className={`pdf-annotator__picker-color ${
                    (activeTool === TOOLS.HIGHLIGHT ? highlightColor : penColor) === color
                      ? 'pdf-annotator__picker-color--active'
                      : ''
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    if (activeTool === TOOLS.HIGHLIGHT) setHighlightColor(color);
                    else setPenColor(color);
                  }}
                />
              ))}
            </div>
          </div>

          {activeTool === TOOLS.PEN && (
            <div className="pdf-annotator__picker-section">
              <span className="pdf-annotator__picker-label">Độ dày</span>
              <div className="pdf-annotator__picker-widths">
                {PEN_WIDTHS.map(w => (
                  <button
                    key={w}
                    className={`pdf-annotator__picker-width ${penWidth === w ? 'pdf-annotator__picker-width--active' : ''}`}
                    onClick={() => setPenWidth(w)}
                  >
                    <span
                      className="pdf-annotator__picker-width-dot"
                      style={{ width: w * 3, height: w * 3, backgroundColor: penColor }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PDF Pages with Annotation Overlays */}
      <div className="pdf-annotator__pages" ref={pagesContainerRef}>
        {Array.from({ length: numPages }, (_, i) => (
          <div
            key={i}
            className={`pdf-annotator__page ${getCursorClass()}`}
            style={{ touchAction: activeTool !== TOOLS.SELECT ? 'none' : 'auto' }}
            onPointerDown={(e) => handlePointerDown(e, i)}
            onPointerMove={(e) => handlePointerMove(e, i)}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <canvas
              ref={setCanvasRef(i, 'pdf')}
              className="pdf-annotator__canvas-pdf"
            />
            <canvas
              ref={setCanvasRef(i, 'annotation')}
              className="pdf-annotator__canvas-annotation"
              style={{ pointerEvents: activeTool !== TOOLS.SELECT ? 'auto' : 'none' }}
            />
            <span className="pdf-annotator__page-number">Trang {i + 1}</span>
          </div>
        ))}

        {numPages === 0 && pdfUrl && (
          <div className="pdf-annotator__loading">
            <div className="pdf-annotator__loading-spinner" />
            <p>Đang tải PDF...</p>
          </div>
        )}
      </div>
    </div>
  );
}
