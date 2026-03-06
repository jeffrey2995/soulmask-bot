const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const config = require('./config.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let logOffset = 0;
let isConnected = false;
let logCheckInterval = null;
const offsetFile = path.join(__dirname, '.log-offset');

// Load offset
function loadOffset() {
  try {
    if (fs.existsSync(offsetFile)) {
      logOffset = parseInt(fs.readFileSync(offsetFile, 'utf8')) || 0;
      console.log(`[INIT] Loaded offset: ${logOffset}`);
    }
  } catch (err) {
    logOffset = 0;
  }
}

// Save offset
function saveOffset() {
  try {
    fs.writeFileSync(offsetFile, logOffset.toString());
  } catch (err) {
    console.error('[ERROR] Failed to save offset:', err.message);
  }
}

// Read logs from file
function fetchLogs() {
  try {
    const logPath = config.logging.logFile;
    
    if (!fs.existsSync(logPath)) {
      console.log(`[WARN] Log file not found: ${logPath}`);
      return '';
    }

    return fs.readFileSync(logPath, 'utf8');
  } catch (error) {
    console.error('[ERROR] Failed to fetch logs:', error.message);
    return '';
  }
}

// Check for new logs
async function checkLogs() {
  try {
    const fullLog = fetchLogs();
    const lines = fullLog.split('\n').filter(line => line.trim());

    // Get new lines since last offset
    const newLines = lines.slice(logOffset);

    if (newLines.length > 0) {
      console.log(`[LOG] Found ${newLines.length} new line(s)`);

      for (const line of newLines) {
        // Send to Discord
        try {
          const channel = client.channels.cache.get(config.discord.channelId);
          if (channel) {
            // Split long lines
            const chunks = line.match(/.{1,2000}/g) || [];
            for (const chunk of chunks) {
              const embed = new EmbedBuilder()
                .setColor('#0099FF')
                .setDescription(`\`\`\`${chunk}\`\`\``)
                .setTimestamp();
              await channel.send({ embeds: [embed] });
            }
            console.log('[SENT] Log line to Discord');
          }
        } catch (err) {
          console.error('[ERROR] Failed to send log:', err.message);
        }

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update offset
      logOffset = lines.length;
      saveOffset();
    }
  } catch (error) {
    console.error('[ERROR] Log check failed:', error.message);
  }
}

// Discord events
client.once('ready', () => {
  console.log(`[READY] Bot logged in as ${client.user.tag}`);
  isConnected = true;

  if (!logCheckInterval) {
    console.log(`[START] Log checking every ${config.logging.checkInterval}ms`);
    logCheckInterval = setInterval(checkLogs, config.logging.checkInterval);
  }
});

client.on('error', (error) => {
  console.error('[ERROR]', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] Shutting down...');
  if (logCheckInterval) clearInterval(logCheckInterval);
  saveOffset();
  client.destroy();
  process.exit(0);
});

// Start
console.log('[INIT] Soulmask Discord Bot v3.0.0');
console.log(`[CONFIG] Log File: ${config.logging.logFile}`);
console.log(`[CONFIG] Check Interval: ${config.logging.checkInterval}ms`);
console.log(`[CONFIG] Discord Channel: ${config.discord.channelId}`);

loadOffset();

client.login(config.discord.token).catch(err => {
  console.error('[FATAL] Login failed:', err.message);
  process.exit(1);
});
