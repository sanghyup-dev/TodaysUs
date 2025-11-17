import { ChangeEvent, useState } from 'react';
import axios from 'axios';
import './App.css';

type PresignResponse = {
  photoId: number;
  key: string;
  url: string;
};

const defaultContentType = 'application/octet-stream';

function App() {
  const [presignResponse, setPresignResponse] = useState<PresignResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

      setPresignResponse(data);
      console.log('Presign response', data);

      // Second step: upload the file directly to object storage using the presigned URL.
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

      alert('Upload completed!');
    } catch (error) {
      console.error('Upload failed', error);
      alert('Upload failed');
    } finally {
      setIsUploading(false);

      // Reset the input so the same file can be chosen again if needed.
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <main className="app">
      <h1>Photo Upload</h1>
      <label className="file-input">
        <span>{isUploading ? 'Uploading…' : 'Choose a photo'}</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </label>

      {presignResponse && (
        <div className="response">
          <h2>Latest /upload/init response</h2>
          <pre>{JSON.stringify(presignResponse, null, 2)}</pre>
        </div>
      )}
    </main>
  );
}

export default App;
