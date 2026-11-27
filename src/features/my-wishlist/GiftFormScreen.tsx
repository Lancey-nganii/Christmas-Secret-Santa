import { ArrowLeft, Save } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useServices } from '../../application/ServiceContext';
import { AppError } from '../../domain/errors';
import type { GiftItem } from '../../domain/models';
import { validateGiftDraft } from '../../domain/validation';
import { Button } from '../../ui/components/Button';
import { NoticeBanner } from '../../ui/components/NoticeBanner';
import { TextAreaField, TextField } from '../../ui/components/TextField';

interface GiftFormScreenProps {
  existingGift: GiftItem | null;
  onSaved: (message: string, savedGift: GiftItem) => Promise<void> | void;
  onCancel: () => void;
}

export function GiftFormScreen({
  existingGift,
  onSaved,
  onCancel,
}: GiftFormScreenProps) {
  const { wishlist } = useServices();
  const isEditing = existingGift !== null;

  const [name, setName] = useState(existingGift?.name ?? '');
  const [note, setNote] = useState(existingGift?.note ?? '');
  const [storeUrl, setStoreUrl] = useState(existingGift?.storeUrl ?? '');
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setSubmitError(null);

    const validation = validateGiftDraft({ name, note, storeUrl });
    if (!validation.ok || !validation.value) {
      setFieldErrors(validation.fieldErrors);
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && existingGift) {
        const updated = await wishlist.updateGift(existingGift.id, validation.value);
        await onSaved(`Updated "${validation.value.name}".`, updated);
      } else {
        const created = await wishlist.addGift(validation.value);
        await onSaved(`Added "${validation.value.name}" to your wishlist.`, created);
      }
    } catch (err) {
      setSubmitError(
        err instanceof AppError
          ? err.message
          : 'Could not save this gift right now. Check your connection and try again.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="section-stack" aria-labelledby="gift-form-heading">
      <div>
        <Button variant="secondary" compact onClick={onCancel} disabled={isSaving}>
          <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
          <span>Back to My Wishlist</span>
        </Button>
      </div>

      <div className="surface-card">
        <div className="section-stack">
          <div className="section-intro">
            <h2 id="gift-form-heading" className="section-heading">
              {isEditing ? 'Edit gift' : 'Add a gift'}
            </h2>
            <p className="section-lead">
              {isEditing
                ? 'Update the details below while this gift is still available.'
                : 'Share what you would love to receive, plus any helpful size or color notes.'}
            </p>
          </div>

          {submitError ? <NoticeBanner tone="error" message={submitError} /> : null}

          <form className="form-stack" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Gift name"
              type="text"
              required
              maxLength={160}
              placeholder="e.g. Wool scarf in forest green"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) {
                  setFieldErrors((prev) => ({ ...prev, name: '' }));
                }
              }}
              error={fieldErrors.name || null}
              disabled={isSaving}
            />

            <TextAreaField
              label="Note"
              optionalLabel="Optional"
              maxLength={500}
              placeholder="Size, preferred color, author, or helpful details"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (fieldErrors.note) {
                  setFieldErrors((prev) => ({ ...prev, note: '' }));
                }
              }}
              error={fieldErrors.note || null}
              disabled={isSaving}
            />

            <TextField
              label="Store link"
              optionalLabel="Optional"
              type="url"
              inputMode="url"
              maxLength={2048}
              placeholder="https://example.com/item"
              value={storeUrl}
              onChange={(e) => {
                setStoreUrl(e.target.value);
                if (fieldErrors.storeUrl) {
                  setFieldErrors((prev) => ({ ...prev, storeUrl: '' }));
                }
              }}
              error={fieldErrors.storeUrl || null}
              hint="Must start with https:// or http://"
              disabled={isSaving}
            />

            <div className="gift-button-group">
              <Button type="submit" disabled={isSaving} data-primary-action>
                <Save size={17} strokeWidth={2} aria-hidden="true" />
                <span>{isSaving ? 'Saving…' : 'Save gift'}</span>
              </Button>
              <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
