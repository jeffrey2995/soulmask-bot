const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const net = require('net');

const config = require('./config.json');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

let logOffset = 0;
let isConnected = false;
let telnetConnection = null;
let telnetBuffer = '';
let logCheckInterval = null;

// Connect to Telnet
function connectTelnet() {
  try {
    telnetConnection = net.createConnection(
      config.soulmask.telnetPort,
      config.soulmask.serverIP
    );

    telnetConnection.on('connect', () => {
      console.log('[TELNET] Connected');
    });

    telnetConnection.on('data', (data) => {
      telnetBuffer += data.toString();
      processLogs();
    });

    telnetConnection.on('error', (error) => {
      console.error('[TELNET] Error:', error.message);
    });

    telnetConnection.on('close', () => {
      console.log('[TELNET] Disconnected');
      setTimeout(connectTelnet, 5000);
    });
  } catch (error) {
    console.error('[ERROR] Telnet connect failed:', error.message);
    setTimeout(connectTelnet, 5000);
  }
}

// Process incoming logs
function processLogs() {
  const lines = telnetBuffer.split('\n');
  telnetBuffer = lines[lines.length - 1]; // Keep incomplete line

  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    sendLogToDiscord(line);
  }
}

// Send log to Discord
async function sendLogToDiscord(line) {
  if (!isConnected) return;

  try {
    const channel = client.channels.cache.get(config.discord.channelId);
    if (!channel) {
      console.error('[ERROR] Channel not found');
      return;
    }

    // Check for important events
    let color = '#808080'; // Default gray
    let title = '📝 Log';

    if (line.includes('joined')) {
      color = '#00FF00';
      title = '🟢 Player Joined';
    } else if (line.includes('left') || line.includes('disconnect')) {
      color = '#FF6B6B';
      title = '🔴 Player Left';
    } else if (line.includes('Error') || line.includes('error')) {
      color = '#FF0000';
      title = '🔴 Error';
    } else if (line.includes('Chat') || line.includes('chat')) {
      color = '#9900FF';
      title = '💬 Chat';
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(`\`\`\`${line.substring(0, 2000)}\`\`\``)
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log('[SENT]', title);
  } catch (error) {
    console.error('[ERROR] Send to Discord failed:', error.message);
  }
}

// Discord events
client.once('ready', () => {
  console.log(`[READY] Bot logged in as ${client.user.tag}`);
  isConnected = true;
  connectTelnet();
});

client.on('error', (error) => {
  console.error('[CLIENT_ERROR]', error);
});

process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] Shutting down...');
  if (telnetConnection) telnetConnection.destroy();
  if (logCheckInterval) clearInterval(logCheckInterval);
  client.destroy();
  process.exit(0);
});

// Start
console.log('[INIT] Soulmask Discord Bot v4.0.0 (Telnet)');
console.log(`[CONFIG] Telnet: ${config.soulmask.serverIP}:${config.soulmask.telnetPort}`);
console.log(`[CONFIG] Discord Channel: ${config.discord.channelId}`);

client.login(config.discord.token).catch(err => {
  console.error('[FATAL] Login failed:', err.message);
  process.exit(1);
});
