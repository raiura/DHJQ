#!/usr/bin/env node

// 测试运行脚本
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 检查并终止占用指定端口的进程
function checkAndKillPort(port) {
  try {
    console.log(`\n检查端口 ${port} 是否被占用...`);
    // 使用netstat命令查找占用端口的进程
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    
    if (output) {
      console.log(`端口 ${port} 被占用，尝试终止进程...`);
      // 提取进程ID
      const lines = output.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const pid = parts[4];
          try {
            execSync(`taskkill /PID ${pid} /F`, { stdio: 'inherit' });
            console.log(`进程 ${pid} 已终止`);
          } catch (error) {
            console.log(`终止进程 ${pid} 失败:`, error.message);
          }
        }
      }
    } else {
      console.log(`端口 ${port} 未被占用`);
    }
  } catch (error) {
    // 如果netstat命令没有找到占用端口的进程，会抛出错误，这是正常的
    console.log(`端口 ${port} 未被占用`);
  }
}

// 清空内存存储数据
function clearMemoryStore() {
  try {
    console.log('\n清空内存存储数据...');
    const memoryStorePath = path.join(__dirname, '../backend/utils/memoryStore.js');
    if (fs.existsSync(memoryStorePath)) {
      // 清空内存存储的持久化文件
      const dataDir = path.join(__dirname, '../backend/data');
      const memoryFile = path.join(dataDir, 'memory-store.json');
      if (fs.existsSync(memoryFile)) {
        fs.unlinkSync(memoryFile);
        console.log('内存存储持久化文件已清空');
      }
      // 清空数据目录下的其他可能的持久化文件
      if (fs.existsSync(dataDir)) {
        const files = fs.readdirSync(dataDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(dataDir, file);
            fs.unlinkSync(filePath);
            console.log(`已删除持久化文件: ${file}`);
          }
        }
      }
    }
  } catch (error) {
    console.log('清空内存存储数据失败:', error.message);
  }
}

// 确保测试目录存在
const testDirs = [
  'test/reports',
  'test/reports/coverage',
  'test/reports/junit',
  'test/logs',
  'test/temp'
];

testDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`创建目录: ${dir}`);
  }
});

// 运行测试
console.log('开始运行测试...');

// 清空内存存储数据
clearMemoryStore();

// 检查并终止占用3001端口的进程
checkAndKillPort(3001);

try {
  // 安装测试依赖
  console.log('安装测试依赖...');
  execSync('npm install', { cwd: './test', stdio: 'inherit' });

  // 运行后端API测试
  console.log('\n运行后端API测试...');
  execSync('npx jest --config jest.config.js test/backend', { cwd: './test', stdio: 'inherit' });

  // 检查并终止占用3001端口的进程（再次检查）
  checkAndKillPort(3001);

  // 运行前端单元测试
  console.log('\n运行前端单元测试...');
  execSync('npx jest --config jest.config.js test/frontend', { cwd: './test', stdio: 'inherit' });

  // 检查并终止占用3001端口的进程（再次检查）
  checkAndKillPort(3001);

  // 运行覆盖率测试
  console.log('\n运行覆盖率测试...');
  execSync('npx jest --config jest.config.js --coverage', { cwd: './test', stdio: 'inherit' });

  console.log('\n测试完成！');
  console.log('测试报告位置: test/reports');
  console.log('覆盖率报告位置: test/reports/coverage');
  
} catch (error) {
  console.error('测试运行失败:', error.message);
  process.exit(1);
} finally {
  // 检查并终止占用3001端口的进程（测试完成后清理）
  checkAndKillPort(3001);
}

// 清理临时文件
console.log('\n清理临时文件...');
try {
  const tempDir = 'test/temp';
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      fs.unlinkSync(path.join(tempDir, file));
    });
    console.log('临时文件已清理');
  }
} catch (error) {
  console.error('清理临时文件失败:', error.message);
}

console.log('\n测试运行脚本执行完成！');
