import { Events, type GuildMember, type PartialGuildMember } from 'discord.js';
import logger from '@/utils/logger';
import { getErrorMessage } from '@/utils/errors';
import { syncSingleMember } from '@/functions/syncDataBase';
import type { Event } from '@/types/events';

const event: Event<Events.GuildMemberUpdate> = {
  name: Events.GuildMemberUpdate,
  once: false,
  async execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember): Promise<void> {
    if (newMember.guild.id !== process.env.OHARA_ID) return;
    if (newMember.user.bot) return;
    if (!oldMember.pending || newMember.pending) return;

    const kaizokuRoleId = process.env.KAIZOKU_ROLE_ID?.trim();
    if (!kaizokuRoleId) {
      logger.error('❌ KAIZOKU_ROLE_ID não definido nas variáveis de ambiente.');
      return;
    }

    let updatedMember = newMember;
    if (!newMember.roles.cache.has(kaizokuRoleId)) {
      try {
        updatedMember = await newMember.roles.add(kaizokuRoleId, 'Onboarding concluído (aceite de regras)');
        logger.info(`✅ Cargo Kaizoku (${kaizokuRoleId}) concedido para ${newMember.user.tag} (${newMember.id}).`);
      } catch (error) {
        logger.error(`❌ Erro ao conceder cargo Kaizoku para ${newMember.user.tag}: ${getErrorMessage(error)}`);
        return;
      }
    } else {
      logger.debug(`ℹ️ Membro ${newMember.user.tag} já possui o cargo Kaizoku (${kaizokuRoleId}).`);
    }

    try {
      await syncSingleMember(updatedMember);
      logger.info(`✅ Membro ${updatedMember.user.tag} sincronizado com a API Ohara após onboarding.`);
    } catch (error) {
      logger.warn(
        `⚠️ Cargo Kaizoku mantido para ${updatedMember.user.tag}, mas falhou a sincronização em tempo real com a API: ${getErrorMessage(error)}`
      );
    }
  },
};

export default event;
