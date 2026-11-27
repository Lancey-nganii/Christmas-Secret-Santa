import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../src/app/App';
import { AppError } from '../src/domain/errors';
import { createPreviewServices } from '../src/infrastructure/devPreview/previewServices';

describe('Family Christmas Wishlist UI flows', () => {
  it('supports username + password sign-in, visibility toggle, and plain-language errors', async () => {
    const user = userEvent.setup();
    const services = createPreviewServices('signin');
    render(<App services={services} />);

    const usernameInput = await screen.findByLabelText(/^username$/i);
    const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;

    expect(passwordInput.type).toBe('password');
    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordInput.type).toBe('text');
    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput.type).toBe('password');

    await user.type(usernameInput, 'Ana');
    await user.type(passwordInput, 'wrongpass');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/did not match/i);

    await user.clear(passwordInput);
    await user.type(passwordInput, '12345678');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByRole('heading', { name: /the rivera family/i })).toBeInTheDocument();
  });

  it('lets the family organizer add a new relative and reset passwords in Manage family', async () => {
    const user = userEvent.setup();
    const services = createPreviewServices('family');
    render(<App services={services} />);

    await user.click(await screen.findByRole('button', { name: /manage family/i }));
    expect(await screen.findByRole('heading', { name: /manage family/i })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/display name/i);
    const usernameInput = screen.getByLabelText(/^username$/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/initial password/i);

    await user.type(nameInput, 'Tito Ben');
    expect(usernameInput.value).toBe('tito.ben');

    await user.type(passwordInput, '12345678');
    await user.click(screen.getByRole('button', { name: /add family member/i }));

    expect(
      await screen.findByText(/added tito ben \(username: tito\.ben\)/i)
    ).toBeInTheDocument();

    const resetBtn = await screen.findByRole('button', {
      name: /reset password for tito ben/i,
    });
    await user.click(resetBtn);

    await user.type(screen.getByLabelText(/new password for tito ben/i), '87654321');
    await user.click(screen.getByRole('button', { name: /save password/i }));

    expect(
      await screen.findByText(/updated the password for tito ben/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to family/i }));
    expect(await screen.findByText('Tito Ben')).toBeInTheDocument();
  });

  it('shows Family list with Wishlist coming soon, and enforces one-pick-per-recipient + Undo', async () => {
    const user = userEvent.setup();
    const services = createPreviewServices('family');
    render(<App services={services} />);

    expect(await screen.findByText('Cousin Sofia')).toBeInTheDocument();
    expect(screen.getByText('Wishlist coming soon')).toBeInTheDocument();

    // Open Mom's wishlist (Mom has 1 already_picked by Marco + 2 available)
    await user.click(screen.getByRole('button', { name: /mom/i }));

    expect(await screen.findByRole('heading', { name: /mom’s wishlist/i })).toBeInTheDocument();
    expect(screen.getByText('Already picked')).toBeInTheDocument();

    const pickButtons = screen.getAllByRole('button', { name: /i’ll buy this/i });
    expect(pickButtons).toHaveLength(2);

    await user.click(pickButtons[0]!);

    expect(
      await screen.findByText(/you already picked a gift for mom/i)
    ).toBeInTheDocument();
    expect(screen.getByText('You picked this')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /i’ll buy this/i })).not.toBeInTheDocument();

    // Undo restores picking actions
    await user.click(screen.getByRole('button', { name: /^undo$/i }));
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /i’ll buy this/i })).toHaveLength(2);
    });
  });

  it('shows locked picked items and lets owner add, edit, and remove unpicked gifts on My Wishlist', async () => {
    const user = userEvent.setup();
    const services = createPreviewServices('my-wishlist');
    render(<App services={services} />);

    expect(await screen.findByRole('heading', { name: /my wishlist/i })).toBeInTheDocument();
    // Ana's first gift is picked by Mom, so it displays Already picked and has no Edit/Remove
    expect(await screen.findByText('Already picked')).toBeInTheDocument();
    expect(screen.getByText(/locked while a family member has this gift picked/i)).toBeInTheDocument();

    // Add a new gift
    await user.click(screen.getByRole('button', { name: /add a gift/i }));
    await user.type(await screen.findByLabelText(/gift name/i), 'Warm Alpaca Socks');
    await user.type(screen.getByLabelText(/^note/i), 'Size Medium');
    await user.type(screen.getByLabelText(/store link/i), 'https://example.com/socks');
    await user.click(screen.getByRole('button', { name: /save gift/i }));

    expect(await screen.findByText('Warm Alpaca Socks')).toBeInTheDocument();

    // Edit the newly added unpicked gift
    const editButtons = screen.getAllByRole('button', { name: /^edit$/i });
    await user.click(editButtons[editButtons.length - 1]!);
    const giftNameInput = await screen.findByLabelText(/gift name/i);
    await user.clear(giftNameInput);
    await user.type(giftNameInput, 'Merino Hiking Socks');
    await user.click(screen.getByRole('button', { name: /save gift/i }));

    expect(await screen.findByText('Merino Hiking Socks')).toBeInTheDocument();

    // Remove an unpicked gift via inline two-step confirmation
    const removeButtons = screen.getAllByRole('button', { name: /^remove$/i });
    await user.click(removeButtons[removeButtons.length - 1]!);
    await user.click(screen.getByRole('button', { name: /confirm remove/i }));

    await waitFor(() => {
      expect(screen.queryByText('Merino Hiking Socks')).not.toBeInTheDocument();
    });
  });

  it('shows conflict feedback and refreshes when another relative picks a gift first', async () => {
    const user = userEvent.setup();
    const base = createPreviewServices('family');
    const raceServices = {
      ...base,
      wishlist: {
        ...base.wishlist,
        async pickGift(giftId: string) {
          // Simulate another relative winning the race right before Ana taps
          return {
            outcome: 'already_picked' as const,
            giftId,
            recipientMemberId: 'member-mom',
          };
        },
      },
    };

    render(<App services={raceServices} />);
    await user.click(await screen.findByRole('button', { name: /mom/i }));
    const pickButtons = await screen.findAllByRole('button', { name: /i’ll buy this/i });
    await user.click(pickButtons[0]!);

    expect(await screen.findByRole('alert')).toHaveTextContent(/just picked by another relative/i);
  });

  it('denies access cleanly when signed-in account is missing from family roster', async () => {
    const base = createPreviewServices('family');
    const deniedServices = {
      ...base,
      wishlist: {
        ...base.wishlist,
        async getFamily() {
          throw new AppError(
            'ACCESS_DENIED',
            'This account is not listed on the family roster yet.'
          );
        },
      },
    };

    render(<App services={deniedServices} />);

    expect(
      await screen.findByRole('heading', { name: /account not found on family roster/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign out and try another username/i })
    ).toBeInTheDocument();
  });

  it('shows a readable fallback card instead of a blank screen on startup errors', async () => {
    const base = createPreviewServices('family');
    const brokenServices = {
      ...base,
      auth: {
        ...base.auth,
        onAuthChange() {
          throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY environment variables.');
        },
      },
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(<App services={brokenServices} />);
      expect(
        await screen.findByRole('heading', { name: /unable to start family christmas wishlist/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/VITE_SUPABASE_URL/i);
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
