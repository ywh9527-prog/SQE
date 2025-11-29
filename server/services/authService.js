/**
 * 认证服务
 * 简化版认证逻辑，专注于核心功能
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

class AuthService {
    // JWT配置
    static JWT_SECRET = 'sqe-system-secret-key-2025';
    static JWT_EXPIRES_IN = '30d';

    /**
     * 用户登录
     */
    static async login(username, password) {
        try {
            // 查找用户
            const user = await User.findOne({ where: { username } });
            
            if (!user) {
                return {
                    success: false,
                    error: '用户名或密码错误'
                };
            }

            // 验证密码
            const isValid = await bcrypt.compare(password, user.password);
            
            if (!isValid) {
                return {
                    success: false,
                    error: '用户名或密码错误'
                };
            }

            // 更新最后登录时间
            await user.update({ lastLogin: new Date() });

            // 生成JWT令牌
            const token = jwt.sign(
                { 
                    userId: user.id,
                    username: user.username,
                    fullName: user.fullName
                },
                this.JWT_SECRET,
                { expiresIn: this.JWT_EXPIRES_IN }
            );

            logger.info(`用户 ${username} 登录成功`);

            return {
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    fullName: user.fullName,
                    email: user.email,
                    lastLogin: user.lastLogin
                }
            };

        } catch (error) {
            logger.error(`登录错误: ${error.message}`);
            return {
                success: false,
                error: '登录失败，请稍后重试'
            };
        }
    }

    /**
     * 验证令牌
     */
    static async verifyToken(token) {
        try {
            if (!token) {
                return {
                    success: false,
                    error: '未提供令牌'
                };
            }

            const decoded = jwt.verify(token, this.JWT_SECRET);
            
            return {
                success: true,
                user: decoded
            };

        } catch (error) {
            logger.error(`令牌验证错误: ${error.message}`);
            return {
                success: false,
                error: '令牌无效或已过期'
            };
        }
    }

    /**
     * 创建默认管理员用户
     */
    static async createDefaultUser() {
        try {
            const existingUser = await User.findOne({ where: { username: 'admin' } });
            
            if (existingUser) {
                logger.info('默认用户已存在');
                return existingUser;
            }

            // 创建默认管理员用户
            const hashedPassword = await bcrypt.hash('123456', 10);
            
            const defaultUser = await User.create({
                username: 'admin',
                password: hashedPassword,
                email: 'admin@sqe-system.com',
                fullName: 'SQE管理员',
                isActive: true
            });

            logger.info('创建默认管理员用户成功');
            return defaultUser;

        } catch (error) {
            logger.error(`创建默认用户失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 获取用户信息
     */
    static async getUserInfo(userId) {
        try {
            const user = await User.findByPk(userId, {
                attributes: { exclude: ['password'] }
            });

            if (!user) {
                return {
                    success: false,
                    error: '用户不存在'
                };
            }

            return {
                success: true,
                user
            };

        } catch (error) {
            logger.error(`获取用户信息错误: ${error.message}`);
            return {
                success: false,
                error: '获取用户信息失败'
            };
        }
    }
}

module.exports = AuthService;