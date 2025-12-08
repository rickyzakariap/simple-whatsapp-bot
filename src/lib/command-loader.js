const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

/**
 * Optimized command loader with lazy loading and hot-reload
 */
class CommandLoader {
  constructor(commandsDir) {
    this.commandsDir = commandsDir;
    this.commands = new Map();
    this.commandFiles = new Map();
    this.watcher = null;
    this.loadedCommands = new Set();
    
    // Performance metrics
    this.stats = {
      totalCommands: 0,
      loadedCommands: 0,
      hotReloads: 0,
      loadTime: 0
    };
  }

  /**
   * Initialize command loader with lazy loading
   */
  async initialize() {
    const startTime = Date.now();
    
    console.log('Command Loader: Initializing...');
    
    // Scan for command files without loading them
    await this.scanCommandFiles();
    
    // Setup hot-reload watcher
    this.setupWatcher();
    
    this.stats.loadTime = Date.now() - startTime;
    console.log(`Command Loader: Found ${this.stats.totalCommands} commands in ${this.stats.loadTime}ms`);
  }

  /**
   * Scan command directory for files without loading them
   */
  async scanCommandFiles() {
    try {
      const files = fs.readdirSync(this.commandsDir);
      
      for (const file of files) {
        if (file.endsWith('.js')) {
          const filePath = path.join(this.commandsDir, file);
          const commandName = path.basename(file, '.js');
          
          this.commandFiles.set(commandName, {
            filePath,
            lastModified: fs.statSync(filePath).mtime,
            loaded: false
          });
          
          this.stats.totalCommands++;
        }
      }
    } catch (error) {
      console.error('Command Loader: Error scanning command files:', error.message);
    }
  }

  /**
   * Lazy load command when first accessed
   */
  async loadCommand(commandName) {
    const commandInfo = this.commandFiles.get(commandName);
    if (!commandInfo) {
      return null;
    }

    try {
      // Clear require cache for hot-reload
      delete require.cache[require.resolve(commandInfo.filePath)];
      
      // Load the command
      const command = require(commandInfo.filePath);
      
      // Validate command structure
      if (!command.name || typeof command.execute !== 'function') {
        console.error(`Command Loader: Invalid command structure in ${commandInfo.filePath}`);
        return null;
      }
      
      // Cache the loaded command
      this.commands.set(commandName, command);
      commandInfo.loaded = true;
      this.loadedCommands.add(commandName);
      this.stats.loadedCommands++;
      
      console.log(`Command Loader: Loaded command '${commandName}'`);
      return command;
      
    } catch (error) {
      console.error(`Command Loader: Error loading command '${commandName}':`, error.message);
      return null;
    }
  }

  /**
   * Get command with lazy loading
   */
  async getCommand(commandName) {
    // Return cached command if already loaded
    if (this.commands.has(commandName)) {
      return this.commands.get(commandName);
    }
    
    // Lazy load the command
    return await this.loadCommand(commandName);
  }

  /**
   * Check if command exists
   */
  hasCommand(commandName) {
    return this.commandFiles.has(commandName);
  }

  /**
   * Get all available command names
   */
  getCommandNames() {
    return Array.from(this.commandFiles.keys());
  }

  /**
   * Get loaded command names
   */
  getLoadedCommandNames() {
    return Array.from(this.loadedCommands);
  }

  /**
   * Preload frequently used commands
   */
  async preloadCommands(commandNames) {
    console.log(`Command Loader: Preloading ${commandNames.length} commands...`);
    
    const promises = commandNames.map(async (name) => {
      if (this.commandFiles.has(name) && !this.commands.has(name)) {
        await this.loadCommand(name);
      }
    });
    
    await Promise.all(promises);
    console.log('Command Loader: Preload complete');
  }

  /**
   * Setup file watcher for hot-reload
   */
  setupWatcher() {
    this.watcher = chokidar.watch(this.commandsDir, {
      ignored: /node_modules/,
      persistent: true
    });

    this.watcher.on('change', async (filePath) => {
      const commandName = path.basename(filePath, '.js');
      
      if (this.commandFiles.has(commandName)) {
        console.log(`Command Loader: Hot-reloading command '${commandName}'`);
        
        // Update file info
        const commandInfo = this.commandFiles.get(commandName);
        commandInfo.lastModified = fs.statSync(filePath).mtime;
        
        // If command was loaded, reload it
        if (commandInfo.loaded) {
          await this.loadCommand(commandName);
          this.stats.hotReloads++;
        }
      }
    });

    this.watcher.on('add', async (filePath) => {
      if (filePath.endsWith('.js')) {
        const commandName = path.basename(filePath, '.js');
        
        if (!this.commandFiles.has(commandName)) {
          console.log(`Command Loader: New command detected '${commandName}'`);
          
          this.commandFiles.set(commandName, {
            filePath,
            lastModified: fs.statSync(filePath).mtime,
            loaded: false
          });
          
          this.stats.totalCommands++;
        }
      }
    });

    this.watcher.on('unlink', (filePath) => {
      const commandName = path.basename(filePath, '.js');
      
      if (this.commandFiles.has(commandName)) {
        console.log(`Command Loader: Command removed '${commandName}'`);
        
        // Remove from all caches
        this.commandFiles.delete(commandName);
        this.commands.delete(commandName);
        this.loadedCommands.delete(commandName);
        
        // Clear require cache
        delete require.cache[require.resolve(filePath)];
        
        this.stats.totalCommands--;
        if (this.loadedCommands.has(commandName)) {
          this.stats.loadedCommands--;
        }
      }
    });
  }

  /**
   * Unload specific command to free memory
   */
  unloadCommand(commandName) {
    if (this.commands.has(commandName)) {
      const commandInfo = this.commandFiles.get(commandName);
      
      // Clear from caches
      this.commands.delete(commandName);
      this.loadedCommands.delete(commandName);
      
      // Clear require cache
      if (commandInfo) {
        delete require.cache[require.resolve(commandInfo.filePath)];
        commandInfo.loaded = false;
      }
      
      this.stats.loadedCommands--;
      console.log(`Command Loader: Unloaded command '${commandName}'`);
    }
  }

  /**
   * Unload all commands to free memory
   */
  unloadAllCommands() {
    console.log('Command Loader: Unloading all commands...');
    
    for (const commandName of this.loadedCommands) {
      const commandInfo = this.commandFiles.get(commandName);
      if (commandInfo) {
        delete require.cache[require.resolve(commandInfo.filePath)];
        commandInfo.loaded = false;
      }
    }
    
    this.commands.clear();
    this.loadedCommands.clear();
    this.stats.loadedCommands = 0;
    
    console.log('Command Loader: All commands unloaded');
  }

  /**
   * Get loader statistics
   */
  getStats() {
    return {
      ...this.stats,
      memoryUsage: `${this.stats.loadedCommands}/${this.stats.totalCommands} loaded`,
      loadPercentage: this.stats.totalCommands > 0 
        ? `${((this.stats.loadedCommands / this.stats.totalCommands) * 100).toFixed(1)}%`
        : '0%'
    };
  }

  /**
   * Shutdown command loader
   */
  shutdown() {
    console.log('Command Loader: Shutting down...');
    
    if (this.watcher) {
      this.watcher.close();
    }
    
    this.unloadAllCommands();
    this.commandFiles.clear();
    
    console.log('Command Loader: Shutdown complete');
  }

  /**
   * Validate all commands without loading them
   */
  async validateCommands() {
    const results = {
      valid: [],
      invalid: [],
      errors: []
    };

    for (const [commandName, commandInfo] of this.commandFiles) {
      try {
        // Temporarily load command for validation
        delete require.cache[require.resolve(commandInfo.filePath)];
        const command = require(commandInfo.filePath);
        
        if (command.name && typeof command.execute === 'function') {
          results.valid.push(commandName);
        } else {
          results.invalid.push({
            name: commandName,
            reason: 'Missing name or execute function'
          });
        }
        
        // Clear from cache after validation
        delete require.cache[require.resolve(commandInfo.filePath)];
        
      } catch (error) {
        results.errors.push({
          name: commandName,
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = CommandLoader;