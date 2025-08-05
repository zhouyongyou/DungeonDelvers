#!/bin/bash

# 🧹 清理過時備份文件腳本
# 保留最近的備份，清理過時文件

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# 檢查並清理備份文件
cleanup_backups() {
    log_info "開始清理過時備份文件..."
    
    # 統計備份文件
    local backup_count=$(find . -name "*.backup-*" | wc -l)
    log_info "發現 $backup_count 個備份文件"
    
    if [ "$backup_count" -eq 0 ]; then
        log_success "沒有需要清理的備份文件"
        return
    fi
    
    # 按文件類型分組清理
    local file_types=("json" "yaml" "ts" "js")
    local total_cleaned=0
    
    for ext in "${file_types[@]}"; do
        log_info "處理 .$ext 備份文件..."
        
        # 查找該類型的所有原始文件
        for base_file in $(find . -name "*.$ext" -not -name "*.backup-*" | sort); do
            local backup_files=$(find . -name "$(basename "$base_file").backup-*" | sort)
            local backup_count=$(echo "$backup_files" | grep -c ".*" || echo "0")
            
            if [ "$backup_count" -gt 0 ]; then
                log_info "文件 $base_file 有 $backup_count 個備份"
                
                # 保留最新的 3 個備份，刪除其他的
                local files_to_delete=$(echo "$backup_files" | head -n -3)
                local delete_count=$(echo "$files_to_delete" | grep -c ".*" || echo "0")
                
                if [ "$delete_count" -gt 0 ] && [ -n "$files_to_delete" ]; then
                    log_warning "刪除 $delete_count 個舊備份..."
                    echo "$files_to_delete" | while read -r file; do
                        if [ -f "$file" ]; then
                            rm "$file"
                            log_info "已刪除: $(basename "$file")"
                            ((total_cleaned++))
                        fi
                    done
                fi
            fi
        done
    done
    
    log_success "清理完成，共刪除 $total_cleaned 個備份文件"
}

# 創建備份清單
create_backup_inventory() {
    log_info "創建當前備份清單..."
    
    local inventory_file="backup-inventory.md"
    
    cat > "$inventory_file" << EOF
# 備份文件清單

生成時間: $(date)

## 保留的備份文件

EOF
    
    # 按類型列出剩餘備份
    for ext in json yaml ts js; do
        local backup_files=$(find . -name "*.backup-*.$ext" 2>/dev/null | sort || true)
        if [ -n "$backup_files" ]; then
            echo "### .$ext 文件" >> "$inventory_file"
            echo "" >> "$inventory_file"
            echo "$backup_files" | while read -r file; do
                if [ -f "$file" ]; then
                    local size=$(ls -lh "$file" | awk '{print $5}')
                    local date=$(ls -l "$file" | awk '{print $6, $7, $8}')
                    echo "- \`$(basename "$file")\` ($size, $date)" >> "$inventory_file"
                fi
            done
            echo "" >> "$inventory_file"
        fi
    done
    
    log_success "備份清單已創建: $inventory_file"
}

# 優化目錄結構
optimize_structure() {
    log_info "優化項目目錄結構..."
    
    # 創建 scripts 目錄（如果不存在）
    if [ ! -d "scripts" ]; then
        mkdir scripts
        log_info "創建 scripts 目錄"
    fi
    
    # 移動部署腳本到統一位置
    local deploy_scripts=$(find . -maxdepth 1 -name "deploy-*.sh")
    if [ -n "$deploy_scripts" ]; then
        log_info "整理部署腳本..."
        for script in $deploy_scripts; do
            if [ "$script" != "./deploy-modern.sh" ]; then
                mv "$script" "scripts/"
                log_info "移動 $(basename "$script") 到 scripts/"
            fi
        done
    fi
    
    # 移動其他工具腳本
    local tool_scripts=$(find . -maxdepth 1 -name "*.sh" -not -name "deploy-modern.sh" -not -name "cleanup-backups.sh")
    if [ -n "$tool_scripts" ]; then
        for script in $tool_scripts; do
            mv "$script" "scripts/"
            log_info "移動 $(basename "$script") 到 scripts/"
        done
    fi
    
    log_success "目錄結構優化完成"
}

# 主函數
main() {
    log_info "🧹 開始清理和優化子圖項目"
    
    cleanup_backups
    create_backup_inventory
    optimize_structure
    
    log_success "🎉 清理和優化完成！"
    log_info "建議："
    echo "  1. 檢查 backup-inventory.md 確認保留的備份"
    echo "  2. 使用 ./deploy-modern.sh 進行後續部署"
    echo "  3. 考慮將重要配置加入版本控制"
}

# 安全檢查
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    read -p "這將刪除大量備份文件，是否繼續？(y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        main "$@"
    else
        log_info "操作已取消"
    fi
fi