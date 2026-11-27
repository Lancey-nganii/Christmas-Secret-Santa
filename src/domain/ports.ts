import type {
  FamilyMemberAccount,
  FamilyOverview,
  GiftItem,
  NormalizedGiftInput,
  NormalizedNewMemberInput,
  PickGiftResult,
  UndoPickResult,
  WishlistView,
} from './models';

export interface AuthSessionUser {
  readonly id: string;
  readonly email: string | null;
}

export interface AuthGateway {
  getCurrentUser(): Promise<AuthSessionUser | null>;
  onAuthChange(listener: (user: AuthSessionUser | null) => void): () => void;
  signInWithUsername(username: string, password: string): Promise<AuthSessionUser>;
  resumeAutoRefresh?(): void;
  signOut(): Promise<void>;
}

export interface WishlistGateway {
  getFamily(): Promise<FamilyOverview>;
  getWishlist(memberId: string): Promise<WishlistView>;
  addGift(input: NormalizedGiftInput): Promise<GiftItem>;
  updateGift(giftId: string, input: NormalizedGiftInput): Promise<GiftItem>;
  removeGift(giftId: string): Promise<void>;
  pickGift(giftId: string): Promise<PickGiftResult>;
  undoPick(pickId: string): Promise<UndoPickResult>;
}

export interface MemberManagementGateway {
  listMembers(): Promise<readonly FamilyMemberAccount[]>;
  createMember(input: NormalizedNewMemberInput): Promise<FamilyMemberAccount>;
  resetPassword(memberId: string, password: string): Promise<void>;
}

export interface AppLifecyclePort {
  isVisible(): boolean;
  isOnline(): boolean;
  onForeground(listener: () => void): () => void;
  onVisibilityChange(listener: (visible: boolean) => void): () => void;
  onOnline(listener: () => void): () => void;
}

export interface ExternalLinkPort {
  openUrl(url: string): void;
}

export interface AppServices {
  readonly auth: AuthGateway;
  readonly wishlist: WishlistGateway;
  readonly members: MemberManagementGateway;
  readonly lifecycle: AppLifecyclePort;
  readonly externalLinks: ExternalLinkPort;
  readonly isPreviewMode: boolean;
  readonly previewRouteHint?: string | null;
}
