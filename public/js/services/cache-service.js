/**
 * 缓存服务模块
 * @description 提供安全的缓存操作方法，包含完整的错误处理
 * @author iFlow CLI
 * @date 2025-11-26
 */

import { CACHE_CONFIG } from '../config/cache-config.js';

export class CacheService {
  /**
   * 安全获取缓存数据
   * @param {string} key - 缓存键名
   * @returns {any|null} 缓存数据或null
   */
  static get(key) {
    try {
      const fullKey = CACHE_CONFIG.KEY_PREFIX + key;
      const cachedData = localStorage.getItem(fullKey);
      
      if (!cachedData) {
        if (CACHE_CONFIG.ENABLE_LOGGING) {
          console.log(`缓存未命中: ${key}`);
        }
        return null;
      }
      
      const { data, timestamp } = JSON.parse(cachedData);
      const now = Date.now();
      
      // 检查是否过期
      if (now - timestamp >= CACHE_CONFIG.EXPIRY_TIME) {
        if (CACHE_CONFIG.ENABLE_LOGGING) {
          console.log(`缓存已过期: ${key}`);
        }
        localStorage.removeItem(fullKey);
        return null;
      }
      
      if (CACHE_CONFIG.ENABLE_LOGGING) {
        console.log(`使用缓存数据: ${key}`);
      }
      
      return data;
      
    } catch (error) {
      console.warn(`缓存读取失败 (${key}):`, error);
      // 清理可能损坏的缓存
      try {
        const fullKey = CACHE_CONFIG.KEY_PREFIX + key;
        localStorage.removeItem(fullKey);
      } catch (cleanupError) {
        console.error('缓存清理失败:', cleanupError);
      }
      return null;
    }
  }
  
  /**
   * 安全设置缓存数据
   * @param {string} key - 缓存键名
   * @param {any} data - 要缓存的数据
   * @returns {boolean} 是否设置成功
   */
  static set(key, data) {
    try {
      const fullKey = CACHE_CONFIG.KEY_PREFIX + key;
      const cacheData = {
        data: data,
        timestamp: Date.now()
      };
      
      localStorage.setItem(fullKey, JSON.stringify(cacheData));
      
      if (CACHE_CONFIG.ENABLE_LOGGING) {
        console.log(`缓存已设置: ${key}`);
      }
      
      return true;
      
    } catch (error) {
      console.warn(`缓存设置失败 (${key}):`, error);
      return false;
    }
  }
  
  /**
   * 清除指定缓存
   * @param {string} key - 缓存键名
   * @returns {boolean} 是否清除成功
   */
  static clear(key) {
    try {
      const fullKey = CACHE_CONFIG.KEY_PREFIX + key;
      localStorage.removeItem(fullKey);
      
      if (CACHE_CONFIG.ENABLE_LOGGING) {
        console.log(`缓存已清除: ${key}`);
      }
      
      return true;
      
    } catch (error) {
      console.warn(`缓存清除失败 (${key}):`, error);
      return false;
    }
  }
  
  /**
   * 构建带时间戳的URL以绕过HTTP缓存
   * @param {string} baseUrl - 基础URL
   * @returns {string} 带时间戳的URL
   */
  static buildBypassUrl(baseUrl) {
    const timestamp = Date.now();
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${CACHE_CONFIG.TIMESTAMP_PARAM}=${timestamp}`;
  }
  
  /**
   * 获取缓存绕过选项
   * @returns {Object} fetch请求选项
   */
  static getBypassOptions() {
    return { ...CACHE_CONFIG.DEFAULT_OPTIONS };
  }
}