import {
  ChangeEvent,
  KeyboardEvent,
  MouseEvent,
  WheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import axios from 'axios';
import './App.css';

type PresignResponse = {
  photoId: number;
  key: string;
  url: string;
};

type Photo = {
  id: number;
  name?: string | null;
  description?: string | null;
  location?: string | null;
  filename?: string | null;
  contentType?: string | null;
  createdAt?: string | null;
  imageUrl?: string | null;
  originalImageUrl?: string | null;
};

type PhotoPage = {
  content: Photo[];
  last: boolean;
  number: number;
};

const defaultContentType = 'application/octet-stream';
const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});
const MAX_ZOOM = 10;
const PAGE_SIZE = 15;

function App() {
  const userId = 1;
  const [isUploading, setIsUploading] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [isGalleryLoading, setIsGalleryLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadPhotos = useCallback(async (pageToLoad: number, append: boolean) => {
    try {
      if (pageToLoad === 0 && !append) {
        setIsGalleryLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const { data } = await axios.get<PhotoPage>(`/api/users/${userId}/photos`, {
        params: { page: pageToLoad, size: PAGE_SIZE },
      });

      setPhotos((prev) => (append ? [...prev, ...data.content] : data.content));
      setHasMore(!data.last);
      setPage(data.number);
      setGalleryError(null);
    } catch (error) {
      console.error('Failed to load photos', error);
      setGalleryError('사진 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsGalleryLoading(false);
      setIsLoadingMore(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPhotos(0, false);
  }, [loadPhotos]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isGalleryLoading && !isLoadingMore) {
          loadPhotos(page + 1, true);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, isGalleryLoading, isLoadingMore, loadPhotos, page]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isUploading) {
      return;
    }

    const contentType = file.type || defaultContentType;
    setIsUploading(true);

    try {
      const { data } = await axios.post<PresignResponse>('/api/upload/init', {
        filename: file.name,
        contentType,
        name: nameInput || null,
        location: locationInput || null,
        description: descriptionInput || null,
      });

      const putResponse = await fetch(data.url, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: file,
      });

      if (!putResponse.ok) {
        throw new Error(`Upload failed with status ${putResponse.status}`);
      }

      await axios.post(`/api/upload/${data.photoId}/complete`);

      alert('업로드가 완료됐어요!');
      await loadPhotos(0, false);
      setNameInput('');
      setLocationInput('');
      setDescriptionInput('');
      setIsUploadModalOpen(false);
    } catch (error) {
      console.error('Upload failed', error);
      alert('업로드에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsUploading(false);

      // Reset the input so the same file can be chosen again if needed.
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleDeletePhoto = async (photo: Photo) => {
    if (!photo.id || isDeleting) {
      return;
    }

    const confirmDelete = window.confirm('정말 이 사진을 삭제할까요?');
    if (!confirmDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await axios.delete(`/api/users/${userId}/photos/${photo.id}`);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Failed to delete photo', error);
      alert('사진 삭제에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyOpen = useCallback((event: KeyboardEvent<HTMLElement>, photo: Photo) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedPhoto(photo);
    }
  }, []);

  const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(1, value));

  const handleZoomChange = useCallback((delta: number) => {
    setZoom((prev) => {
      const next = clampZoom(prev + delta);
      if (next === 1) {
        setOffset({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const handleWheelZoom = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (!event.ctrlKey) {
        return;
      }
      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.2 : 0.2;
      handleZoomChange(delta);
    },
    [handleZoomChange]
  );

  const startPan = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (zoom <= 1) {
        return;
      }
      setIsPanning(true);
      panStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        offsetX: offset.x,
        offsetY: offset.y,
      };
    },
    [offset.x, offset.y, zoom]
  );

  const handlePanMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!isPanning) {
        return;
      }
      const dx = event.clientX - panStartRef.current.x;
      const dy = event.clientY - panStartRef.current.y;
      setOffset({
        x: panStartRef.current.offsetX + dx,
        y: panStartRef.current.offsetY + dy,
      });
    },
    [isPanning]
  );

  const endPan = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleDownload = useCallback(async (photo: Photo) => {
    const url = photo.originalImageUrl || photo.imageUrl;
    if (!url) {
      alert('다운로드할 원본 이미지가 없어요.');
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = photo.filename || `photo-${photo.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed', error);
      alert('다운로드에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsDownloading(false);
    }
  }, []);

  const galleryContent = useMemo(() => {
    if (isGalleryLoading) {
      return <div className="gallery-placeholder">사진을 불러오는 중입니다…</div>;
    }

    if (galleryError) {
      return <div className="gallery-placeholder error">{galleryError}</div>;
    }

    if (photos.length === 0) {
      return (
        <div className="gallery-placeholder">
          아직 업로드한 사진이 없어요. 첫 번째 추억을 업로드해 보세요!
        </div>
      );
    }

    return (
      <div className="gallery-grid">
        {photos.map((photo) => {
          const fallbackLabel = photo.name || photo.filename || `사진 #${photo.id}`;
          return (
            <article
              className="photo-card"
              key={photo.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPhoto(photo)}
              onKeyDown={(event) => handleKeyOpen(event, photo)}
            >
              {photo.imageUrl ? (
                <img src={photo.imageUrl} alt={fallbackLabel} loading="lazy" />
              ) : (
                <div className="photo-fallback">{fallbackLabel}</div>
              )}
              <div className="photo-meta">
                <div>
                  <p className="photo-title">{fallbackLabel}</p>
                  {photo.location && <p className="photo-location">{photo.location}</p>}
                </div>
                <p className="photo-date">
                  {photo.createdAt ? dateFormatter.format(new Date(photo.createdAt)) : '기록 없음'}
                </p>
              </div>
            </article>
          );
        })}
        <div ref={sentinelRef} className="sentinel" aria-hidden />
      </div>
    );
  }, [galleryError, handleKeyOpen, isGalleryLoading, photos]);

  useEffect(() => {
    resetZoom();
    setShowDescription(false);
  }, [resetZoom, selectedPhoto]);

  useEffect(() => {
    if (!selectedPhoto && !isUploadModalOpen) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';

    const handleGlobalWheel = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();
      }
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: false });

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('wheel', handleGlobalWheel);
    };
  }, [isUploadModalOpen, selectedPhoto]);

  return (
    <main className="app">
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">오늘의 우리</p>
          <h1>내 하루를 담은 사진 모음</h1>
          <div className="upload-inline">
            <span>사진 업로드 버튼을 눌러 메타데이터와 함께 업로드하세요.</span>
            <button className="primary-button" type="button" onClick={() => setIsUploadModalOpen(true)}>
              사진 업로드
            </button>
          </div>
        </div>
      </section>

      <section className="gallery-section">
        <header className="gallery-header">
          <div>
            <h2>내 사진 보관함</h2>
            <p className="gallery-subtitle">업로드된 순서대로 최신 사진이 먼저 보여요.</p>
          </div>
          <button className="ghost-button" type="button" onClick={() => loadPhotos(0, false)} disabled={isGalleryLoading}>
            새로고침
          </button>
        </header>
        {galleryContent}
        {isLoadingMore && <div className="gallery-placeholder subtle">더 불러오는 중…</div>}
      </section>

      {selectedPhoto && (
        <div className="modal-backdrop" onClick={() => setSelectedPhoto(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <button className="close-button" onClick={() => setSelectedPhoto(null)} aria-label="닫기">
              X
            </button>
            <div
              className={`modal-image-wrapper ${isPanning ? 'panning' : ''}`}
              onMouseDown={startPan}
              onMouseMove={handlePanMove}
              onMouseUp={endPan}
              onMouseLeave={endPan}
              onWheel={handleWheelZoom}
            >
              {selectedPhoto.originalImageUrl || selectedPhoto.imageUrl ? (
                <div
                  className="modal-image-inner"
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    cursor: zoom > 1 ? 'grab' : 'default',
                  }}
                >
                  <img
                    src={selectedPhoto.originalImageUrl || selectedPhoto.imageUrl || ''}
                    alt={selectedPhoto.name || selectedPhoto.filename || `사진 #${selectedPhoto.id}`}
                    draggable={false}
                  />
                </div>
              ) : (
                <div className="photo-fallback modal-fallback">
                  원본 이미지를 준비하는 중이에요.
                </div>
              )}
              <div className="zoom-controls">
                <button type="button" onClick={() => handleZoomChange(-0.2)} disabled={zoom <= 1.01}>
                  -
                </button>
                <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                <button type="button" onClick={() => handleZoomChange(0.2)} disabled={zoom >= MAX_ZOOM - 0.01}>
                  +
                </button>
              </div>
            </div>
            <div className="modal-meta">
              <div>
                <p className="photo-title">
                  {selectedPhoto.name || selectedPhoto.filename || `사진 #${selectedPhoto.id}`}
                </p>
                {selectedPhoto.location && <p className="photo-location">{selectedPhoto.location}</p>}
                <p className="photo-date">
                  {selectedPhoto.createdAt
                    ? dateFormatter.format(new Date(selectedPhoto.createdAt))
                    : '기록 없음'}
                </p>
                {selectedPhoto.description && (
                  showDescription && (
                    <p className="photo-description modal-description">{selectedPhoto.description}</p>
                  )
                )}
              </div>
              <div className="modal-actions">
                {selectedPhoto.description && (
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => setShowDescription((prev) => !prev)}
                  >
                    {showDescription ? '설명 숨기기' : '설명 보기'}
                  </button>
                )}
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => handleDownload(selectedPhoto)}
                  disabled={isDownloading || !(selectedPhoto.originalImageUrl || selectedPhoto.imageUrl)}
                >
                  {isDownloading ? '다운로드 중…' : '다운로드'}
                </button>
                <button
                  className="danger-button"
                  type="button"
                  onClick={() => handleDeletePhoto(selectedPhoto)}
                  disabled={isDeleting}
                >
                  {isDeleting ? '삭제 중…' : '삭제'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isUploadModalOpen && (
        <div className="modal-backdrop" onClick={() => !isUploading && setIsUploadModalOpen(false)}>
          <div className="modal upload-modal" onClick={(event) => event.stopPropagation()}>
            <button
              className="close-button"
              onClick={() => setIsUploadModalOpen(false)}
              aria-label="닫기"
              disabled={isUploading}
            >
              X
            </button>
            <div className="upload-modal-body">
              <h3>새 사진 업로드</h3>
              <p className="upload-helper">파일을 선택하면 즉시 업로드가 시작돼요.</p>
              <div className="upload-fields">
                <label className="field">
                  <span>이름</span>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="사진 이름을 입력하세요 (선택)"
                    disabled={isUploading}
                  />
                </label>
                <label className="field">
                  <span>위치</span>
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder="어디서 찍었나요? (선택)"
                    disabled={isUploading}
                  />
                </label>
              </div>
              <label className="field">
                <span>설명</span>
                <textarea
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder="간단한 설명을 적어보세요 (선택)"
                  rows={3}
                  disabled={isUploading}
                />
              </label>
              <div className="upload-modal-actions">
                <label className={`file-input ${isUploading ? 'disabled' : ''}`}>
                  <span>{isUploading ? '업로드 중…' : '파일 선택 후 업로드'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                </label>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isUploading}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
