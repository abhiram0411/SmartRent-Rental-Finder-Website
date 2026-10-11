import { useState } from "react";
import type { Property } from "../types";
import { api } from "../lib/api";
import { Modal } from "./Modal";
import { PhotoUpload } from "./PhotoUpload";
export function Editor({
  property,
  onClose,
  onSaved,
}: {
  property?: Property;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [images, setImages] = useState<string[]>(property?.images || []);
  return (
    <Modal
      title={property ? "Edit your property" : "A new home to discover"}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const form = new FormData(e.currentTarget);
          try {
            const input = {
              title: String(form.get("title")),
              city: String(form.get("city")),
              locality: String(form.get("locality")),
              rent: Number(form.get("rent")),
              bedrooms: Number(form.get("bedrooms")),
              area: Number(form.get("area")),
              furnishing: String(form.get("furnishing")),
              description: String(form.get("description")),
              images,
            };
            await api(
              property ? `properties/${property.id}` : "properties",
              property ? "PUT" : "POST",
              input,
            );
            onSaved();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Listing title
          <input
            name="title"
            defaultValue={property?.title}
            required
            minLength={5}
            maxLength={100}
          />
        </label>
        <div className="form-grid">
          <label>
            City
            <input
              name="city"
              defaultValue={property?.city}
              required
              minLength={2}
              maxLength={60}
            />
          </label>
          <label>
            Neighbourhood
            <input
              name="locality"
              defaultValue={property?.locality}
              required
              minLength={2}
              maxLength={80}
            />
          </label>
          <label>
            Monthly rent (₹)
            <input
              name="rent"
              type="number"
              defaultValue={property?.rent}
              required
              min={1000}
              max={1000000}
            />
          </label>
          <label>
            Bedrooms
            <input
              name="bedrooms"
              type="number"
              defaultValue={property?.bedrooms || 1}
              required
              min={1}
              max={10}
            />
          </label>
          <label>
            Area (sq ft)
            <input
              name="area"
              type="number"
              defaultValue={property?.area}
              required
              min={100}
              max={50000}
            />
          </label>
          <label>
            Furnishing
            <select name="furnishing" defaultValue={property?.furnishing}>
              {["Unfurnished", "Semi-furnished", "Furnished"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Description
          <textarea
            name="description"
            defaultValue={property?.description}
            required
            minLength={30}
            maxLength={3000}
          />
        </label>
        <PhotoUpload images={images} onChange={setImages} />
        {error && <p role="alert">{error}</p>}
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : "Save property"}
        </button>
        {property && (
          <button
            type="button"
            className="danger"
            onClick={async () => {
              if (
                !window.confirm(
                  "Delete this property and its associated enquiries?",
                )
              )
                return;
              try {
                await api(`properties/${property.id}`, "DELETE");
                onSaved();
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >
            Delete property
          </button>
        )}
      </form>
    </Modal>
  );
}
