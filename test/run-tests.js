#!/usr/bin/env node

// 测试运行脚本
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

try {
  // 安装测试依赖
  console.log('安装测试依赖...');
  execSync('npm install', { cwd: './test', stdio: 'inherit' });

  // 运行后端API测试
  console.log('\n运行后端API测试...');
  execSync('npx jest --config jest.config.js test/backend', { cwd: './test', stdio: 'inherit' });

  // 运行前端单元测试
  console.log('\n运行前端单元测试...');
  execSync('npx jest --config jest.config.js test/frontend', { cwd: './test', stdio: 'inherit' });

  // 运行覆盖率测试
  console.log('\n运行覆盖率测试...');
  execSync('npx jest --config jest.config.js --coverage', { cwd: './test', stdio: 'inherit' });

  console.log('\n测试完成！');
  console.log('测试报告位置: test/reports');
  console.log('覆盖率报告位置: test/reports/coverage');
  
} catch (error) {
  console.error('测试运行失败:', error.message);
  process.exit(1);
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
