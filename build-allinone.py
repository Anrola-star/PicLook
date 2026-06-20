#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AllinOne 整合脚本
自动将 index.html、style.css 和 app.js 合并成一个独立的 HTML 文件
"""

import os
import re

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 文件路径
    files = {
        'html': os.path.join(base_dir, 'index.html'),
        'css': os.path.join(base_dir, 'style.css'),
        'js': os.path.join(base_dir, 'app.js'),
        'output': os.path.join(base_dir, 'AllinOne.html'),
        'jszip': os.path.join(base_dir, 'libs', 'jszip.min.js'),
        'jsmediatags': os.path.join(base_dir, 'libs', 'jsmediatags.min.js')
    }
    
    print('开始整合 AllinOne.html...')
    
    try:
        # 1. 读取 HTML
        print('1. 读取 index.html...')
        with open(files['html'], 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # 2. 读取 CSS
        print('2. 读取 style.css...')
        with open(files['css'], 'r', encoding='utf-8') as f:
            css_content = f.read()
        
        # 3. 读取 JS
        print('3. 读取 app.js...')
        with open(files['js'], 'r', encoding='utf-8') as f:
            js_content = f.read()
        
        # 4. 嵌入 CSS（使用字符串替换而非正则）
        print('4. 嵌入 CSS...')
        html_content = html_content.replace(
            '<link rel="stylesheet" href="style.css">',
            '<style>\n' + css_content + '\n</style>'
        )
        
        # 5. 嵌入 JavaScript（使用字符串替换而非正则）
        print('5. 嵌入 JavaScript...')
        html_content = html_content.replace(
            '<script src="app.js"></script>',
            '<script>\n' + js_content + '\n</script>'
        )
        
        # 6. 移除外部库引用（使用正则但不包含复杂内容）
        print('6. 处理外部库引用...')
        html_content = re.sub(
            r'<script src="libs/jszip\.min\.js"></script>\s*<script src="libs/jsmediatags\.min\.js"></script>',
            '',
            html_content
        )
        
        # 7. 嵌入本地库文件
        lib_scripts = ''
        
        if os.path.exists(files['jszip']):
            print('   嵌入 jszip.min.js...')
            with open(files['jszip'], 'r', encoding='utf-8') as f:
                jszip_content = f.read()
            lib_scripts += '<script>\n' + jszip_content + '\n</script>\n'
        
        if os.path.exists(files['jsmediatags']):
            print('   嵌入 jsmediatags.min.js...')
            with open(files['jsmediatags'], 'r', encoding='utf-8') as f:
                jsmediatags_content = f.read()
            lib_scripts += '<script>\n' + jsmediatags_content + '\n</script>\n'
        
        # 在主脚本前插入库脚本（使用字符串替换）
        html_content = html_content.replace(
            '<script>\n// ==================== 全局变量定义',
            lib_scripts + '<script>\n// ==================== 全局变量定义'
        )
        
        # 8. 写入输出文件
        print('7. 写入 AllinOne.html...')
        with open(files['output'], 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print()
        print('整合完成！')
        print('输出文件:', files['output'])
        
        # 显示文件大小信息
        file_size = os.path.getsize(files['output'])
        print('文件大小: {:.2f} MB'.format(file_size / 1024 / 1024))
        
    except Exception as e:
        print()
        print('整合失败:', str(e))
        exit(1)

if __name__ == '__main__':
    main()