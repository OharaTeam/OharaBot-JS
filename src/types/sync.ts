export interface GuildMemberSyncData {
  discordId: string;
  username: string;
  globalName: string | null;
  serverNickName: string | null;
  avatarUrl: string;
  serverAvatarUrl: string | null;
  bannerUrl: string | null;
  serverBannerUrl: string | null;
  isBot: boolean;
  colorHex: string;
  rolesIds: string[];
  accountCreatedAt: string;
  joinedServerAt: string | null;
  premiumSince: string | null;
}

export type MemberSyncPayload = GuildMemberSyncData;

export interface GuildRoleSyncData {
  discordId: string;
  name: string;
  colorHex: string;
  position: number;
  permissions: string;
  isManaged: boolean;
  isMentionable: boolean;
  isHoist: boolean;
}

export type RoleSyncPayload = GuildRoleSyncData;
