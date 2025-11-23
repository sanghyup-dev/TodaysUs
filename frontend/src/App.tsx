import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
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
};

const defaultContentType = 'application/octet-stream';
const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

function App() {
  const [isUploading, setIsUploading] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [isGalleryLoading, setIsGalleryLoading] = useState(true);

  const fetchPhotos = useCallback(async () => {
    try {
      setIsGalleryLoading(true);
      const { data } = await axios.get<Photo[]>('/api/users/1/photos');
      setPhotos(data);
      setGalleryError(null);
    } catch (error) {
      console.error('Failed to load photos', error);
      setGalleryError('사진 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsGalleryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

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

      alert('업로드가 완료됐어요!');
      await fetchPhotos();
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
            <article className="photo-card" key={photo.id}>
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
                {photo.description && <p className="photo-description">{photo.description}</p>}
              </div>
            </article>
          );
        })}
      </div>
    );
  }, [galleryError, isGalleryLoading, photos]);

  return (
    <main className="app">
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">오늘의 우리</p>
          <h1>내 하루를 담은 사진 모음</h1>
          <p className="subtitle">
            추억을 업로드하면 자동으로 정리돼요. userId=1에 해당하는 모든 사진을 한눈에 모아볼 수 있어요.
          </p>
        </div>
        <label className={`file-input ${isUploading ? 'disabled' : ''}`}>
          <span>{isUploading ? '업로드 중…' : '사진 업로드'}</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      </section>

      <section className="gallery-section">
        <header className="gallery-header">
          <div>
            <h2>내 사진 보관함</h2>
            <p className="gallery-subtitle">업로드된 순서대로 최신 사진이 먼저 보여요.</p>
          </div>
          <button className="ghost-button" type="button" onClick={fetchPhotos} disabled={isGalleryLoading}>
            새로고침
          </button>
        </header>
        {galleryContent}
      </section>
    </main>
  );
}

export default App;
