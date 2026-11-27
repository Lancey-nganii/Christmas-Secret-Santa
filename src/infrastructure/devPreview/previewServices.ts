import { AppError } from '../../domain/errors';
import type {
  FamilyMemberAccount,
  FamilyOverview,
  GiftItem,
  GiftStatus,
  NormalizedGiftInput,
  NormalizedNewMemberInput,
  PickGiftResult,
  UndoPickResult,
  WishlistView,
} from '../../domain/models';
import type {
  AppServices,
  AuthGateway,
  AuthSessionUser,
  MemberManagementGateway,
  WishlistGateway,
} from '../../domain/ports';
import { normalizeUsername, usernameToAuthEmail } from '../../domain/validation';
import { BrowserExternalLinkAdapter } from '../platform/externalLinks';
import { BrowserLifecycleAdapter } from '../platform/lifecycle';

interface StoredGift {
  id: string;
  ownerMemberId: string;
  name: string;
  note: string | null;
  storeUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StoredPick {
  id: string;
  giftId: string;
  giverMemberId: string;
  recipientMemberId: string;
}

const PREVIEW_USER: AuthSessionUser = {
  id: 'preview-auth-ana',
  email: 'ana@macorol.wishlist',
};

export function createPreviewServices(previewMode: string): AppServices {
  const viewerId = 'member-ana';
  let nextSeq = 100;

  let currentUser: AuthSessionUser | null =
    previewMode === 'signin' ? null : PREVIEW_USER;
  const authListeners = new Set<(user: AuthSessionUser | null) => void>();

  const membersList: Array<{
    id: string;
    displayName: string;
    username: string;
    isOrganizer: boolean;
  }> = [
    { id: 'member-ana', displayName: 'Ana', username: 'ana', isOrganizer: true },
    { id: 'member-mom', displayName: 'Mom', username: 'mom', isOrganizer: false },
    { id: 'member-dad', displayName: 'Dad', username: 'dad', isOrganizer: false },
    { id: 'member-marco', displayName: 'Tito Marco', username: 'tito.marco', isOrganizer: false },
    { id: 'member-sofia', displayName: 'Cousin Sofia', username: 'cousin.sofia', isOrganizer: false },
  ];

  const gifts: StoredGift[] = [
    {
      id: 'gift-ana-1',
      ownerMemberId: 'member-ana',
      name: 'Merino wool crewneck sweater',
      note: 'Size Small, warm oatmeal or forest green',
      storeUrl: 'https://example.com/merino-sweater',
      createdAt: '2026-11-20T09:00:00Z',
      updatedAt: '2026-11-20T09:00:00Z',
    },
    {
      id: 'gift-ana-2',
      ownerMemberId: 'member-ana',
      name: 'Pour-over glass coffee carafe',
      note: '600ml size for morning coffee',
      storeUrl: null,
      createdAt: '2026-11-21T10:30:00Z',
      updatedAt: '2026-11-21T10:30:00Z',
    },
    {
      id: 'gift-ana-3',
      ownerMemberId: 'member-ana',
      name: 'Linen recipe journal',
      note: 'Hardcover lay-flat binding',
      storeUrl: 'https://example.com/recipe-journal',
      createdAt: '2026-11-22T14:00:00Z',
      updatedAt: '2026-11-22T14:00:00Z',
    },
    {
      id: 'gift-mom-1',
      ownerMemberId: 'member-mom',
      name: 'Cashmere reading wrap',
      note: 'Soft camel or burgundy, one size',
      storeUrl: 'https://example.com/cashmere-wrap',
      createdAt: '2026-11-19T08:00:00Z',
      updatedAt: '2026-11-19T08:00:00Z',
    },
    {
      id: 'gift-mom-2',
      ownerMemberId: 'member-mom',
      name: 'Ceramic herb planter trio',
      note: 'Matte stoneware with drainage tray',
      storeUrl: null,
      createdAt: '2026-11-20T12:15:00Z',
      updatedAt: '2026-11-20T12:15:00Z',
    },
    {
      id: 'gift-mom-3',
      ownerMemberId: 'member-mom',
      name: 'Handcrafted wooden recipe box',
      note: 'With divider cards',
      storeUrl: 'https://example.com/recipe-box',
      createdAt: '2026-11-21T16:40:00Z',
      updatedAt: '2026-11-21T16:40:00Z',
    },
    {
      id: 'gift-dad-1',
      ownerMemberId: 'member-dad',
      name: 'Stainless travel thermos',
      note: '20 oz insulated bottle for early drives',
      storeUrl: 'https://example.com/thermos',
      createdAt: '2026-11-20T11:00:00Z',
      updatedAt: '2026-11-20T11:00:00Z',
    },
    {
      id: 'gift-dad-2',
      ownerMemberId: 'member-dad',
      name: 'Leather-bound chess pocket set',
      note: 'Magnetic pieces',
      storeUrl: null,
      createdAt: '2026-11-22T09:45:00Z',
      updatedAt: '2026-11-22T09:45:00Z',
    },
    {
      id: 'gift-marco-1',
      ownerMemberId: 'member-marco',
      name: 'Whole-bean espresso sampler',
      note: 'Medium roast',
      storeUrl: null,
      createdAt: '2026-11-23T08:20:00Z',
      updatedAt: '2026-11-23T08:20:00Z',
    },
  ];

  const picks: StoredPick[] = [
    {
      id: 'pick-ana-ana-1',
      giftId: 'gift-ana-1',
      giverMemberId: 'member-mom',
      recipientMemberId: 'member-ana',
    },
    {
      id: 'pick-mom-marco',
      giftId: 'gift-mom-1',
      giverMemberId: 'member-marco',
      recipientMemberId: 'member-mom',
    },
    {
      id: 'pick-dad-ana',
      giftId: 'gift-dad-1',
      giverMemberId: 'member-ana',
      recipientMemberId: 'member-dad',
    },
  ];

  const auth: AuthGateway = {
    async getCurrentUser() {
      return currentUser;
    },
    onAuthChange(listener) {
      authListeners.add(listener);
      return () => authListeners.delete(listener);
    },
    async signInWithUsername(username, password) {
      if (password === 'wrongpass') {
        throw new AppError(
          'INVALID_CREDENTIALS',
          'That username or password did not match. Try password 12345678 in preview mode.'
        );
      }
      const clean = normalizeUsername(username) || 'ana';
      currentUser = {
        id: PREVIEW_USER.id,
        email: usernameToAuthEmail(clean),
      };
      for (const l of authListeners) l(currentUser);
      return currentUser;
    },
    async signOut() {
      currentUser = null;
      for (const l of authListeners) l(null);
    },
  };

  function toGiftItem(g: StoredGift, isOwn: boolean, viewerPickedGiftId: string | null): GiftItem {
    const pick = picks.find((p) => p.giftId === g.id) ?? null;
    let status: GiftStatus = 'available';
    if (pick) {
      status = pick.giverMemberId === viewerId ? 'picked_by_you' : 'already_picked';
    }
    return {
      id: g.id,
      name: g.name,
      note: g.note,
      storeUrl: g.storeUrl,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      status,
      canPick: !isOwn && pick === null && viewerPickedGiftId === null,
      canEdit: isOwn && pick === null,
      pickId: pick && pick.giverMemberId === viewerId ? pick.id : null,
    };
  }

  const wishlist: WishlistGateway = {
    async getFamily(): Promise<FamilyOverview> {
      const viewer = membersList.find((m) => m.id === viewerId)!;
      const viewerGifts = gifts.filter((g) => g.ownerMemberId === viewerId);
      const relatives = membersList
        .filter((m) => m.id !== viewerId)
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map((m) => {
          const count = gifts.filter((g) => g.ownerMemberId === m.id).length;
          const pickedByViewer = picks.some(
            (p) => p.giverMemberId === viewerId && p.recipientMemberId === m.id
          );
          return {
            memberId: m.id,
            displayName: m.displayName,
            giftCount: count,
            hasWishlist: count > 0,
            pickedByViewer,
          };
        });

      return {
        family: { id: 'family-rivera', name: 'The Rivera Family' },
        viewer: {
          memberId: viewer.id,
          displayName: viewer.displayName,
          username: viewer.username,
          isOrganizer: viewer.isOrganizer,
          giftCount: viewerGifts.length,
        },
        relatives,
      };
    },

    async getWishlist(memberId: string): Promise<WishlistView> {
      const member = membersList.find((m) => m.id === memberId);
      if (!member) {
        throw new AppError('NOT_FOUND', 'Relative was not found.');
      }
      const isOwn = member.id === viewerId;
      const viewerPick = isOwn
        ? null
        : picks.find((p) => p.giverMemberId === viewerId && p.recipientMemberId === member.id) ??
          null;
      const viewerPickedGiftId = viewerPick?.giftId ?? null;

      const rows = gifts
        .filter((g) => g.ownerMemberId === member.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
        .map((g) => toGiftItem(g, isOwn, viewerPickedGiftId));

      return {
        memberId: member.id,
        displayName: member.displayName,
        isOwnWishlist: isOwn,
        viewerPickedGiftId,
        gifts: rows,
      };
    },

    async addGift(input: NormalizedGiftInput): Promise<GiftItem> {
      const now = new Date().toISOString();
      const created: StoredGift = {
        id: `gift-ana-${nextSeq++}`,
        ownerMemberId: viewerId,
        name: input.name,
        note: input.note,
        storeUrl: input.storeUrl,
        createdAt: now,
        updatedAt: now,
      };
      gifts.push(created);
      return toGiftItem(created, true, null);
    },

    async updateGift(giftId: string, input: NormalizedGiftInput): Promise<GiftItem> {
      const existing = gifts.find((g) => g.id === giftId);
      if (!existing || existing.ownerMemberId !== viewerId) {
        throw new AppError('NOT_FOUND', 'Gift was not found.');
      }
      if (picks.some((p) => p.giftId === giftId)) {
        throw new AppError(
          'GIFT_LOCKED',
          'Someone already picked this gift, so it cannot be edited.'
        );
      }
      existing.name = input.name;
      existing.note = input.note;
      existing.storeUrl = input.storeUrl;
      existing.updatedAt = new Date().toISOString();
      return toGiftItem(existing, true, null);
    },

    async removeGift(giftId: string): Promise<void> {
      const idx = gifts.findIndex((g) => g.id === giftId);
      if (idx === -1) throw new AppError('NOT_FOUND', 'Gift was not found.');
      if (picks.some((p) => p.giftId === giftId)) {
        throw new AppError(
          'GIFT_LOCKED',
          'Someone already picked this gift, so it cannot be removed.'
        );
      }
      gifts.splice(idx, 1);
    },

    async pickGift(giftId: string): Promise<PickGiftResult> {
      const target = gifts.find((g) => g.id === giftId);
      if (!target) throw new AppError('NOT_FOUND', 'Gift was not found.');
      if (target.ownerMemberId === viewerId) {
        throw new AppError('ACCESS_DENIED', 'You cannot pick a gift from your own wishlist.');
      }
      const existingOnGift = picks.find((p) => p.giftId === giftId);
      if (existingOnGift) {
        if (existingOnGift.giverMemberId === viewerId) {
          return {
            outcome: 'picked',
            idempotent: true,
            pickId: existingOnGift.id,
            giftId,
            recipientMemberId: target.ownerMemberId,
          };
        }
        return {
          outcome: 'already_picked',
          giftId,
          recipientMemberId: target.ownerMemberId,
        };
      }
      const existingForRecipient = picks.find(
        (p) => p.giverMemberId === viewerId && p.recipientMemberId === target.ownerMemberId
      );
      if (existingForRecipient) {
        return {
          outcome: 'recipient_limit',
          giftId,
          recipientMemberId: target.ownerMemberId,
          existingPickId: existingForRecipient.id,
          existingGiftId: existingForRecipient.giftId,
        };
      }
      const newPick: StoredPick = {
        id: `pick-${nextSeq++}`,
        giftId,
        giverMemberId: viewerId,
        recipientMemberId: target.ownerMemberId,
      };
      picks.push(newPick);
      return {
        outcome: 'picked',
        idempotent: false,
        pickId: newPick.id,
        giftId,
        recipientMemberId: target.ownerMemberId,
      };
    },

    async undoPick(pickId: string): Promise<UndoPickResult> {
      const idx = picks.findIndex((p) => p.id === pickId);
      if (idx === -1) {
        return { outcome: 'already_undone', pickId };
      }
      const removed = picks[idx]!;
      picks.splice(idx, 1);
      return {
        outcome: 'undone',
        pickId: removed.id,
        giftId: removed.giftId,
        recipientMemberId: removed.recipientMemberId,
      };
    },
  };

  const members: MemberManagementGateway = {
    async listMembers(): Promise<readonly FamilyMemberAccount[]> {
      return [...membersList]
        .sort(
          (a, b) =>
            Number(b.isOrganizer) - Number(a.isOrganizer) ||
            a.displayName.localeCompare(b.displayName)
        )
        .map((m) => ({
          memberId: m.id,
          displayName: m.displayName,
          username: m.username,
          isOrganizer: m.isOrganizer,
        }));
    },

    async createMember(input: NormalizedNewMemberInput): Promise<FamilyMemberAccount> {
      const normalized = normalizeUsername(input.username);
      if (membersList.some((m) => m.username.toLowerCase() === normalized)) {
        throw new AppError(
          'USERNAME_TAKEN',
          'That username is already in use. Choose a different one.'
        );
      }
      const created = {
        id: `member-${nextSeq++}`,
        displayName: input.displayName.trim(),
        username: normalized,
        isOrganizer: false,
      };
      membersList.push(created);
      return {
        memberId: created.id,
        displayName: created.displayName,
        username: created.username,
        isOrganizer: created.isOrganizer,
      };
    },

    async resetPassword(memberId: string, _password: string): Promise<void> {
      const existing = membersList.find((m) => m.id === memberId);
      if (!existing) {
        throw new AppError('NOT_FOUND', 'Family member was not found.');
      }
    },
  };

  let previewRouteHint: string | null = null;
  if (previewMode === 'my-wishlist') previewRouteHint = '/my-wishlist';
  else if (previewMode === 'add-gift') previewRouteHint = '/my-wishlist/new';
  else if (previewMode === 'relative') previewRouteHint = '/family/member-mom';
  else if (previewMode === 'manage-family') previewRouteHint = '/family/manage';
  else if (previewMode === 'family') previewRouteHint = '/family';

  return {
    auth,
    wishlist,
    members,
    lifecycle: new BrowserLifecycleAdapter(),
    externalLinks: new BrowserExternalLinkAdapter(),
    isPreviewMode: true,
    previewRouteHint,
  };
}
