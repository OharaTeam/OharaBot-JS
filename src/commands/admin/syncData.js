const { SlashCommandBuilder } = require('discord.js');
const { checkAdmin } = require('../../functions/checkAdmin');
const { syncGuildMembers } = require('../../functions/syncDataBase');
const { syncGuildRoles } = require('../../functions/syncRoles');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
    cooldown: 300,
    data: new SlashCommandBuilder()
        .setName(isProduction ? 'sincronizar-database' : 'sincronizar-localmente')
        .setDescription(
            isProduction
                ? 'Sincronizar os dados dos membros com o banco de dados (Somente Devs).'
                : 'Sincronizar os dados dos membros localmente (Somente Devs).'
        ),
    async execute(interaction) {
        if (!(await checkAdmin(interaction))) return;
        await interaction.reply({
            content: '🔄 Iniciando sincronização de membros... Acompanhe no console.',
            ephemeral: true,
        });
        const rolesProcessed = await syncGuildRoles(interaction.guild);
        if (rolesProcessed === 0 && interaction.guild.roles.cache.size > 0) {
            interaction.editReply(
                `⚠️ Atenção: Sincronização de cargos falhou ou retornou 0. A sincronização de membros foi abortada para evitar erros.`
            );
            return 0;
        }
        const totalProcessed = await syncGuildMembers(interaction.guild);

        if (totalProcessed > 0) {
            await interaction.editReply(
                `✅ Dados de **${totalProcessed}** membros processados, ${rolesProcessed} cargos processados.`
            );
        } else {
            await interaction.editReply(`❌ Falha na sincronização. Verifique os logs.`);
        }
    },
};
