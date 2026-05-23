/**
 * IndexedDB service for persistent local storage of large files (PDFs)
 * and AI response caching.
 * 
 * Database: thpt_local_db
 * Object Stores:
 *   - pdfs: Stores PDF files as ArrayBuffer, keyed by exam result submittedAt
 *   - ai_cache: Stores AI responses (overall analysis + per-question), keyed by exam result submittedAt
 */

const DB_NAME = 'thpt_local_db';
const DB_VERSION = 1;
const STORE_PDFS = 'pdfs';
const STORE_AI_CACHE = 'ai_cache';

// Open or create the database
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_PDFS)) {
        db.createObjectStore(STORE_PDFS);
      }
      if (!db.objectStoreNames.contains(STORE_AI_CACHE)) {
        db.createObjectStore(STORE_AI_CACHE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ===================== PDF Storage =====================

/**
 * Save a PDF file (as ArrayBuffer) to IndexedDB.
 * @param {string} resultKey - Unique key for the exam result (e.g. submittedAt timestamp)
 * @param {ArrayBuffer} pdfArrayBuffer - The PDF file data
 * @param {string} fileName - Original file name
 */
export async function savePdf(resultKey, pdfArrayBuffer, fileName) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PDFS, 'readwrite');
    const store = tx.objectStore(STORE_PDFS);
    store.put({ data: pdfArrayBuffer, fileName, savedAt: Date.now() }, resultKey);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save PDF to IndexedDB:', err);
    return false;
  }
}

/**
 * Load a PDF file from IndexedDB and return a Blob URL.
 * @param {string} resultKey - Unique key for the exam result
 * @returns {{ url: string, fileName: string } | null}
 */
export async function loadPdf(resultKey) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PDFS, 'readonly');
    const store = tx.objectStore(STORE_PDFS);
    const request = store.get(resultKey);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        if (request.result) {
          const blob = new Blob([request.result.data], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          resolve({ url, fileName: request.result.fileName });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to load PDF from IndexedDB:', err);
    return null;
  }
}

/**
 * Delete a PDF from IndexedDB.
 * @param {string} resultKey
 */
export async function deletePdf(resultKey) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PDFS, 'readwrite');
    tx.objectStore(STORE_PDFS).delete(resultKey);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to delete PDF from IndexedDB:', err);
    return false;
  }
}

// ===================== AI Cache =====================

/**
 * Save or update AI cache for an exam result.
 * @param {string} resultKey - Unique key (submittedAt)
 * @param {object} cacheData - { overallAnalysis?: string, questions?: { [questionNumber]: string } }
 */
export async function saveAiCache(resultKey, cacheData) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_AI_CACHE, 'readwrite');
    const store = tx.objectStore(STORE_AI_CACHE);

    // Merge with existing cache
    const existing = await new Promise((resolve) => {
      const req = store.get(resultKey);
      req.onsuccess = () => resolve(req.result || {});
      req.onerror = () => resolve({});
    });

    const merged = {
      ...existing,
      ...cacheData,
      questions: { ...(existing.questions || {}), ...(cacheData.questions || {}) },
      updatedAt: Date.now(),
    };

    store.put(merged, resultKey);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save AI cache to IndexedDB:', err);
    return false;
  }
}

/**
 * Load AI cache for an exam result.
 * @param {string} resultKey
 * @returns {{ overallAnalysis?: string, questions?: { [questionNumber]: string } } | null}
 */
export async function loadAiCache(resultKey) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_AI_CACHE, 'readonly');
    const store = tx.objectStore(STORE_AI_CACHE);
    const request = store.get(resultKey);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to load AI cache from IndexedDB:', err);
    return null;
  }
}

/**
 * Delete AI cache for an exam result.
 * @param {string} resultKey
 */
export async function deleteAiCache(resultKey) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_AI_CACHE, 'readwrite');
    tx.objectStore(STORE_AI_CACHE).delete(resultKey);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to delete AI cache from IndexedDB:', err);
    return false;
  }
}
