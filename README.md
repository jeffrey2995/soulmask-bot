# Soulmask Discord Bot v3.0.0

Simple Discord bot that reads Soulmask server logs and relays them to Discord.

## Features

- ✅ Reads WS.log from volume mount
- ✅ Sends logs to Discord in real-time
- ✅ Tracks offset (doesn't re-post old logs)
- ✅ Minimal, reliable, zero dependencies (except discord.js)

## Installation

### Via Portainer

1. **Create Volume**:
   - Name: `soulmask-logs`
   - Driver: local

2. **Mount on Soulmask Server**:
   - Container: Soulmask
   - Mount: `soulmask-logs` → `/home/container/WS/Saved/Logs`

3. **Create Bot Container**:
   - Image: `node:21-alpine`
   - Volumes: `soulmask-logs` → `/logs` (read-only)
   - Env: `NODE_ENV=production`
   - Run: `npm install && npm start`

4. **Update config.json**:
   ```json
   {
     "discord": {
       "token": "YOUR_BOT_TOKEN",
       "channelId": "YOUR_CHANNEL_ID"
     },
     "logging": {
       "logFile": "/logs/WS.log",
       "checkInterval": 5000
     }
   }
   ```

### Via Docker Compose

```bash
# Set volume external first
docker volume create soulmask-logs

docker-compose up -d
```

## Configuration

Edit `config.json`:

```json
{
  "discord": {
    "token": "YOUR_DISCORD_BOT_TOKEN",
    "channelId": "YOUR_CHANNEL_ID"
  },
  "logging": {
    "logFile": "/logs/WS.log",  // Path in container
    "checkInterval": 5000        // Check every 5 seconds
  }
}
```

## Logs

Bot writes progress to stdout:
- `[INIT]` - Initialization
- `[READY]` - Connected to Discord
- `[LOG]` - Found new log lines
- `[SENT]` - Posted to Discord
- `[ERROR]` - Any errors

## Troubleshooting

### No logs appearing
- Check volume is mounted correctly: `docker inspect soulmask-logs`
- Check file exists: `ls -la /logs/WS.log`
- Check bot token is valid
- Check channel ID is correct

### Bot crashes
- Check `npm install` completed
- Check discord.js version in package.json
- Check config.json JSON is valid

## License

MIT
