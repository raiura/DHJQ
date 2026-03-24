/**
 * 简单的日志工具
 */

const config = require('../config');

class Logger {
  static info(message, ...args) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  }

  static error(message, error, ...args) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error?.message || '', ...args);
    if (config.server.env === 'development' && error?.stack) {
      console.error(error.stack);
    }
  }

  static warn(message, ...args) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  }

  static debug(message, ...args) {
    if (config.server.env === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }
}

module.exports = Logger;
