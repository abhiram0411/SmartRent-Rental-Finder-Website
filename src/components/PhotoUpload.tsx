import { useState } from "react";
import { api } from "../lib/api";

export function PhotoUpload({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="photo-upload">
      <label>
        Property photos (up to 5)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy || images.length >= 5}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
              setError("Choose an image smaller than 2 MB.");
              return;
            }
            setBusy(true);
            setError("");
            try {
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () =>
                  resolve(String(reader.result).split(",")[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
              const result = await api("uploads", "POST", { base64 });
              onChange([...images, result.url]);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
              event.target.value = "";
            }
          }}
        />
      </label>
      <p className="subtle">
        JPEG, PNG, or WebP. Maximum 2 MB each. Upload only photos you have
        permission to use.
      </p>
      {busy && <p role="status">Uploading your photo…</p>}
      {error && <p role="alert">{error}</p>}
      <div className="photo-previews">
        {images.map((url, index) => (
          <div key={url}>
            <img src={url} alt={`Listing photo ${index + 1}`} />
            <button
              type="button"
              onClick={() => onChange(images.filter((item) => item !== url))}
            >
              Remove photo {index + 1}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
