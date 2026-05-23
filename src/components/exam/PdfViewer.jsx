import { useState, useRef, useMemo } from 'react';
import { Upload, FileText, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import './PdfViewer.css';

/**
 * PDF Viewer using <iframe> for uploaded PDF files.
 * Accepts an optional initialPdfUrl prop for pre-loaded PDFs (e.g. from IndexedDB cache).
 * Falls back to sessionStorage for backward compatibility.
 */
export default function PdfViewer({ examId, initialPdfUrl }) {
  const [pdfUrl, setPdfUrl] = useState(() => {
    return initialPdfUrl || sessionStorage.getItem('current_pdf') || null;
  });
  const [zoom, setZoom] = useState(100);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 20, 200));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 20, 50));

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
    <div className="pdf-viewer">
      <div className="pdf-viewer__toolbar">
        <div className="pdf-viewer__toolbar-left">
          <FileText size={16} />
          <span className="pdf-viewer__filename">Đề thi</span>
        </div>
        <div className="pdf-viewer__toolbar-right">
          <button className="pdf-viewer__zoom-btn" onClick={handleZoomOut} title="Thu nhỏ">
            <ZoomOut size={16} />
          </button>
          <span className="pdf-viewer__zoom-level">{zoom}%</span>
          <button className="pdf-viewer__zoom-btn" onClick={handleZoomIn} title="Phóng to">
            <ZoomIn size={16} />
          </button>
        </div>
      </div>
      <div className="pdf-viewer__frame-wrap">
        <iframe
          src={`${pdfUrl}#toolbar=0&navpanes=0&zoom=${zoom}`}
          className="pdf-viewer__frame"
          title="Đề thi PDF"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    </div>
  );
}
