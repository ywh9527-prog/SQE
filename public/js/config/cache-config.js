/**
 * 缓存配置文件
 * @description 集中管理所有缓存相关的配置参数
 * @author iFlow CLI
 * @date 2025-11-26
 */

export const CACHE_CONFIG = {
  // 缓存过期时间（毫秒）
  EXPIRY_TIME: 5 * 60 * 1000, // 5分钟
  
  // 缓存键名前缀
  KEY_PREFIX: 'stats_',
  
  // 是否启用缓存日志
  ENABLE_LOGGING: true,
  
  // 时间戳参数名（用于绕过HTTP缓存）
  TIMESTAMP_PARAM: '_t',
  
  // 默认缓存选项
  DEFAULT_OPTIONS: {
    cache: 'no-cache',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }
};