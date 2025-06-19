document.addEventListener('DOMContentLoaded', () => {
    // --- Ethers.js 和合約相關變數 ---
    let provider;
    let signer;
    let contract;
    let userAddress;

    // !!重要!!: 部署合約後，需要用真實數據替換這裡的內容
    const contractAddress = "YOUR_CONTRACT_ADDRESS_HERE"; // 部署後填入合約地址
    const contractABI = []; // 部署後填入合約的 ABI (Application Binary Interface)

    // --- 靜態資料定義 ---
    const rarityData = {
        labels: ['1 星 (普通)', '2 星 (非凡)', '3 星 (稀有)', '4 星 (史詩)', '5 星 (傳說)'],
        chances: [44, 35, 15, 5, 1],
        colors: ['#A9A9A9', '#6A8CAF', '#8B5CF6', '#D946EF', '#FBBF24'],
        // 我們將從 IPFS 讀取真實數據，但先保留前端對應的資料結構
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

    // --- 遊戲狀態 (現在將由區塊鏈數據驅動) ---
    let userHeroes = []; // 將從 fetchUserAssets() 填充
    let userRelics = []; // 將從 fetchUserAssets() 填充
    let currentParty = {
        relic: null,
        heroes: [],
        totalPower: 0
    };
    
    // --- DOM 元素 ---
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const mintHeroBtn = document.getElementById('mintHeroBtn');
    const mintRelicBtn = document.getElementById('mintRelicBtn');
    const heroesContainer = document.getElementById('heroesContainer');
    const relicsContainer = document.getElementById('relicsContainer');

    // --- 連接錢包 ---
    const connectWallet = async () => {
        if (typeof window.ethereum === 'undefined') {
            alert('請安裝 MetaMask！');
            return;
        }
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            userAddress = await signer.getAddress();
            contract = new ethers.Contract(contractAddress, contractABI, signer);

            connectWalletBtn.textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`;
            connectWalletBtn.disabled = true;

            console.log("錢包已連接:", userAddress);
            await fetchUserAssets();
        } catch (error) {
            console.error("連接錢包失敗:", error);
            alert(`連接錢包出錯: ${error.message}`);
        }
    };
    
    // --- 與合約互動 ---
    const fetchUserAssets = async () => {
        if (!contract || !userAddress) return;
        heroesContainer.innerHTML = '<p class="col-span-full text-center text-gray-200">正在從區塊鏈讀取您的資產...</p>';
        relicsContainer.innerHTML = '';
        
        try {
            // !!注意!!: 這些 ID 應與您的 Solidity 合約中的常數匹配
            const heroTokenIds = [1, 2, 3, 4, 5]; 
            const relicTokenIds = [11, 12, 13, 14, 15];
            const allTokenIds = [...heroTokenIds, ...relicTokenIds];
            const userAddresses = Array(allTokenIds.length).fill(userAddress);
            const balances = await contract.balanceOfBatch(userAddresses, allTokenIds);

            let fetchedHeroes = [];
            let fetchedRelics = [];

            // TODO: 在真實應用中，我們需要為每個 tokenId 獲取其元數據 (metadata)
            // 這裡我們先用假數據代替
            for (let i = 0; i < balances.length; i++) {
                const balance = balances[i].toNumber();
                if (balance > 0) {
                    const tokenId = allTokenIds[i];
                    for (let j = 0; j < balance; j++) {
                        const uniqueId = `${tokenId}-${j}`; // 用於前端點擊選取
                        if (heroTokenIds.includes(tokenId)) {
                            // 假設從元數據中讀取
                            const mockRarity = tokenId;
                            const powerRange = rarityData.power[mockRarity];
                            const power = Math.floor(Math.random() * (powerRange.max - powerRange.min + 1) + powerRange.min);
                            fetchedHeroes.push({ id: uniqueId, tokenId, rarity: mockRarity, power });
                        } else if (relicTokenIds.includes(tokenId)) {
                            const mockRarity = tokenId - 10;
                            const capacity = rarityData.capacity[mockRarity];
                            fetchedRelics.push({ id: uniqueId, tokenId, rarity: mockRarity, capacity });
                        }
                    }
                }
            }

            userHeroes = fetchedHeroes;
            userRelics = fetchedRelics;
            
            renderHeroes();
            renderRelics();
            updatePartyUI();

        } catch (error) {
            console.error("讀取資產失敗:", error);
            heroesContainer.innerHTML = '<p class="col-span-full text-center text-red-400">讀取資產失敗。合約尚未部署或網路錯誤。</p>';
        }
    };

    const mintHero = async () => {
        if (!contract) {
            alert('請先連接錢包！');
            return;
        }
        try {
            const price = ethers.utils.parseEther("0.01"); 
            const tx = await contract.mintHero({ value: price });
            alert('交易已送出！請在錢包中等待確認。');
            await tx.wait();
            alert('英雄招募成功！');
            await fetchUserAssets();
        } catch (error) {
            console.error("招募英雄失敗:", error);
            alert(`招募失敗: ${error.message}`);
        }
    };

    // --- 原有的 UI 渲染與互動邏輯 ---

    function createChart(ctx, label, data) {
        new Chart(ctx, {
            type: 'doughnut', data: { labels: data.labels, datasets: [{ label: label, data: data.chances, backgroundColor: data.colors, borderColor: '#FDF6E3', borderWidth: 2, hoverOffset: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#2D2A4A', font: { size: 14 } } } } }
        });
    }

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

    function renderStars(rarity) {
        let stars = '';
        for(let i = 0; i < 5; i++) stars += `<span class="star">${i < rarity ? '★' : '☆'}</span>`;
        return stars;
    }

    function renderHeroes() {
        heroesContainer.innerHTML = userHeroes.length > 0 ? userHeroes.map(hero => `
            <div class="card-bg p-3 rounded-lg text-center cursor-pointer hover:scale-105 transition-transform" data-id="${hero.id}" data-type="hero">
                <p class="font-bold text-sm">英雄 (ID: ${hero.tokenId})</p>
                ${renderStars(hero.rarity)}
                <p class="text-lg font-bold mt-1 text-[#C0A573]">${hero.power} MP</p>
            </div>
        `).join('') : '<p class="col-span-full text-center text-gray-500">您還沒有任何英雄。</p>';
    }
    
    function renderRelics() {
        relicsContainer.innerHTML = userRelics.length > 0 ? userRelics.map(relic => `
            <div class="card-bg p-3 rounded-lg text-center cursor-pointer hover:scale-105 transition-transform" data-id="${relic.id}" data-type="relic">
                 <p class="font-bold text-sm">聖物 (ID: ${relic.tokenId})</p>
                ${renderStars(relic.rarity)}
                <p class="text-sm mt-1">容量: ${relic.capacity}</p>
            </div>
        `).join('') : '<p class="col-span-full text-center text-gray-500">您還沒有任何聖物。</p>';
    }

    function updateDungeons() {
        const container = document.getElementById('dungeonsContainer');
        container.innerHTML = dungeonsData.map(dungeon => {
            const canEnter = currentParty.totalPower >= dungeon.requiredPower;
            return `
            <div class="card-bg p-4 rounded-xl ${!canEnter ? 'disabled-card' : ''}">
                <h4 class="text-xl font-bold font-serif">${dungeon.name}</h4>
                <p class="text-sm text-gray-300">要求戰力: ${dungeon.requiredPower}</p>
                <p class="text-lg mt-2 text-[#C0A573]">獎勵: ${dungeon.reward} $SoulShard</p>
                <button class="w-full mt-4 btn-primary py-2 rounded-lg ${!canEnter ? 'cursor-not-allowed opacity-50' : ''}" ${!canEnter ? 'disabled' : ''}>
                    開始遠征
                </button>
            </div>`;
        }).join('');
    }

    function updatePartyUI() {
        const container = document.getElementById('currentParty');
        if (!currentParty.relic) {
             container.innerHTML = `
                <p class="text-lg">尚未組建隊伍。請前往「我的隊伍」頁面進行配置。</p>
                <p class="text-xl font-bold text-[#C0A573] mt-2">總戰力: <span id="totalPower">0</span></p>`;
        } else {
            let heroList = currentParty.heroes.map(h => `<p class="text-sm">英雄 #${h.id} (${h.power} MP)</p>`).join('');
            if (currentParty.heroes.length === 0) heroList = `<p class="text-sm text-gray-400">(尚無英雄)</p>`;
            container.innerHTML = `
                <div>
                    <p class="font-bold text-lg">聖物 #${currentParty.relic.id} (容量: ${currentParty.relic.capacity})</p>
                    <div class="mt-2">${heroList}</div>
                </div>
                <p class="text-xl font-bold text-[#C0A573] mt-4">總戰力: <span id="totalPower">${currentParty.totalPower}</span></p>
                <button id="disbandPartyBtn" class="mt-4 bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700">解散隊伍</button>
            `;
            document.getElementById('disbandPartyBtn').addEventListener('click', disbandParty);
        }
        updateDungeons();
    }

    function handleAssetClick(e) {
        const card = e.target.closest('[data-id]');
        if (!card) return;
        const { id, type } = card.dataset;
        if (type === 'relic') {
            if (currentParty.relic && currentParty.relic.id === id) {
                disbandParty();
            } else {
                disbandParty();
                currentParty.relic = userRelics.find(r => r.id === id);
            }
        } else if (type === 'hero' && currentParty.relic) {
            const hero = userHeroes.find(h => h.id === id);
            const heroIndex = currentParty.heroes.findIndex(h => h.id === id);
            if (heroIndex > -1) {
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

    function disbandParty() {
        currentParty.relic = null;
        currentParty.heroes = [];
        currentParty.totalPower = 0;
        updateSelectionUI();
        updatePartyUI();
    }
    
    // --- 頁面初始化 ---
    function init() {
        const heroChartCtx = document.getElementById('heroChart')?.getContext('2d');
        const relicChartCtx = document.getElementById('relicChart')?.getContext('2d');

        if (heroChartCtx && relicChartCtx) {
            createChart(heroChartCtx, '英雄掉落機率', rarityData);
            createChart(relicChartCtx, '聖物掉落機率', rarityData);
        }

        setupNavigation();
        updateDungeons();
        updatePartyUI();

        connectWalletBtn.addEventListener('click', connectWallet);
        mintHeroBtn.addEventListener('click', mintHero);
        document.getElementById('barracks')?.addEventListener('click', handleAssetClick);
    }

    init();
});
