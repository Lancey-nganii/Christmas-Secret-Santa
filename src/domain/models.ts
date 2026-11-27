export type GiftStatus = 'available' | 'picked_by_you' | 'already_picked';

export interface FamilySummary {
  readonly id: string;
  readonly name: string;
}

export interface ViewerProfile {
  readonly memberId: string;
  readonly displayName: string;
  readonly username: string;
  readonly isOrganizer: boolean;
  readonly giftCount: number;
}

export interface FamilyMemberAccount {
  readonly memberId: string;
  readonly displayName: string;
  readonly username: string;
  readonly isOrganizer: boolean;
}

export interface NewMemberDraft {
  readonly displayName: string;
  readonly username: string;
  readonly password: string;
}

export interface NormalizedNewMemberInput {
  readonly displayName: string;
  readonly username: string;
  readonly password: string;
}

export interface RelativeSummary {
  readonly memberId: string;
  readonly displayName: string;
  readonly giftCount: number;
  readonly hasWishlist: boolean;
  readonly pickedByViewer: boolean;
}

export interface FamilyOverview {
  readonly family: FamilySummary;
  readonly viewer: ViewerProfile;
  readonly relatives: readonly RelativeSummary[];
}

export interface GiftItem {
  readonly id: string;
  readonly name: string;
  readonly note: string | null;
  readonly storeUrl: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly status: GiftStatus;
  readonly canPick: boolean;
  readonly canEdit: boolean;
  readonly pickId: string | null;
}

export interface WishlistView {
  readonly memberId: string;
  readonly displayName: string;
  readonly isOwnWishlist: boolean;
  readonly viewerPickedGiftId: string | null;
  readonly gifts: readonly GiftItem[];
}

export interface GiftDraft {
  readonly name: string;
  readonly note: string;
  readonly storeUrl: string;
}

export interface NormalizedGiftInput {
  readonly name: string;
  readonly note: string | null;
  readonly storeUrl: string | null;
}

export type PickGiftResult =
  | {
      readonly outcome: 'picked';
      readonly idempotent: boolean;
      readonly pickId: string;
      readonly giftId: string;
      readonly recipientMemberId: string;
    }
  | {
      readonly outcome: 'already_picked';
      readonly giftId: string;
      readonly recipientMemberId: string;
    }
  | {
      readonly outcome: 'recipient_limit';
      readonly giftId: string;
      readonly recipientMemberId: string;
      readonly existingPickId: string | null;
      readonly existingGiftId: string | null;
    };

export type UndoPickResult =
  | {
      readonly outcome: 'undone';
      readonly pickId: string;
      readonly giftId: string;
      readonly recipientMemberId: string;
    }
  | {
      readonly outcome: 'already_undone';
      readonly pickId: string;
    };
