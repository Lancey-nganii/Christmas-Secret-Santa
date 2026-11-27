import type { FamilyMemberAccount, NormalizedNewMemberInput } from '../../domain/models';
import type { MemberManagementGateway } from '../../domain/ports';
import { getSupabaseClient } from './client';
import { mapMemberManagementError } from './errorMapper';

interface EdgePayloadError {
  code?: string;
  message?: string;
}

export class SupabaseMemberManagementGateway implements MemberManagementGateway {
  private async invokeAction<T>(body: Record<string, unknown>): Promise<T> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('manage-member', { body });

    if (error) {
      const ctx = (
        error as {
          context?: {
            status?: number;
            json?: () => Promise<unknown>;
          };
        }
      ).context;
      const status = typeof ctx?.status === 'number' ? ctx.status : undefined;
      let payload: EdgePayloadError | undefined;
      if (ctx && typeof ctx.json === 'function') {
        try {
          payload = (await ctx.json()) as EdgePayloadError;
        } catch {
          payload = undefined;
        }
      }
      throw mapMemberManagementError(error, status, payload);
    }

    return data as T;
  }

  async listMembers(): Promise<readonly FamilyMemberAccount[]> {
    const response = await this.invokeAction<{ members?: FamilyMemberAccount[] }>({
      action: 'list_members',
    });
    return response.members ?? [];
  }

  async createMember(input: NormalizedNewMemberInput): Promise<FamilyMemberAccount> {
    const response = await this.invokeAction<{ member: FamilyMemberAccount }>({
      action: 'create_member',
      displayName: input.displayName,
      username: input.username,
      password: input.password,
    });
    return response.member;
  }

  async resetPassword(memberId: string, password: string): Promise<void> {
    await this.invokeAction<{ ok: boolean }>({
      action: 'reset_password',
      memberId,
      password,
    });
  }
}
