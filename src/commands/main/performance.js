const performanceMonitor = require('../../lib/performance-monitor');
const { isOwnerOrGroupAdmin } = require('../../lib/permissions');

module.exports = {
  name: 'performance',
  description: 'Show bot performance metrics (Admin only)',
  usage: '.performance [summary|full|export]',
  async execute(sock, msg, args) {
    try {
      const isUserAdmin = await isOwnerOrGroupAdmin(sock, msg, msg.key.remoteJid);

      if (!isUserAdmin) {
        return sock.sendMessage(msg.key.remoteJid, {
          text: '❌ This command is only available for the owner or group admins.'
        }, { quoted: msg });
      }

      const action = args[0] || 'summary';

      switch (action.toLowerCase()) {
        case 'summary':
          const summary = performanceMonitor.getSummary();
          const summaryText = `🔧 *Bot Performance Summary*

⏱️ Uptime: ${summary.uptime}
📨 Messages: ${summary.messages}
⚡ Commands: ${summary.commands}
❌ Errors: ${summary.errors}
🚀 Avg Response: ${summary.avgResponseTime}
💾 Memory Used: ${summary.memoryUsed}
📊 Cache Hit Rate: ${summary.cacheHitRate}
🌐 API Cache Hit Rate: ${summary.apiCacheHitRate}`;

          await sock.sendMessage(msg.key.remoteJid, { text: summaryText }, { quoted: msg });
          break;

        case 'full':
          const report = performanceMonitor.getReport();
          const fullText = `🔧 *Detailed Performance Report*

*System Info:*
• Platform: ${report.system.platform} ${report.system.arch}
• Node.js: ${report.system.nodeVersion}
• CPU Cores: ${report.system.cpuCount}
• Total RAM: ${report.system.totalMemory}
• Free RAM: ${report.system.freeMemory}

*Bot Metrics:*
• Uptime: ${report.bot.uptime}
• Messages: ${report.bot.messagesProcessed}
• Commands: ${report.bot.commandsExecuted}
• Errors: ${report.bot.errorsOccurred}
• Avg Response: ${report.bot.avgResponseTime}
• Messages/Hour: ${report.bot.messagesPerHour}
• Commands/Hour: ${report.bot.commandsPerHour}

*Memory Usage:*
• RSS: ${report.memory.rss}
• Heap Used: ${report.memory.heapUsed}
• Heap Total: ${report.memory.heapTotal}
• External: ${report.memory.external}

*Cache Performance:*
• Hit Rate: ${report.cache.hitRate}
• Cache Size: ${report.cache.cacheSize}
• API Cache Size: ${report.cache.apiCacheSize}
• Pending Writes: ${report.cache.pendingWrites}

*API Performance:*
• Total Requests: ${report.api.totalRequests}
• Cached Responses: ${report.api.cachedResponses}
• Cache Hit Rate: ${report.api.cacheHitRate}
• Failed Requests: ${report.api.failedRequests}`;

          await sock.sendMessage(msg.key.remoteJid, { text: fullText }, { quoted: msg });
          break;

        case 'alerts':
          const alerts = performanceMonitor.checkAlerts();
          if (alerts.length === 0) {
            await sock.sendMessage(msg.key.remoteJid, { 
              text: '✅ *Performance Status: All Good*\n\nNo performance alerts detected.' 
            }, { quoted: msg });
          } else {
            let alertText = '⚠️ *Performance Alerts*\n\n';
            alerts.forEach((alert, i) => {
              const emoji = alert.level === 'critical' ? '🚨' : '⚠️';
              alertText += `${emoji} ${alert.message}\n`;
            });
            await sock.sendMessage(msg.key.remoteJid, { text: alertText }, { quoted: msg });
          }
          break;

        case 'export':
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `performance-report-${timestamp}.json`;
          
          await performanceMonitor.exportMetrics(filename);
          await sock.sendMessage(msg.key.remoteJid, { 
            text: `📊 Performance report exported to: ${filename}` 
          }, { quoted: msg });
          break;

        case 'reset':
          performanceMonitor.reset();
          await sock.sendMessage(msg.key.remoteJid, { 
            text: '🔄 Performance metrics have been reset.' 
          }, { quoted: msg });
          break;

        default:
          await sock.sendMessage(msg.key.remoteJid, { 
            text: `❌ Unknown action: ${action}\n\nAvailable actions: summary, full, alerts, export, reset` 
          }, { quoted: msg });
      }

    } catch (error) {
      console.error('Performance command error:', error);
      await sock.sendMessage(msg.key.remoteJid, { 
        text: '❌ Error retrieving performance data.' 
      }, { quoted: msg });
    }
  },
};