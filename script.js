document.addEventListener('DOMContentLoaded', () => {
    // --- 資料定義 ---
    const rarityData = {
        labels: ['1 星 (普通)', '2 星 (非凡)', '3 星 (稀有)', '4 星 (史詩)', '5 星 (傳說)'],
        chances: [44, 35, 15, 5, 1],
        colors: ['#A9A9A9', '#6A8CAF', '#8B5CF6', '#D946EF', '#FBBF24'],
        power: {
            '1': {min: 15, max: 50}, '2': {min: 50, max: 100},
            '3': {min: 100, max: 150}, '4': {min: 150, max: 200},
            '5': {min: 200, max: 255}
        },
        capacity: {'1': 1, '2': 2, '3': 3, '4': 4, '5': 5}
    };
    
    const dungeonsData = [
        { name: '新手礦洞', requiredPower: 0, reward: 10 },
        { name: '哥布林洞穴', requiredPower: 100, reward: 25 },
        { name: '食人魔山谷', requiredPower: 250, reward: 60 },
        { name: '蜘蛛巢穴', requiredPower: 500, reward: 120 },
        { name: '石化蜥蜴沼澤', requiredPower: 800, reward: 200 },
        { name: '巫妖墓穴', requiredPower: 1200, reward: 350 },
        { name: '奇美拉之巢', requiredPower: 1800, reward: 550 },
        { name: '惡魔前哨站', requiredPower: 2500, reward: 800 },
        { name: '巨龍之巔', requiredPower: 3500, reward: 1200 },
        { name: '混沌深淵', requiredPower: 5000, reward: 2000 },
    ];
    
    // --- 遊戲狀態 ---
    let userHeroes = [];
    let userRelics = [];
    let currentParty = {
        relic: null,
        heroes: [],
        totalPower: 0
    };

    // --- 圖表生成 ---
    function createChart(ctx, label, data) {
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    label: label,
                    data: data.chances,
                    backgroundColor: data.colors,
                    borderColor: '#FDF6E3',
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#2D2A4A',
                            font: { size: 14 }
                        }
                    }
                }
            }
        });
    }

    // --- 頁面導覽 ---
    function setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const pages = document.querySelectorAll('.page-content');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                pages.forEach(p => p.classList.add('hidden'));
                document.getElementById(item.dataset.target).classList.remove('hidden');
                window.scrollTo(0, 0);
            });
        });
    }

    // --- Mock 資料生成 (用於測試) ---
    function generateMockAssets() {
        for(let i = 0; i < 8; i++) {
            const rand = Math.random() * 100;
            let rarity = 1;
            if (rand < 1) rarity = 5;
            else if (rand < 6) rarity = 4;
            else if (rand < 21) rarity = 3;
            else if (rand < 56) rarity = 2;
            
            const powerRange = rarityData.power[rarity];
            const power = Math.floor(Math.random() * (powerRange.max - powerRange.min + 1) + powerRange.min);
            userHeroes.push({ id: `H${i}`, rarity, power });
        }
        
        for(let i = 0; i < 3; i++) {
            const rand = Math.random() * 100;
            let rarity = 1;
            if (rand < 1) rarity = 5;
            else if (rand < 6) rarity = 4;
            else if (rand < 21) rarity = 3;
            else if (rand < 56) rarity = 2;

            const capacity = rarityData.capacity[rarity];
            userRelics.push({ id: `R${i}`, rarity, capacity });
        }
    }
    
    // --- 渲染函式 ---
    function renderStars(rarity) {
        let stars = '';
        for(let i = 0; i < 5; i++) {
            stars += `<span class="star">${i < rarity ? '★' : '☆'}</span>`;
        }
        return stars;
    }

    function renderHeroes() {
        const container = document.getElementById('heroesContainer');
        if (!container) return;
        container.innerHTML = userHeroes.map(hero => `
            <div class="card-bg p-3 rounded-lg text-center cursor-pointer hover:scale-105 transition-transform" data-id="${hero.id}" data-type="hero">
                <p class="font-bold text-sm">英雄 #${hero.id.substring(1)}</p>
                ${renderStars(hero.rarity)}
                <p class="text-lg font-bold mt-1 text-[#C0A573]">${hero.power} MP</p>
            </div>
        `).join('');
    }
    
    function renderRelics() {
        const container = document.getElementById('relicsContainer');
        if (!container) return;
        container.innerHTML = userRelics.map(relic => `
            <div class="card-bg p-3 rounded-lg text-center cursor-pointer hover:scale-105 transition-transform" data-id="${relic.id}" data-type="relic">
                 <p class="font-bold text-sm">聖物 #${relic.id.substring(1)}</p>
                ${renderStars(relic.rarity)}
                <p class="text-sm mt-1">容量: ${relic.capacity}</p>
            </div>
        `).join('');
    }

    function updateDungeons() {
        const container = document.getElementById('dungeonsContainer');
        if (!container) return;
        container.innerHTML = dungeonsData.map(dungeon => {
            const canEnter = currentParty.totalPower >= dungeon.requiredPower;
            return `
            <div class="card-bg p-4 rounded-xl ${!canEnter ? 'disabled-card' : ''}">
                <h4 class="text-xl font-bold font-serif">${dungeon.name}</h4>
                <p class="text-sm text-gray-300">要求戰力: ${dungeon.requiredPower}</p>
                <p class="text-lg mt-2 text-[#C0A573]">獎勵: ${dungeon.reward} $SoulShard / expedition</p>
                <button class="w-full mt-4 btn-primary py-2 rounded-lg ${!canEnter ? 'cursor-not-allowed opacity-50' : ''}" ${!canEnter ? 'disabled' : ''}>
                    開始遠征
                </button>
            </div>`
        }).join('');
    }

    // --- 隊伍管理 UI 更新 ---
    function updatePartyUI() {
        const container = document.getElementById('currentParty');
        if (!container) return;
        if (!currentParty.relic) {
             container.innerHTML = `
                <p class="text-lg">尚未組建隊伍。請前往「我的隊伍」頁面進行配置。</p>
                <p class="text-xl font-bold text-[#C0A573] mt-2">總戰力: <span id="totalPower">0</span></p>`;
        } else {
            let heroList = currentParty.heroes.map(h => `<p class="text-sm">英雄 #${h.id.substring(1)} (${h.power} MP)</p>`).join('');
            if (currentParty.heroes.length === 0) {
                heroList = `<p class="text-sm text-gray-400">(尚無英雄)</p>`;
            }

            container.innerHTML = `
                <div>
                    <p class="font-bold text-lg">聖物 #${currentParty.relic.id.substring(1)} (容量: ${currentParty.relic.capacity})</p>
                    <div class="mt-2">${heroList}</div>
                </div>
                <p class="text-xl font-bold text-[#C0A573] mt-4">總戰力: <span id="totalPower">${currentParty.totalPower}</span></p>
                <button id="disbandPartyBtn" class="mt-4 bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700">解散隊伍</button>
            `;
            document.getElementById('disbandPartyBtn').addEventListener('click', disbandParty);
        }
        updateDungeons();
    }
    
    function updateSelectionUI() {
        document.querySelectorAll('#barracks [data-id]').forEach(el => el.classList.remove('ring-4', 'ring-yellow-400'));
        if (currentParty.relic) {
            const relicCard = document.querySelector(`#barracks [data-id="${currentParty.relic.id}"]`);
            if (relicCard) relicCard.classList.add('ring-4', 'ring-yellow-400');
        }
        currentParty.heroes.forEach(h => {
             const heroCard = document.querySelector(`#barracks [data-id="${h.id}"]`);
             if (heroCard) heroCard.classList.add('ring-4', 'ring-yellow-400');
        });
    }

    // --- 隊伍邏輯 ---
    function handleAssetClick(e) {
        const card = e.target.closest('[data-id]');
        if (!card) return;
        
        const { id, type } = card.dataset;
        if(type === 'relic') {
            if (currentParty.relic && currentParty.relic.id === id) { // Unselect relic
                disbandParty();
            } else {
                disbandParty(); // Disband old party before selecting new relic
                currentParty.relic = userRelics.find(r => r.id === id);
            }
        } else if (type === 'hero' && currentParty.relic) {
            const hero = userHeroes.find(h => h.id === id);
            const heroIndex = currentParty.heroes.findIndex(h => h.id === id);
            if (heroIndex > -1) { // Unselect hero
                currentParty.heroes.splice(heroIndex, 1);
            } else if (currentParty.heroes.length < currentParty.relic.capacity) {
                currentParty.heroes.push(hero);
            } else {
                alert(`隊伍已滿！此聖物最多只能帶領 ${currentParty.relic.capacity} 位英雄。`);
                return;
            }
        } else if (type === 'hero' && !currentParty.relic) {
             alert('請先選擇一個聖物來組建隊伍！');
             return;
        }
        
        recalculatePower();
        updateSelectionUI();
        updatePartyUI();
    }

    function recalculatePower() {
        currentParty.totalPower = currentParty.heroes.reduce((sum, h) => sum + h.power, 0);
    }

    function disbandParty() {
        currentParty.relic = null;
        currentParty.heroes = [];
        currentParty.totalPower = 0;
        updateSelectionUI();
        updatePartyUI();
    }
    
    // --- 初始化 ---
    function init() {
        const heroChartCtx = document.getElementById('heroChart')?.getContext('2d');
        const relicChartCtx = document.getElementById('relicChart')?.getContext('2d');

        if (heroChartCtx && relicChartCtx) {
            createChart(heroChartCtx, '英雄掉落機率', rarityData);
            createChart(relicChartCtx, '聖物掉落機率', rarityData);
        }

        setupNavigation();
        
        document.getElementById('barracks')?.addEventListener('click', handleAssetClick);

        generateMockAssets(); // Generate mock data for demonstration
        renderHeroes();
        renderRelics();
        updateDungeons();
        updatePartyUI(); // Initial party UI update
    }

    init();
});
