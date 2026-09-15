require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

// --- 1. EXPRESS WEB SERVER SETUP ---
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoint for the Web Dashboard
app.get('/api/status', (req, res) => {
  res.json({
    status: discordClient.user ? 'Online' : 'Initializing',
    botName: discordClient.user ? discordClient.user.tag : 'ShadowBot',
    ping: `${discordClient.ws.ping || 0}ms`,
    guildsCount: discordClient.guilds.cache.size || 0,
    serverIp: 'play.shadowsmp.net'
  });
});

// Admin Command Execution API Bridge from Panel
app.post('/api/execute-cmd', (req, res) => {
  const { command, user, role } = req.body;
  
  if (!['admin', 'founder'].includes(role)) {
    return res.status(403).json({ success: false, message: 'Unauthorized role level.' });
  }

  console.log(`[RCON EXECUTION] User: ${user} (${role}) executed: ${command}`);
  
  // Send log to Discord staff channel if configured
  const alertChannelId = process.env.DISCORD_STAFF_CHANNEL_ID;
  if (alertChannelId && discordClient.channels.cache.has(alertChannelId)) {
    discordClient.channels.cache.get(alertChannelId).send(
      `🛡️ **Panel Execution Alert**\n**User:** \`${user}\` (${role.toUpperCase()})\n**Command:** \`/${command}\``
    );
  }

  res.json({ success: true, message: `Command /${command} queued to server.` });
});

app.listen(PORT, () => {
  console.log(`🌐 Web Dashboard & API live on port ${PORT}`);
});

// --- 2. DISCORD BOT CLIENT SETUP ---
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const commands = [
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Displays live status of the ShadowSMP Network'),
  new SlashCommandBuilder()
    .setName('ip')
    .setDescription('Get the official ShadowSMP server address')
].map(cmd => cmd.toJSON());

discordClient.once('ready', async () => {
  console.log(`🤖 Discord Bot logged in as ${discordClient.user.tag}`);

  const TOKEN = process.env.DISCORD_TOKEN;
  if (TOKEN) {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
      await rest.put(
        Routes.applicationCommands(discordClient.user.id),
        { body: commands }
      );
      console.log('✅ Application Slash Commands registered.');
    } catch (err) {
      console.error('❌ Failed to register slash commands:', err);
    }
  }
});

discordClient.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'status') {
    await interaction.reply({
      content: `🌑 **ShadowSMP Network Status**\n• Status: **ONLINE**\n• Server IP: \`play.shadowsmp.net\`\n• Bot Latency: **${discordClient.ws.ping}ms**`,
      ephemeral: true
    });
  }

  if (interaction.commandName === 'ip') {
    await interaction.reply({
      content: `🎮 Connect to ShadowSMP using IP: \`play.shadowsmp.net\``,
      ephemeral: true
    });
  }
});

// Login Bot
if (process.env.DISCORD_TOKEN) {
  discordClient.login(process.env.DISCORD_TOKEN);
} else {
  console.warn('⚠️ DISCORD_TOKEN missing in .env. Bot features running in offline mode.');
}