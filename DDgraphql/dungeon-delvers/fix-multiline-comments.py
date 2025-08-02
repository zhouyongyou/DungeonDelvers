#!/usr/bin/env python3
import os
import re

def fix_multiline_comments(content):
    """修復多行 log 語句的註釋"""
    lines = content.split('\n')
    fixed_lines = []
    in_log_comment = False
    
    for i, line in enumerate(lines):
        # 檢查是否開始了一個註釋的 log 語句
        if re.match(r'\s*//\s*log\.(info|debug|warning|error)\(', line):
            in_log_comment = True
            fixed_lines.append(line)
        # 檢查是否結束了 log 語句
        elif in_log_comment and re.match(r'\s*\]\)', line):
            # 這行也需要註釋
            if not line.strip().startswith('//'):
                fixed_lines.append('    // ' + line.strip())
            else:
                fixed_lines.append(line)
            in_log_comment = False
        # 在 log 語句內部的行
        elif in_log_comment:
            # 如果這行還沒有被註釋，就加上註釋
            if not line.strip().startswith('//'):
                # 保持原有縮進
                indent = len(line) - len(line.lstrip())
                fixed_lines.append(' ' * indent + '// ' + line.strip())
            else:
                fixed_lines.append(line)
        else:
            fixed_lines.append(line)
    
    return '\n'.join(fixed_lines)

# 處理所有 .ts 文件
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.ts'):
            filepath = os.path.join(root, file)
            print(f"處理文件: {filepath}")
            
            with open(filepath, 'r') as f:
                content = f.read()
            
            fixed_content = fix_multiline_comments(content)
            
            if content != fixed_content:
                with open(filepath, 'w') as f:
                    f.write(fixed_content)
                print(f"  ✓ 已修復")
            else:
                print(f"  - 無需修改")

print("\n✓ 所有文件處理完成！")