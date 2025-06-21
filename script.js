document.addEventListener('DOMContentLoaded', () => {
    // --- 全局變數 ---
    let provider, signer, userAddress;
    let soulShardTokenContract, heroContract, relicContract, partyContract, dungeonCoreContract;

    // !!重要!!: 在您完成部署後，必須用真實數據替換這裡的內容
    const SOUL_SHARD_TOKEN_ADDRESS = "YOUR_SOUL_SHARD_TOKEN_ADDRESS";
    const HERO_ADDRESS = "YOUR_HERO_ADDRESS";
    const RELIC_ADDRESS = "YOUR_RELIC_ADDRESS";
    const PARTY_ADDRESS = "YOUR_PARTY_ADDRESS";
    const DUNGEON_CORE_ADDRESS = "YOUR_DUNGEON_CORE_ADDRESS";

    // --- ABI (Application Binary Interface) ---
    const ERC20_ABI = ["function approve(address spender, uint256 amount) returns (bool)", "function allowance(address owner, address spender) view returns (uint256)", "function balanceOf(address account) view returns (uint256)"];
    const HERO_ABI = ["function requestNewHero() returns (uint256)", "function ownerOf(uint256 tokenId) view returns (address)", "function getHeroProperties(uint256 tokenId) view returns (tuple(uint8 rarity, uint256 power))", "function setApprovalForAll(address operator, bool approved)", "function isApprovedForAll(address owner, address operator) view returns (bool)", "event HeroMinted(uint256 indexed requestId, uint256 indexed tokenId, uint8 rarity, uint256 power)"];
    const RELIC_ABI = ["function requestNewRelic() returns (uint256)", "function ownerOf(uint256 tokenId) view returns (address)", "function getRelicProperties(uint256 tokenId) view returns (tuple(uint8 rarity, uint8 capacity))", "function setApprovalForAll(address operator, bool approved)", "function isApprovedForAll(address owner, address operator) view returns (bool)", "event RelicMinted(uint256 indexed requestId, uint256 indexed tokenId, uint8 rarity, uint8 capacity)"];
    const PARTY_ABI = ["function createParty(uint256[] calldata heroIds, uint256[] calldata relicIds) returns (uint256)", "function disbandParty(uint256 partyId)", "function ownerOf(uint256 tokenId) view returns (address)", "function getPartyComposition(uint256 partyId) view returns (tuple(uint256[] heroIds, uint256[] relicIds, uint256 totalPower, uint256 totalCapacity))", "event PartyCreated(uint256 indexed partyId, address indexed owner, uint256[] heroIds, uint256[] relicIds)"];
    const DUNGEON_CORE_ABI = ["function buyProvisions(uint256 partyId, uint256 amount)", "function requestExpedition(uint256 partyId, uint256 dungeonId) returns (uint256)", "function claimRewards(uint256 partyId)", "function withdraw(uint256 amount)", "function dungeons(uint256 dungeonId) view returns (tuple(uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate, bool isInitialized))", "function playerInfo(address player) view returns (tuple(uint256 withdrawableBalance, uint256 lastWithdrawTimestamp))", "event ExpeditionFulfilled(uint256 indexed requestId, uint256 indexed partyId, bool success, uint256 reward)", "event RewardsBanked(address indexed user, uint256 indexed partyId, uint256 amount)", "event TokensWithdrawn(address indexed user, uint256 amount, uint256 taxAmount)"];
    
    // --- 網路設定 ---
    const TARGET_NETWORK = { chainId: '0x61', chainName: 'BSC Testnet' }; // BSC 測試網

    // --- DOM 元素 ---
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const userAddressEl = document.getElementById('userAddress');
    const tokenBalanceEl = document.getElementById('tokenBalance');
    const withdrawableBalanceEl = document.getElementById('withdrawableBalance');
    const withdrawBtn = document.getElementById('withdrawBtn');
    const mintHeroBtn = document.getElementById('mintHeroBtn');
    const mintRelicBtn = document.getElementById('mintRelicBtn');
    const heroesContainer = document.getElementById('heroesContainer');
    const relicsContainer = document.getElementById('relicsContainer');
    const partyCompositionEl = document.getElementById('partyComposition');
    const createPartyBtn = document.getElementById('createPartyBtn');
    const partySelector = document.getElementById('partySelector');
    const dungeonsContainer = document.getElementById('dungeonsContainer');

    // --- 遊戲狀態 (前端暫存) ---
    let selectedHeroes = new Set();
    let selectedRelics = new Set();

    // --- 通知函式 ---
    const showToast = (text, type = 'info') => {
        Toastify({ text, duration: 5000, gravity: "top", position: "right", style: { background: type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8', borderRadius: '10px' } }).showToast();
    };

    // --- Web3 初始化 ---
    const connectWallet = async () => {
        if (typeof window.ethereum === 'undefined') return showToast('請安裝 MetaMask！', 'error');
        try {
            const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (currentChainId !== TARGET_NETWORK.chainId) {
                await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: TARGET_NETWORK.chainId }] });
            }

            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            userAddress = accounts[0];
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();

            soulShardTokenContract = new ethers.Contract(SOUL_SHARD_TOKEN_ADDRESS, ERC20_ABI, signer);
            heroContract = new ethers.Contract(HERO_ADDRESS, HERO_ABI, signer);
            relicContract = new ethers.Contract(RELIC_ADDRESS, RELIC_ABI, signer);
            partyContract = new ethers.Contract(PARTY_ADDRESS, PARTY_ABI, signer);
            dungeonCoreContract = new ethers.Contract(DUNGEON_CORE_ADDRESS, DUNGEON_CORE_ABI, signer);

            connectWalletBtn.textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`;
            userAddressEl.textContent = userAddress;
            showToast('錢包連接成功！', 'success');

            listenForEvents();
            await loadAllData();

            window.ethereum.on('accountsChanged', () => window.location.reload());
            window.ethereum.on('chainChanged', () => window.location.reload());

        } catch (error) {
            console.error("連接錢包失敗:", error);
            showToast('連接錢包失敗，詳情請查看控制台。', 'error');
        }
    };

    // --- 數據加載與刷新 ---
    const loadAllData = async () => {
        if (!userAddress) return;
        const spinner = `<div class="col-span-full text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div></div>`;
        heroesContainer.innerHTML = spinner;
        relicsContainer.innerHTML = spinner;
        await Promise.all([
            updateBalances(),
            fetchAndRenderNfts('hero'),
            fetchAndRenderNfts('relic'),
            fetchAndRenderParties(),
            renderDungeons()
        ]);
    };

    const updateBalances = async () => {
        try {
            const tokenBalance = await soulShardTokenContract.balanceOf(userAddress);
            tokenBalanceEl.textContent = parseFloat(ethers.utils.formatEther(tokenBalance)).toFixed(4);
            const playerInfo = await dungeonCoreContract.playerInfo(userAddress);
            withdrawableBalanceEl.textContent = parseFloat(ethers.utils.formatEther(playerInfo.withdrawableBalance)).toFixed(4);
        } catch (e) {
            console.error("更新餘額失敗:", e);
        }
    };
    
    const fetchAndRenderNfts = async (type) => {
        const contract = type === 'hero' ? heroContract : relicContract;
        const container = type === 'hero' ? heroesContainer : relicsContainer;
        
        try {
            const ownedNfts = [];
            const maxTokenId = 100;
            const promises = [];
            for (let i = 1; i <= maxTokenId; i++) {
                promises.push(
                    contract.ownerOf(i).then(owner => {
                        if (owner.toLowerCase() === userAddress.toLowerCase()) {
                            return (type === 'hero' ? contract.getHeroProperties(i) : contract.getRelicProperties(i))
                                .then(props => ({ id: i, ...props }));
                        }
                        return null;
                    }).catch(() => null)
                );
            }
            const results = await Promise.all(promises);
            ownedNfts.push(...results.filter(Boolean));
            renderNfts(ownedNfts, type);
        } catch (e) {
            console.error(`獲取 ${type} 失敗:`, e);
            container.innerHTML = `<p class="col-span-full text-center text-red-500">加載失敗。</p>`;
        }
    };

    const fetchAndRenderParties = async () => {
        partySelector.innerHTML = '<option value="">正在加載您的隊伍...</option>';
        const ownedParties = [];
        const maxPartyId = 50; 
        const promises = [];
        for (let i = 1; i <= maxPartyId; i++) {
            promises.push(
                partyContract.ownerOf(i).then(owner => {
                    if (owner.toLowerCase() === userAddress.toLowerCase()) {
                        return partyContract.getPartyComposition(i)
                            .then(composition => ({ id: i, totalPower: composition.totalPower.toNumber() }));
                    }
                    return null;
                }).catch(() => null)
            );
        }
        const results = await Promise.all(promises);
        ownedParties.push(...results.filter(Boolean));
        
        partySelector.innerHTML = '<option value="">請選擇一個隊伍</option>';
        if (ownedParties.length === 0) {
            partySelector.innerHTML = '<option value="">您還沒有創建任何隊伍</option>';
        }
        ownedParties.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = `隊伍 #${p.id} (戰力: ${p.totalPower})`;
            partySelector.appendChild(option);
        });
    };

    // --- UI 渲染 ---
    const renderNfts = (nfts, type) => {
        const container = type === 'hero' ? heroesContainer : relicsContainer;
        if (nfts.length === 0) {
            container.innerHTML = `<p class="col-span-full text-center text-gray-500">您還沒有任何${type === 'hero' ? '英雄' : '聖物'}。</p>`;
            return;
        }
        container.innerHTML = nfts.map(nft => `
            <div class="nft-card card-bg p-3 rounded-lg text-center cursor-pointer border-2 border-transparent transition-all hover:shadow-lg hover:border-indigo-400" data-id="${nft.id}" data-type="${type}">
                <p class="font-bold text-sm">${type === 'hero' ? '英雄' : '聖物'} #${nft.id}</p>
                <p class="text-xs text-gray-500">稀有度: ${"★".repeat(nft.rarity)}${"☆".repeat(5-nft.rarity)}</p>
                <p class="text-lg font-bold mt-1 text-indigo-600">${type === 'hero' ? `${nft.power.toString()} MP` : `容量: ${nft.capacity}`}</p>
            </div>
        `).join('');
    };

    const renderDungeons = async () => {
        let content = '';
        for (let i = 1; i <= 10; i++) {
            try {
                const dungeon = await dungeonCoreContract.dungeons(i);
                content += `
                    <div class="card-bg p-4 rounded-xl shadow-lg flex flex-col">
                        <h4 class="text-xl font-bold font-serif">${getDungeonName(i)}</h4>
                        <div class="flex-grow">
                           <p class="text-sm text-gray-600">要求戰力: ${dungeon.requiredPower}</p>
                           <p class="text-lg mt-2">基礎獎勵: ~$${parseFloat(ethers.utils.formatEther(dungeon.rewardAmountUSD)).toFixed(2)}</p>
                           <p class="text-sm">成功率: ${dungeon.baseSuccessRate}%</p>
                        </div>
                        <button class="w-full mt-4 btn-primary py-2 rounded-lg expedition-btn" data-dungeon-id="${i}">派遣遠征</button>
                    </div>
                `;
            } catch (e) { continue; }
        }
        dungeonsContainer.innerHTML = content;
    };
    
    const getDungeonName = (id) => {
        const names = ["", "哥布林洞穴", "食人魔山谷", "蜘蛛巢穴", "石化蜥蜴沼澤", "巫妖墓穴", "奇美拉之巢", "惡魔前哨站", "巨龍之巔", "裂空星", "混沌深淵"];
        return names[id] || "未知地城";
    };

    const updatePartyCompositionUI = () => {
        let heroHtml = '<div><h4 class="font-bold">英雄:</h4>';
        if (selectedHeroes.size > 0) {
            selectedHeroes.forEach(id => heroHtml += `<p class="text-sm ml-2">- 英雄 #${id}</p>`);
        } else {
            heroHtml += '<p class="text-sm ml-2 text-gray-500">點擊左側列表選擇</p>';
        }
        heroHtml += '</div>';

        let relicHtml = '<div><h4 class="font-bold">聖物:</h4>';
        if (selectedRelics.size > 0) {
            selectedRelics.forEach(id => relicHtml += `<p class="text-sm ml-2">- 聖物 #${id}</p>`);
        } else {
            relicHtml += '<p class="text-sm ml-2 text-gray-500">點擊左側列表選擇</p>';
        }
        relicHtml += '</div>';
        partyCompositionEl.innerHTML = relicHtml + heroHtml;
    };
    
    // --- 核心互動函式 ---
    const handleNftSelection = (e) => {
        const card = e.target.closest('.nft-card');
        if (!card) return;

        const { id, type } = card.dataset;
        const idNum = parseInt(id);
        const selectionSet = type === 'hero' ? selectedHeroes : selectedRelics;

        if (selectionSet.has(idNum)) {
            selectionSet.delete(idNum);
            card.classList.remove('selected', 'ring-4', 'ring-indigo-500');
        } else {
            selectionSet.add(idNum);
            card.classList.add('selected', 'ring-4', 'ring-indigo-500');
        }
        updatePartyCompositionUI();
    };
    
    const executeTx = async (callback, operationName) => {
        showToast(`${operationName}請求已發送...`, 'info');
        try {
            const tx = await callback();
            await tx.wait();
            showToast(`${operationName}成功！`, 'success');
            await loadAllData();
            return true;
        } catch (e) {
            console.error(`${operationName}失敗:`, e);
            showToast(e.reason || `${operationName}失敗，詳情請查看控制台`, 'error');
            return false;
        }
    };
    
    const mint = async (type) => {
        const contract = type === 'hero' ? heroContract : relicContract;
        const spender = type === 'hero' ? HERO_ADDRESS : RELIC_ADDRESS;
        const action = type === 'hero' ? 'requestNewHero' : 'requestNewRelic';
        
        await approveAndExecute(SOUL_SHARD_TOKEN_ADDRESS, spender, () => contract[action]());
    };

    const approveAndExecute = async (tokenAddress, spender, callback) => {
        showToast('請求代幣授權...', 'info');
        try {
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
            const allowance = await tokenContract.allowance(userAddress, spender);
            // 授權一個非常大的數額，避免重複授權
            if (allowance.lt(ethers.utils.parseEther("1000000"))) {
                 const approveTx = await tokenContract.approve(spender, ethers.constants.MaxUint256);
                 await approveTx.wait();
                 showToast('代幣授權成功!', 'success');
            }
            
            await executeTx(callback, "鑄造");
        } catch (e) {
             console.error("授權或執行失敗:", e);
             showToast(e.reason || '操作失敗', 'error');
        }
    };

    const createParty = async () => {
        if (selectedRelics.size === 0) return showToast('請至少選擇一個聖物!', 'error');
        showToast('正在授權 NFT 給隊伍合約...', 'info');
        try {
            const heroApproved = await heroContract.isApprovedForAll(userAddress, PARTY_ADDRESS);
            if (!heroApproved) {
                const tx = await heroContract.setApprovalForAll(PARTY_ADDRESS, true);
                await tx.wait();
            }
            const relicApproved = await relicContract.isApprovedForAll(userAddress, PARTY_ADDRESS);
            if (!relicApproved) {
                const tx = await relicContract.setApprovalForAll(PARTY_ADDRESS, true);
                await tx.wait();
            }
            
            await executeTx(() => partyContract.createParty(Array.from(selectedHeroes), Array.from(selectedRelics)), "創建隊伍");

            selectedHeroes.clear();
            selectedRelics.clear();
            document.querySelectorAll('.nft-card.selected').forEach(el => el.classList.remove('selected', 'ring-4', 'ring-indigo-500'));
            updatePartyCompositionUI();
        } catch(e) {
            console.error("創建隊伍失敗:", e);
            showToast(e.reason || '創建隊伍失敗', 'error');
        }
    };
    
    const startExpedition = async (dungeonId) => {
        const partyId = partySelector.value;
        if (!partyId) return showToast('請先選擇一個隊伍', 'error');
        
        showToast('正在購買遠征儲備...', 'info');
        await approveAndExecute(SOUL_SHARD_TOKEN_ADDRESS, DUNGEON_CORE_ADDRESS, async () => {
            await dungeonCoreContract.buyProvisions(partyId, 1);
            showToast('儲備購買成功！正在派遣遠征...', 'success');
            return dungeonCoreContract.requestExpedition(partyId, dungeonId);
        });
    };

    // --- 事件監聽器 ---
    const listenForEvents = () => {
        // 為避免重複監聽，先移除舊的監聽器
        heroContract.removeAllListeners("HeroMinted");
        relicContract.removeAllListeners("RelicMinted");
        partyContract.removeAllListeners("PartyCreated");
        dungeonCoreContract.removeAllListeners("ExpeditionFulfilled");
        dungeonCoreContract.removeAllListeners("TokensWithdrawn");
        
        heroContract.on("HeroMinted", (requestId, tokenId, rarity, power) => {
            showToast(`英雄 #${tokenId.toString()} 鑄造成功！稀有度: ${rarity}, 戰力: ${power.toString()}`, 'success');
            fetchAndRenderNfts('hero');
        });
        relicContract.on("RelicMinted", (requestId, tokenId, rarity, capacity) => {
            showToast(`聖物 #${tokenId.toString()} 鑄造成功！稀有度: ${rarity}, 容量: ${capacity}`, 'success');
            fetchAndRenderNfts('relic');
        });
        partyContract.on("PartyCreated", (partyId, owner) => {
            if (owner.toLowerCase() === userAddress.toLowerCase()) {
                showToast(`隊伍 #${partyId.toString()} 創建成功！`, 'success');
                fetchAndRenderParties();
            }
        });
        dungeonCoreContract.on("ExpeditionFulfilled", (requestId, partyId, success, reward) => {
            showToast(`隊伍 #${partyId.toString()} 遠征完成！結果: ${success ? '成功' : '失敗'}。`, success ? 'success' : 'error');
            if(success){
                showToast('獎勵已存入您的金庫，請在「儀表板」領取。', 'info');
                updateBalances();
            }
        });
        dungeonCoreContract.on("TokensWithdrawn", (user, amount, taxAmount) => {
            if(user.toLowerCase() === userAddress.toLowerCase()){
                showToast(`成功提領 ${ethers.utils.formatEther(amount)} $SoulShard！`, 'success');
                updateBalances();
            }
        });
    };

    const setupEventListeners = () => {
        connectWalletBtn.addEventListener('click', connectWallet);
        mintHeroBtn.addEventListener('click', () => mint('hero'));
        mintRelicBtn.addEventListener('click', () => mint('relic'));
        
        heroesContainer.addEventListener('click', handleNftSelection);
        relicsContainer.addEventListener('click', handleNftSelection);
        createPartyBtn.addEventListener('click', createParty);
        
        dungeonsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('expedition-btn')) {
                const dungeonId = e.target.dataset.dungeonId;
                startExpedition(dungeonId);
            }
        });

        withdrawBtn.addEventListener('click', async () => {
            const amountInput = document.getElementById('withdrawAmount');
            if (!amountInput.value || parseFloat(amountInput.value) <= 0) return showToast('請輸入有效的提領數量', 'error');
            const amount = ethers.utils.parseEther(amountInput.value);
            // Withdraw 不需授權，因為是從合約自身轉出
            await executeTx(() => dungeonCoreContract.withdraw(amount), "提領");
        });

        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                e.target.classList.add('active');
                document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
                document.getElementById(e.target.dataset.target).classList.remove('hidden');
            });
        });
    };

    // --- 初始化 ---
    setupEventListeners();
    updatePartyCompositionUI();
});
