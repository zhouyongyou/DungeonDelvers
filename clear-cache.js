// 清除前端緩存腳本
console.log('🧹 清除前端緩存...');

// 清除 localStorage
localStorage.clear();

// 清除 sessionStorage  
sessionStorage.clear();

// 清除 indexedDB (如果使用)
if ('indexedDB' in window) {
  indexedDB.databases().then(databases => {
    databases.forEach(db => {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    });
  });
}

// 強制重新載入
window.location.reload(true);

console.log('✅ 緩存清除完成，正在重新載入...');