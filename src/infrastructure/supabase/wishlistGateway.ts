import type {
  FamilyOverview,
  GiftItem,
  GiftStatus,
  NormalizedGiftInput,
  PickGiftResult,
  PickedGiftSummary,
  UndoPickResult,
  WishlistView,
} from '../../domain/models';
import type { WishlistGateway } from '../../domain/ports';
import { getSupabaseClient } from './client';
import { mapRpcError } from './errorMapper';

interface RawRelativeRow {
  member_id: string;
  display_name: string;
  gift_count: number;
  has_wishlist: boolean;
  picked_by_viewer: boolean;
}

interface RawFamilyPayload {
  family: { id: string; name: string };
  viewer: {
    member_id: string;
    display_name: string;
    username?: string;
    is_organizer?: boolean;
    gift_count: number;
    pick_count?: number;
  };
  relatives: RawRelativeRow[];
}

interface RawGiftRow {
  id: string;
  name: string;
  note: string | null;
  store_url: string | null;
  created_at: string;
  updated_at: string;
  status: GiftStatus;
  can_pick: boolean;
  can_edit: boolean;
  pick_id: string | null;
}

interface RawWishlistPayload {
  member_id: string;
  display_name: string;
  is_own_wishlist: boolean;
  viewer_picked_gift_id: string | null;
  gifts: RawGiftRow[];
}

interface RawPickedGiftRow {
  pick_id: string;
  picked_at: string;
  recipient_member_id: string;
  recipient_display_name: string;
  gift_id: string;
  gift_name: string;
  gift_note: string | null;
  store_url: string | null;
}

function mapGiftRow(row: RawGiftRow): GiftItem {
  return {
    id: row.id,
    name: row.name,
    note: row.note,
    storeUrl: row.store_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    canPick: row.can_pick,
    canEdit: row.can_edit,
    pickId: row.pick_id,
  };
}

export class SupabaseWishlistGateway implements WishlistGateway {
  async getFamily(): Promise<FamilyOverview> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('get_family');
    if (error) throw mapRpcError(error);

    const payload = data as RawFamilyPayload;
    return {
      family: {
        id: payload.family.id,
        name: payload.family.name,
      },
      viewer: {
        memberId: payload.viewer.member_id,
        displayName: payload.viewer.display_name,
        username: payload.viewer.username ?? '',
        isOrganizer: Boolean(payload.viewer.is_organizer),
        giftCount: payload.viewer.gift_count,
        pickCount: payload.viewer.pick_count ?? 0,
      },
      relatives: payload.relatives.map((r) => ({
        memberId: r.member_id,
        displayName: r.display_name,
        giftCount: r.gift_count,
        hasWishlist: r.has_wishlist,
        pickedByViewer: r.picked_by_viewer,
      })),
    };
  }

  async getWishlist(memberId: string): Promise<WishlistView> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('get_wishlist', {
      member_id: memberId,
    });
    if (error) throw mapRpcError(error);

    const payload = data as RawWishlistPayload;
    return {
      memberId: payload.member_id,
      displayName: payload.display_name,
      isOwnWishlist: payload.is_own_wishlist,
      viewerPickedGiftId: payload.viewer_picked_gift_id,
      gifts: payload.gifts.map(mapGiftRow),
    };
  }

  async getMyPicks(): Promise<readonly PickedGiftSummary[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('get_my_picks');
    if (error) throw mapRpcError(error);

    const payload = data as { picks?: RawPickedGiftRow[] };
    return (payload.picks ?? []).map((row) => ({
      pickId: row.pick_id,
      pickedAt: row.picked_at,
      recipientMemberId: row.recipient_member_id,
      recipientDisplayName: row.recipient_display_name,
      giftId: row.gift_id,
      giftName: row.gift_name,
      giftNote: row.gift_note,
      storeUrl: row.store_url,
    }));
  }

  async addGift(input: NormalizedGiftInput): Promise<GiftItem> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('add_gift', {
      name: input.name,
      note: input.note,
      store_url: input.storeUrl,
    });
    if (error) throw mapRpcError(error);

    const payload = data as { gift: RawGiftRow };
    return mapGiftRow(payload.gift);
  }

  async updateGift(giftId: string, input: NormalizedGiftInput): Promise<GiftItem> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('update_gift', {
      gift_id: giftId,
      name: input.name,
      note: input.note,
      store_url: input.storeUrl,
    });
    if (error) throw mapRpcError(error);

    const payload = data as { gift: RawGiftRow };
    return mapGiftRow(payload.gift);
  }

  async removeGift(giftId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('remove_gift', {
      gift_id: giftId,
    });
    if (error) throw mapRpcError(error);
  }

  async pickGift(giftId: string): Promise<PickGiftResult> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('pick_gift', {
      gift_id: giftId,
    });
    if (error) throw mapRpcError(error);

    const payload = data as {
      outcome: 'picked' | 'already_picked' | 'recipient_limit';
      idempotent?: boolean;
      pick_id?: string;
      gift_id: string;
      recipient_member_id: string;
      existing_pick_id?: string;
      existing_gift_id?: string;
    };

    if (payload.outcome === 'picked') {
      return {
        outcome: 'picked',
        idempotent: Boolean(payload.idempotent),
        pickId: payload.pick_id!,
        giftId: payload.gift_id,
        recipientMemberId: payload.recipient_member_id,
      };
    }

    if (payload.outcome === 'recipient_limit') {
      return {
        outcome: 'recipient_limit',
        giftId: payload.gift_id,
        recipientMemberId: payload.recipient_member_id,
        existingPickId: payload.existing_pick_id ?? null,
        existingGiftId: payload.existing_gift_id ?? null,
      };
    }

    return {
      outcome: 'already_picked',
      giftId: payload.gift_id,
      recipientMemberId: payload.recipient_member_id,
    };
  }

  async undoPick(pickId: string): Promise<UndoPickResult> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('undo_pick', {
      pick_id: pickId,
    });
    if (error) throw mapRpcError(error);

    const payload = data as {
      outcome: 'undone' | 'already_undone';
      pick_id: string;
      gift_id?: string;
      recipient_member_id?: string;
    };

    if (payload.outcome === 'undone') {
      return {
        outcome: 'undone',
        pickId: payload.pick_id,
        giftId: payload.gift_id!,
        recipientMemberId: payload.recipient_member_id!,
      };
    }

    return {
      outcome: 'already_undone',
      pickId: payload.pick_id,
    };
  }
}
