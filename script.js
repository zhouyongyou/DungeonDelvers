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
    const queryPartyBtn = document.getElementById('queryPartyBtn');
    const queryHeroBtn = document.getElementById('queryHeroBtn');
    const queryRelicBtn = document.getElementById('queryRelicBtn');
    const partyQueryResultEl = document.getElementById('partyQueryResult');
    const heroQueryResultEl = document.getElementById('heroQueryResult');
    const relicQueryResultEl = document.getElementById('relicQueryResult');

    let selectedHeroes = new Set();
    let selectedRelics = new Set();

    const showToast = (text, type = 'info') => Toastify({ text, duration: 5000, gravity: "top", position: "right", style: { background: type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8', borderRadius: '10px' } }).showToast();

    const connectWallet = async () => {
        if (typeof window.ethereum === 'undefined') return showToast('請安裝 MetaMask！', 'error');
        try {
            if (await window.ethereum.request({ method: 'eth_chainId' }) !== TARGET_NETWORK.chainId) {
                await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: TARGET_NETWORK.chainId }] });
            }

            [userAddress] = await window.ethereum.request({ method: 'eth_requestAccounts' });
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();

            soulShardTokenContract = new ethers.Contract(SOUL_SHARD_TOKEN_ADDRESS, ERC20_ABI, signer);
            heroContract = new ethers.Contract(HERO_ADDRESS, HERO_ABI, signer);
            relicContract = new ethers.Contract(RELIC_ADDRESS, RELIC_ABI, signer);
            partyContract = new ethers.Contract(PARTY_ADDRESS, PARTY_ABI, signer);
            dungeonCoreContract = new ethers.Contract(DUNGEON_CORE_ADDRESS, DUNGEON_CORE_ABI, signer);

            connectWalletBtn.textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
            userAddressEl.textContent = userAddress;
            showToast('錢包連接成功！', 'success');

            listenForEvents();
            await loadAllData();

            window.ethereum.on('accountsChanged', () => window.location.reload());
            window.ethereum.on('chainChanged', () => window.location.reload());

        } catch (e) {
            console.error("連接錢包失敗:", e);
            showToast('連接錢包失敗', 'error');
        }
    };

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
        } catch (e) { console.error("更新餘額失敗:", e); }
    };
    
    const fetchAndRenderNfts = async (type) => {
        const contract = type === 'hero' ? heroContract : relicContract;
        const container = type === 'hero' ? heroesContainer : relicsContainer;
        
        try {
            const ownedNfts = [];
            const maxTokenId = 200;
            const promises = Array.from({ length: maxTokenId }, (_, i) => i + 1).map(id =>
                contract.ownerOf(id).then(owner => {
                    if (owner.toLowerCase() === userAddress.toLowerCase()) {
                        return (type === 'hero' ? contract.getHeroProperties(id) : contract.getRelicProperties(id))
                            .then(props => ({ id, ...props }));
                    }
                    return null;
                }).catch(() => null)
            );
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
        const promises = Array.from({ length: maxPartyId }, (_, i) => i + 1).map(id =>
            partyContract.ownerOf(id).then(owner => {
                if (owner.toLowerCase() === userAddress.toLowerCase()) {
                    return partyContract.getPartyComposition(id)
                        .then(composition => ({ id, totalPower: composition.totalPower.toNumber() }));
                }
                return null;
            }).catch(() => null)
        );
        const results = await Promise.all(promises);
        ownedParties.push(...results.filter(Boolean));
        
        partySelector.innerHTML = '<option value="">請選擇一個隊伍</option>';
        if (ownedParties.length === 0) partySelector.innerHTML = '<option value="">您還沒有創建任何隊伍</option>';
        ownedParties.forEach(p => {
            partySelector.innerHTML += `<option value="${p.id}">隊伍 #${p.id} (戰力: ${p.totalPower})</option>`;
        });
    };

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
                const d = await dungeonCoreContract.dungeons(i);
                content += `<div class="card-bg p-4 rounded-xl shadow-lg flex flex-col"><h4 class="text-xl font-bold font-serif">${getDungeonName(i)}</h4><div class="flex-grow"><p class="text-sm text-gray-600">要求戰力: ${d.requiredPower}</p><p class="text-lg mt-2">基礎獎勵: ~$${parseFloat(ethers.utils.formatEther(d.rewardAmountUSD)).toFixed(2)}</p><p class="text-sm">成功率: ${d.baseSuccessRate}%</p></div><button class="w-full mt-4 btn-primary py-2 rounded-lg expedition-btn" data-dungeon-id="${i}">派遣遠征</button></div>`;
            } catch (e) { continue; }
        }
        dungeonsContainer.innerHTML = content;
    };
    
    const getDungeonName = (id) => ["", "哥布林洞穴", "食人魔山谷", "蜘蛛巢穴", "石化蜥蜴沼澤", "巫妖墓穴", "奇美拉之巢", "惡魔前哨站", "巨龍之巔", "裂空星", "混沌深淵"][id] || "未知地城";

    const updatePartyCompositionUI = () => {
        let heroHtml = '<div><h4 class="font-bold">英雄:</h4>';
        if (selectedHeroes.size > 0) selectedHeroes.forEach(id => heroHtml += `<p class="text-sm ml-2">- 英雄 #${id}</p>`);
        else heroHtml += '<p class="text-sm ml-2 text-gray-500">點擊左側列表選擇</p>';
        heroHtml += '</div>';
        let relicHtml = '<div><h4 class="font-bold">聖物:</h4>';
        if (selectedRelics.size > 0) selectedRelics.forEach(id => relicHtml += `<p class="text-sm ml-2">- 聖物 #${id}</p>`);
        else relicHtml += '<p class="text-sm ml-2 text-gray-500">點擊左側列表選擇</p>';
        relicHtml += '</div>';
        partyCompositionEl.innerHTML = relicHtml + heroHtml;
    };
    
    const handleNftSelection = (e) => {
        const card = e.target.closest('.nft-card');
        if (!card) return;
        const { id, type } = card.dataset;
        const idNum = parseInt(id);
        const selectionSet = type === 'hero' ? selectedHeroes : selectedRelics;
        card.classList.toggle('selected');
        card.classList.toggle('ring-4');
        card.classList.toggle('ring-indigo-500');
        selectionSet.has(idNum) ? selectionSet.delete(idNum) : selectionSet.add(idNum);
        updatePartyCompositionUI();
    };
    
    const executeTx = async (callback, opName) => {
        showToast(`${opName}請求已發送...`, 'info');
        try {
            const tx = await callback();
            await tx.wait();
            showToast(`${opName}成功！`, 'success');
            await loadAllData();
            return true;
        } catch (e) {
            console.error(`${opName}失敗:`, e);
            showToast(e.reason || `${opName}失敗`, 'error');
            return false;
        }
    };
    
    const mint = async (type) => {
        const spender = type === 'hero' ? HERO_ADDRESS : RELIC_ADDRESS;
        const action = () => type === 'hero' ? heroContract.requestNewHero() : relicContract.requestNewRelic();
        await approveAndExecute(SOUL_SHARD_TOKEN_ADDRESS, spender, action, "鑄造");
    };

    const approveAndExecute = async (tokenAddr, spender, callback, opName = "執行") => {
        showToast('請求代幣授權...', 'info');
        try {
            const token = new ethers.Contract(tokenAddr, ERC20_ABI, signer);
            if ((await token.allowance(userAddress, spender)).lt(ethers.utils.parseEther("1000000"))) {
                const approveTx = await token.approve(spender, ethers.constants.MaxUint256);
                await approveTx.wait();
                showToast('代幣授權成功!', 'success');
            }
            await executeTx(callback, opName);
        } catch (e) { console.error("授權或執行失敗:", e); showToast(e.reason || '操作失敗', 'error'); }
    };

    const createParty = async () => {
        if (selectedRelics.size === 0) return showToast('請至少選擇一個聖物!', 'error');
        showToast('正在授權 NFT 給隊伍合約...', 'info');
        try {
            if (!(await heroContract.isApprovedForAll(userAddress, PARTY_ADDRESS))) {
                await (await heroContract.setApprovalForAll(PARTY_ADDRESS, true)).wait();
            }
            if (!(await relicContract.isApprovedForAll(userAddress, PARTY_ADDRESS))) {
                await (await relicContract.setApprovalForAll(PARTY_ADDRESS, true)).wait();
            }
            await executeTx(() => partyContract.createParty(Array.from(selectedHeroes), Array.from(selectedRelics)), "創建隊伍");
            selectedHeroes.clear();
            selectedRelics.clear();
            document.querySelectorAll('.nft-card.selected').forEach(el => el.classList.remove('selected', 'ring-4', 'ring-indigo-500'));
            updatePartyCompositionUI();
        } catch(e) { console.error("創建隊伍失敗:", e); showToast(e.reason || '創建隊伍失敗', 'error'); }
    };
    
    const startExpedition = async (dungeonId) => {
        const partyId = partySelector.value;
        if (!partyId) return showToast('請先選擇一個隊伍', 'error');
        await approveAndExecute(SOUL_SHARD_TOKEN_ADDRESS, DUNGEON_CORE_ADDRESS, async () => {
            showToast('正在購買遠征儲備...', 'info');
            await dungeonCoreContract.buyProvisions(partyId, 1);
            showToast('儲備購買成功！正在派遣遠征...', 'success');
            return dungeonCoreContract.requestExpedition(partyId, dungeonId);
        }, "遠征");
    };
    
    const withdrawAll = async () => {
        if (!userAddress || !dungeonCoreContract) return;
        try {
            const playerInfo = await dungeonCoreContract.playerInfo(userAddress);
            const balance = playerInfo.withdrawableBalance;
            if (balance.isZero()) {
                return showToast('您的金庫中沒有可提領的餘額。', 'info');
            }
            await executeTx(() => dungeonCoreContract.withdraw(balance), "全部提領");
        } catch (e) {
            console.error("提領失敗:", e);
            showToast(e.reason || '提領失敗', 'error');
        }
    };
    
    const queryHero = async () => {
        const id = document.getElementById('queryHeroId').value;
        if(!id) return heroQueryResultEl.innerHTML = '請輸入英雄 ID';
        heroQueryResultEl.innerHTML = '查詢中...';
        try {
            const props = await heroContract.getHeroProperties(id);
            const owner = await heroContract.ownerOf(id);
            heroQueryResultEl.innerHTML = `<p><b>擁有者:</b> <span class="font-mono text-xs">${owner}</span></p><p><b>稀有度:</b> ${props.rarity}</p><p><b>戰力:</b> ${props.power.toString()}</p>`;
        } catch (e) {
            heroQueryResultEl.innerHTML = `<p class="text-red-500">查詢失敗: 可能是 ID 不存在或發生錯誤。</p>`;
        }
    };
    
    const queryRelic = async () => {
        const id = document.getElementById('queryRelicId').value;
        if(!id) return relicQueryResultEl.innerHTML = '請輸入聖物 ID';
        relicQueryResultEl.innerHTML = '查詢中...';
        try {
            const props = await relicContract.getRelicProperties(id);
            const owner = await relicContract.ownerOf(id);
            relicQueryResultEl.innerHTML = `<p><b>擁有者:</b> <span class="font-mono text-xs">${owner}</span></p><p><b>稀有度:</b> ${props.rarity}</p><p><b>容量:</b> ${props.capacity}</p>`;
        } catch (e) {
            relicQueryResultEl.innerHTML = `<p class="text-red-500">查詢失敗: 可能是 ID 不存在或發生錯誤。</p>`;
        }
    };

    const queryParty = async () => {
        const id = document.getElementById('queryPartyId').value;
        if(!id) return partyQueryResultEl.innerHTML = '請輸入隊伍 ID';
        partyQueryResultEl.innerHTML = '查詢中...';
        try {
            const props = await partyContract.getPartyComposition(id);
            const owner = await partyContract.ownerOf(id);
            partyQueryResultEl.innerHTML = `
                <p><b>擁有者:</b> <span class="font-mono text-xs">${owner}</span></p>
                <p><b>總戰力:</b> ${props.totalPower.toString()}</p>
                <p><b>總容量:</b> ${props.totalCapacity.toString()}</p>
                <p><b>英雄列表 (ID):</b> ${props.heroIds.join(', ')}</p>
                <p><b>聖物列表 (ID):</b> ${props.relicIds.join(', ')}</p>
            `;
        } catch (e) {
            partyQueryResultEl.innerHTML = `<p class="text-red-500">查詢失敗: 可能是 ID 不存在或發生錯誤。</p>`;
        }
    };

    const listenForEvents = () => {
        heroContract.removeAllListeners(); relicContract.removeAllListeners(); partyContract.removeAllListeners(); dungeonCoreContract.removeAllListeners();
        
        heroContract.on("HeroMinted", () => { showToast(`英雄鑄造成功！`, 'success'); fetchAndRenderNfts('hero'); });
        relicContract.on("RelicMinted", () => { showToast(`聖物鑄造成功！`, 'success'); fetchAndRenderNfts('relic'); });
        partyContract.on("PartyCreated", (partyId, owner) => { if (owner.toLowerCase() === userAddress.toLowerCase()) { showToast(`隊伍 #${partyId.toString()} 創建成功！`, 'success'); fetchAndRenderParties(); }});
        dungeonCoreContract.on("ExpeditionFulfilled", (requestId, partyId, success) => { showToast(`隊伍 #${partyId.toString()} 遠征完成！結果: ${success ? '成功' : '失敗'}。`, success ? 'success' : 'error'); if(success){ showToast('獎勵已存入您的金庫。', 'info'); updateBalances(); }});
        dungeonCoreContract.on("TokensWithdrawn", (user) => { if(user.toLowerCase() === userAddress.toLowerCase()){ showToast(`提領成功！`, 'success'); updateBalances(); }});
    };

    const setupEventListeners = () => {
        connectWalletBtn.addEventListener('click', connectWallet);
        mintHeroBtn.addEventListener('click', () => mint('hero'));
        mintRelicBtn.addEventListener('click', () => mint('relic'));
        heroesContainer.addEventListener('click', handleNftSelection);
        relicsContainer.addEventListener('click', handleNftSelection);
        createPartyBtn.addEventListener('click', createParty);
        dungeonsContainer.addEventListener('click', e => { if (e.target.classList.contains('expedition-btn')) startExpedition(e.target.dataset.dungeonId); });
        withdrawBtn.addEventListener('click', withdrawAll);

        queryPartyBtn.addEventListener('click', queryParty);
        queryHeroBtn.addEventListener('click', queryHero);
        queryRelicBtn.addEventListener('click', queryRelic);
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', e => {
                document.querySelectorAll('.nav-item.active').forEach(i => i.classList.remove('active'));
                e.target.classList.add('active');
                document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
                document.getElementById(e.target.dataset.target).classList.remove('hidden');
            });
        });
    };

    setupEventListeners();
    updatePartyCompositionUI();
});
