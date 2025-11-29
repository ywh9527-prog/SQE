/**
 * 认证API路由
 * 简化版，先实现核心功能
 */

const express = require('express');
const router = express.Router();
const AuthService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * 系统初始化 - 创建默认管理员账户
 */
router.post('/init', async (req, res) => {
    try {
        const user = await AuthService.createDefaultUser();
        
        res.json({
            success: true,
            message: '默认用户创建成功',
            user: {
                username: user.username,
                fullName: user.fullName,
                email: user.email
            }
        });

    } catch (error) {
        logger.error(`系统初始化错误: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 用户登录
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: '用户名和密码不能为空'
            });
        }

        const result = await AuthService.login(username, password);
        
        res.json(result);

    } catch (error) {
        logger.error(`登录接口错误: ${error.message}`);
        res.status(500).json({
            success: false,
            error: '登录失败，请稍后重试'
        });
    }
});

/**
 * 验证令牌
 */
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        const result = await AuthService.verifyToken(token);
        
        res.json(result);

    } catch (error) {
        logger.error(`令牌验证错误: ${error.message}`);
        res.status(500).json({
            success: false,
            error: '令牌验证失败'
        });
    }
});

/**
 * 获取当前用户信息
 */
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        const verifyResult = await AuthService.verifyToken(token);
        
        if (!verifyResult.success) {
            return res.status(401).json(verifyResult);
        }

        const result = await AuthService.getUserInfo(verifyResult.user.userId);
        
        res.json(result);

    } catch (error) {
        logger.error(`获取用户信息错误: ${error.message}`);
        res.status(500).json({
            success: false,
            error: '获取用户信息失败'
        });
    }
});

module.exports = router;