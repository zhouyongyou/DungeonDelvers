document.addEventListener('DOMContentLoaded', () => {
    // --- Ethers.js 和合約相關變數 ---
    let provider, signer, userAddress;
    let soulShardTokenContract, assetsContract, stakingPoolContract;

    // !!重要!!: 在您完成部署後，必須用真實數據替換這裡的內容
    const soulShardTokenAddress = "YOUR_SOULSHARD_TOKEN_ADDRESS";
    const assetsContractAddress = "YOUR_ASSETS_CONTRACT_ADDRESS";
    const stakingPoolAddress = "YOUR_STAKING_POOL_ADDRESS";
    
    // ABI - 部署後填入
    const soulShardTokenABI = [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function balanceOf(address account) view returns (uint256)"
    ];
    const assetsContractABI = [
        "function heroMintPrice() view returns (uint256)",
        "function relicMintPrice() view returns (uint256)",
        "function mintHero()",
        "function mintRelic()",
        "function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])",
        "function setApprovalForAll(address operator, bool approved)"
    ];
    const stakingPoolABI = [
        "function stake(uint256 relicId, uint256 relicCapacity, tuple(uint256, uint256)[] calldata heroes)",
        "function withdraw()",
        "function claimRewards()",
        "function restHeroes()",
        "function getStakerInfo(address user) view returns (tuple(uint256, uint256, tuple(uint256, uint256)[], uint256, uint256, uint256, uint256), uint256)"
    ];

    // --- 網路設定 ---
    const targetNetwork = {
        chainId: '0x38', // 56 (BSC Mainnet)
        chainName: 'BNB Smart Chain (BSC) Mainnet',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        rpcUrls: ['https://bsc-dataseed.binance.org/'],
        blockExplorerUrls: ['https://bscscan.com/'],
    };
    
    // --- 靜態資料定義 ---
    const rarityData = {
        labels: ['1 星 (普通)', '2 星 (非凡)', '3 星 (稀有)', '4 星 (史詩)', '5 星 (傳說)'],
        chances: [44, 35, 15, 5, 1],
        colors: ['#A9A9A9', '#6A8CAF', '#8B5CF6', '#D946EF', '#FBBF24'],
        power: { '1': {min: 15, max: 50}, '2': {min: 50, max: 100}, '3': {min: 100, max: 150}, '4': {min: 150, max: 200}, '5': {min: 200, max: 255} },
        capacity: {'1': 1, '2': 2, '3': 3, '4': 4, '5': 5}
    };
    const dungeonsData = [
        { name: '新手礦洞', requiredPower: 0, reward: 10 }, { name: '哥布林洞穴', requiredPower: 100, reward: 25 }, { name: '食人魔山谷', requiredPower: 250, reward: 60 },
        { name: '蜘蛛巢穴', requiredPower: 500, reward: 120 }, { name: '石化蜥蜴沼澤', requiredPower: 800, reward: 200 }, { name: '巫妖墓穴', requiredPower: 1200, reward: 350 },
        { name: '奇美拉之巢', requiredPower: 1800, reward: 550 }, { name: '惡魔前哨站', requiredPower: 2500, reward: 800 }, { name: '巨龍之巔', requiredPower: 3500, reward: 1200 },
        { name: '混沌深淵', requiredPower: 5000, reward: 2000 },
    ];

    // --- 遊戲狀態 ---
    let userHeroes = [], userRelics = [];
    let currentParty = { relic: null, heroes: [], totalPower: 0 };
    
    // --- DOM 元素 ---
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const mintHeroBtn = document.getElementById('mintHeroBtn');
    const mintRelicBtn = document.getElementById('mintRelicBtn');
    const approveNftsBtn = document.getElementById('approveNftsBtn');
    const dungeonsContainer = document.getElementById('dungeonsContainer');
    const heroesContainer = document.getElementById('heroesContainer');
    const relicsContainer = document.getElementById('relicsContainer');
    const dashboardStatus = document.querySelector("#dashboard .bg-white\\/50");

    // --- 網路檢查與切換 (完整版) ---
    const checkAndSwitchNetwork = async () => {
        if (!window.ethereum) return false;
        try {
            const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (currentChainId !== targetNetwork.chainId) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: targetNetwork.chainId }],
                    });
                } catch (switchError) {
                    if (switchError.code === 4902) {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [targetNetwork],
                        });
                    } else { throw switchError; }
                }
            }
            return true;
        } catch (error) {
            console.error("網路切換失敗:", error);
            alert(`網路切換失敗，請手動將您的錢包網路切換至 ${targetNetwork.chainName}。`);
            return false;
        }
    };

    // --- 連接錢包與初始化 ---
    const connectWallet = async () => {
        if (typeof window.ethereum === 'undefined') { alert('請安裝 MetaMask！'); return; }
        try {
            const isNetworkCorrect = await checkAndSwitchNetwork();
            if (!isNetworkCorrect) return;

            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            userAddress = accounts[0];
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            
            soulShardTokenContract = new ethers.Contract(soulShardTokenAddress, soulShardTokenABI, signer);
            assetsContract = new ethers.Contract(assetsContractAddress, assetsContractABI, signer);
            stakingPoolContract = new ethers.Contract(stakingPoolAddress, stakingPoolABI, signer);

            connectWalletBtn.textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`;
            connectWalletBtn.disabled = true;

            await Promise.all([updateTokenBalance(), fetchUserAssets()]);
            
            window.ethereum.on('accountsChanged', () => window.location.reload());
            window.ethereum.on('chainChanged', () => window.location.reload());
        } catch (error) {
            console.error("連接錢包失敗:", error);
            alert("連接失敗，可能是合約地址或 ABI 不正確，請檢查主控台。");
        }
    };

    // --- 核心互動函式 ---
    const updateTokenBalance = async () => {
        if (!soulShardTokenContract || !userAddress) return;
        try {
            const balance = await soulShardTokenContract.balanceOf(userAddress);
            const formattedBalance = parseFloat(ethers.utils.formatEther(balance)).toFixed(4);
            dashboardStatus.innerHTML = `
                <h3 class="text-2xl font-bold text-[#2D2A4A] mb-4">玩家狀態</h3>
                <p class="text-lg">錢包地址: <span class="font-mono text-sm">${userAddress}</span></p>
                <p class="text-lg mt-2">$SoulShard 餘額: <span class="font-bold text-yellow-600">${formattedBalance}</span></p>
            `;
        } catch(e) {
            dashboardStatus.innerHTML = `<p class="text-red-500">無法讀取餘額，請確認合約地址與 ABI 是否正確。</p>`
        }
    };
    
    const approveTokens = async (spenderAddress, amount) => {
        if (!soulShardTokenContract) return false;
        try {
            const tx = await soulShardTokenContract.approve(spenderAddress, amount);
            alert(`正在請求授權...請在錢包中確認交易。`);
            await tx.wait();
            alert("授權成功！現在您可以進行下一步操作。");
            return true;
        } catch (error) {
            console.error("授權失敗:", error);
            alert("授權失敗！請查看主控台獲取詳情。");
            return false;
        }
    };

    const mintHero = async () => {
        if (!assetsContract) { alert('請先連接錢包'); return; }
        try {
            const price = await assetsContract.heroMintPrice();
            const success = await approveTokens(assetsContractAddress, price);
            if (!success) return;

            const tx = await assetsContract.mintHero();
            alert("英雄招募交易已送出...請等待區塊鏈確認。");
            await tx.wait();
            alert("招募成功！您的新英雄已加入隊伍。");
            await Promise.all([updateTokenBalance(), fetchUserAssets()]);
        } catch (error) {
            console.error("招募失敗:", error);
            alert("招募失敗，請查看主控台。");
        }
    };
    
    // --- **新增**：鑄造聖物功能 ---
    const mintRelic = async () => {
        if (!assetsContract) { alert('請先連接錢包'); return; }
        try {
            // 1. 從合約獲取鑄造價格
            const price = await assetsContract.relicMintPrice();
            // 2. 請求使用者授權代幣
            const success = await approveTokens(assetsContractAddress, price);
            if (!success) return; // 如果授權失敗，則中止

            // 3. 呼叫合約的 mintRelic 函式
            const tx = await assetsContract.mintRelic();
            alert("聖物鑄造交易已送出...請等待區塊鏈確認。");
            await tx.wait();
            alert("鑄造成功！您的新聖物已加入收藏。");
            // 4. 成功後，更新代幣餘額和 NFT 列表
            await Promise.all([updateTokenBalance(), fetchUserAssets()]);
        } catch (error) {
            console.error("鑄造聖物失敗:", error);
            alert("鑄造聖物失敗，請查看主控台。");
        }
    };
    
    // --- **新增**: 授權 NFT 函式 ---
    const approveAllNfts = async () => {
        if (!assetsContract) { alert('請先連接錢包'); return; }
        try {
            // 請求使用者授權 StakingPool 合約可以轉移他所有的 NFT
            const tx = await assetsContract.setApprovalForAll(stakingPoolAddress, true);
            alert("正在請求 NFT 授權...請在錢包中確認。這是一次性操作。");
            await tx.wait();
            alert("NFT 授權成功！您現在可以開始遠征了。");
        } catch (error) {
            console.error("NFT 授權失敗:", error);
            alert("NFT 授權失敗，請查看主控台。");
        }
    };
    
    // --- **新增**: 實現質押功能 (開始遠征) ---
    const stakeParty = async () => {
        if (!stakingPoolContract) { alert('請先連接錢包'); return; }
        if (!currentParty.relic || currentParty.heroes.length === 0) {
            alert("請先在「我的隊伍」頁面組建一個包含英雄和聖物的完整隊伍。");
            return;
        }

        try {
            // 1. 格式化英雄數據以符合合約要求
            const heroesToStake = currentParty.heroes.map(h => ({
                tokenId: h.tokenId,
                power: h.power
            }));

            // 2. 呼叫 StakingPool 合約的 stake 函式
            const tx = await stakingPoolContract.stake(
                currentParty.relic.tokenId,
                currentParty.relic.capacity,
                heroesToStake
            );
            
            alert("隊伍正在前往地下城...請等待區塊鏈確認。");
            await tx.wait();
            alert("隊伍已成功進入地下城！開始賺取獎勵。");

            // 3. 成功後，重置前端狀態並更新數據
            disbandParty(); // 清空當前隊伍選擇
            await fetchUserAssets(); // 刷新擁有的 NFT 列表
            // TODO: 更新質押狀態顯示
            
        } catch (error) {
            console.error("開始遠征失敗:", error);
            // 常見錯誤：使用者尚未授權 NFT
            if (error.message.includes("is not approved")) {
                 alert("遠征失敗！原因：您尚未授權 NFT 轉移權限。請先到「我的隊伍」頁面點擊授權按鈕。");
            } else {
                 alert("遠征失敗，請查看主控台獲取詳情。");
            }
        }
    };

    // --- 待完成的函式邏輯 ---
    const claimAllRewards = async () => { /* ... */ };
    const withdrawParty = async () => { /* ... */ };
    const restAllStakedHeroes = async () => { /* ... */ };

    // --- 資料讀取與渲染 ---
        const fetchUserAssets = async () => {
        if (!assetsContract || !userAddress) return;
        heroesContainer.innerHTML = '<p class="col-span-full text-center text-gray-200">正在從區塊鏈讀取您的資產...</p>';
        relicsContainer.innerHTML = '';
        try {
            const heroTokenIds = [1, 2, 3, 4, 5]; 
            const relicTokenIds = [11, 12, 13, 14, 15];
            const allTokenIds = [...heroTokenIds, ...relicTokenIds];
            const userAddresses = Array(allTokenIds.length).fill(userAddress);
            const balances = await assetsContract.balanceOfBatch(userAddresses, allTokenIds);
            let fetchedHeroes = [];
            let fetchedRelics = [];
            for (let i = 0; i < balances.length; i++) {
                const balance = balances[i].toNumber();
                if (balance > 0) {
                    const tokenId = allTokenIds[i];
                    for (let j = 0; j < balance; j++) {
                        const uniqueId = `${tokenId}-${j}`;
                        if (heroTokenIds.includes(tokenId)) {
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
        dungeonsContainer.innerHTML = dungeonsData.map(dungeon => {
            const canEnter = currentParty.totalPower >= dungeon.requiredPower;
            return `
            <div class="card-bg p-4 rounded-xl ${!canEnter ? 'disabled-card' : ''}">
                <h4 class="text-xl font-bold font-serif">${dungeon.name}</h4>
                <p class="text-sm text-gray-300">要求戰力: ${dungeon.requiredPower}</p>
                <p class="text-lg mt-2 text-[#C0A573]">獎勵: ${dungeon.reward} $SoulShard</p>
                <button 
                    class="w-full mt-4 btn-primary py-2 rounded-lg stake-btn ${!canEnter ? 'cursor-not-allowed opacity-50' : ''}" 
                    ${!canEnter ? 'disabled' : ''}
                    data-dungeon-name="${dungeon.name}"
                >
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
        mintRelicBtn.addEventListener('click', mintRelic);
        approveNftsBtn.addEventListener('click', approveAllNfts); // **新增**
        
        // **新增**: 使用事件委派來處理動態生成的按鈕
        dungeonsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('stake-btn')) {
                stakeParty();
            }
        });

        document.getElementById('barracks')?.addEventListener('click', handleAssetClick);
    }

    init();
});
