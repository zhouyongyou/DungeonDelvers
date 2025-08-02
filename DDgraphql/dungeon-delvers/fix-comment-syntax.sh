#!/bin/bash

# 修復註解語法錯誤的腳本

echo "修復多行註解的語法錯誤..."

# 查找所有有問題的文件
FILES=$(grep -l "^\s*])" src/*.ts)

for file in $FILES; do
    echo "修復文件: $file"
    
    # 使用 sed 替換單獨一行的 ]) 為 // ])
    sed -i '' 's/^[[:space:]]*])$/    \/\/ ])/' "$file"
    
    # 對於前面已經有參數的情況，在參數前加註釋
    perl -i -pe 's/^(\s+)(\w+.*,?)\s*$/\1\/\/ \2/g if $. > 1 && /^\s+\w+/ && !/#/ && !m{//} && $prev =~ /log\.info|log\.debug|log\.warning|log\.error/ ... /^\s*\]\)$/; $prev = $_' "$file"
done

echo "✓ 語法錯誤修復完成！"