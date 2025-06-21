document.addEventListener('DOMContentLoaded', () => {

    /**
     * =================================================================
     * 環境設定 (Environment Configuration)
     * =================================================================
     */
    const CURRENT_ENV = 'testnet'; // 'mainnet' 或 'testnet'

    const CONFIG = {
        mainnet: {
            network: { chainId: '0x38', chainName: 'BSC Mainnet' },
            rpcEndpoints: ["https://bsc-dataseed1.binance.org/", "https://bsc-dataseed2.binance.org/"],
            contracts: {
                SOUL_SHARD_TOKEN_ADDRESS: "YOUR_MAINNET_SOUL_SHARD_TOKEN_ADDRESS",
                HERO_ADDRESS: "YOUR_MAINNET_HERO_ADDRESS",
                RELIC_ADDRESS: "YOUR_MAINNET_RELIC_ADDRESS",
                PARTY_ADDRESS: "YOUR_MAINNET_PARTY_ADDRESS",
                DUNGEON_CORE_ADDRESS: "YOUR_MAINNET_DUNGEON_CORE_ADDRESS",
            }
        },
        testnet: {
            network: { chainId: '0x61', chainName: 'BSC Testnet' },
            rpcEndpoints: ["https://data-seed-prebsc-1-s1.binance.org:8545/", "https://data-seed-prebsc-2-s1.binance.org:8545/"],
            contracts: {
                SOUL_SHARD_TOKEN_ADDRESS: "YOUR_TESTNET_SOUL_SHARD_TOKEN_ADDRESS",
                HERO_ADDRESS: "YOUR_TESTNET_HERO_ADDRESS",
                RELIC_ADDRESS: "YOUR_TESTNET_RELIC_ADDRESS",
                PARTY_ADDRESS: "YOUR_TESTNET_PARTY_ADDRESS",
                DUNGEON_CORE_ADDRESS: "YOUR_TESTNET_DUNGEON_CORE_ADDRESS",
            }
        }
    };

    const AppConfig = CONFIG[CURRENT_ENV];

    /**
     * =================================================================
     * RPC 管理器 (RpcManager)
     * =================================================================
     */
    class RpcManager {
        constructor(rpcEndpoints) {
            this.rpcEndpoints = rpcEndpoints;
            this.currentRpcIndex = 0;
            this.provider = new ethers.providers.JsonRpcProvider(this.rpcEndpoints[this.currentRpcIndex]);
            this.status = { currentEndpoint: this.rpcEndpoints[this.currentRpcIndex], isHealthy: null, lastCheck: null };
            this.checkHealth();
        }
        getProvider() { return this.provider; }
        async checkHealth() {
            try {
                await this.provider.getBlockNumber();
                this.status.isHealthy = true;
            } catch (error) { this.status.isHealthy = false; }
            this.status.lastCheck = new Date();
            updateRpcStatusUI(this.status);
            return this.status.isHealthy;
        }
        async switchToNextEndpoint() {
            const originalIndex = this.currentRpcIndex;
            do {
                this.currentRpcIndex = (this.currentRpcIndex + 1) % this.rpcEndpoints.length;
                this.provider = new ethers.providers.JsonRpcProvider(this.rpcEndpoints[this.currentRpcIndex]);
                this.status.currentEndpoint = this.rpcEndpoints[this.currentRpcIndex];
                console.log(`🔄 嘗試切換到 RPC 節點: ${this.status.currentEndpoint}`);
                showToast(`RPC 連接不穩定，正在嘗試切換節點...`, 'info');
                if (await this.checkHealth()) {
                    console.log(`✅ 成功切換到 RPC 節點: ${this.status.currentEndpoint}`);
                    showToast(`已成功切換到備用節點！`, 'success');
                    return true;
                }
            } while (this.currentRpcIndex !== originalIndex);
            console.error("❌ 所有 RPC 節點都無法連接。");
            showToast("所有 RPC 節點都無法連接，請稍後再試。", "error");
            return false;
        }
        async execute(action, retries = 2) {
            for (let i = 0; i < retries; i++) {
                try {
                    return await action(this.provider);
                } catch (e) {
                    console.warn(`RPC 操作失敗 (嘗試 ${i + 1}/${retries}):`, e.message);
                    if (i < retries - 1) {
                        if (!(await this.switchToNextEndpoint())) throw new Error("所有 RPC 節點都無法連接。");
                    } else { throw e; }
                }
            }
        }
    }

    const rpcManager = new RpcManager(AppConfig.rpcEndpoints);

    // --- 全局變數 & ABIs ---
    let provider, signer, userAddress;
    let soulShardTokenContract, heroContract, relicContract, partyContract, dungeonCoreContract;
    const { SOUL_SHARD_TOKEN_ADDRESS, HERO_ADDRESS, RELIC_ADDRESS, PARTY_ADDRESS, DUNGEON_CORE_ADDRESS } = AppConfig.contracts;
    
    // 註：為了簡潔，使用 Set 來確保 ABI 定義不重複
    const ERC721_ABI_PARTIAL = ["function ownerOf(uint256 tokenId) view returns (address)", "function tokenURI(uint256 tokenId) view returns (string)", "function setTokenURI(uint256 tokenId, string memory _tokenURI)","event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"];
    const HERO_ABI = [...new Set([...ERC721_ABI_PARTIAL, "function requestNewHero() returns (uint256)", "function getHeroProperties(uint256 tokenId) view returns (tuple(uint8 rarity, uint256 power))", "function setApprovalForAll(address operator, bool approved)", "function isApprovedForAll(address owner, address operator) view returns (bool)", "event HeroMinted(uint256 indexed requestId, uint256 indexed tokenId, uint8 rarity, uint256 power)", "function mintPriceUSD() view returns (uint256)", "function getSoulShardAmountForUSD(uint256) view returns (uint256)"])];
    const RELIC_ABI = [...new Set([...ERC721_ABI_PARTIAL, "function requestNewRelic() returns (uint256)", "function getRelicProperties(uint256 tokenId) view returns (tuple(uint8 rarity, uint8 capacity))", "function setApprovalForAll(address operator, bool approved)", "function isApprovedForAll(address owner, address operator) view returns (bool)", "event RelicMinted(uint256 indexed requestId, uint256 indexed tokenId, uint8 rarity, uint8 capacity)", "function mintPriceUSD() view returns (uint256)", "function getSoulShardAmountForUSD(uint256) view returns (uint256)"])];
    const PARTY_ABI = [...new Set([...ERC721_ABI_PARTIAL, "function createParty(uint256[] calldata heroIds, uint256[] calldata relicIds) returns (uint256)", "function disbandParty(uint256 partyId)", "function getPartyComposition(uint256 partyId) view returns (tuple(uint256[] heroIds, uint256[] relicIds, uint256 totalPower, uint256 totalCapacity))", "event PartyCreated(uint256 indexed partyId, address indexed owner, uint256[] heroIds, uint256[] relicIds)"])];
    const ERC20_ABI = ["function approve(address spender, uint256 amount) returns (bool)", "function allowance(address owner, address spender) view returns (uint256)", "function balanceOf(address account) view returns (uint256)"];
    const DUNGEON_CORE_ABI = ["function buyProvisions(uint256 partyId, uint256 amount)", "function requestExpedition(uint256 partyId, uint256 dungeonId) returns (uint256)", "function claimRewards(uint256 partyId)", "function withdraw(uint256 amount)", "function dungeons(uint256 dungeonId) view returns (tuple(uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate, bool isInitialized))", "function playerInfo(address player) view returns (tuple(uint256 withdrawableBalance, uint256 lastWithdrawTimestamp))", "event ExpeditionFulfilled(uint256 indexed requestId, uint256 indexed partyId, bool success, uint256 reward)", "event RewardsBanked(address indexed user, uint256 indexed partyId, uint256 amount)", "event TokensWithdrawn(address indexed user, uint256 amount, uint256 taxAmount)"];
    
    // --- DOM 元素 ---
    const connectWalletBtn = document.getElementById('connectWalletBtn'), userAddressEl = document.getElementById('userAddress'), tokenBalanceEl = document.getElementById('tokenBalance'), withdrawableBalanceEl = document.getElementById('withdrawableBalance'), withdrawBtn = document.getElementById('withdrawBtn'), mintHeroBtn = document.getElementById('mintHeroBtn'), heroMintPriceUSD_El = document.getElementById('heroMintPriceUSD'), heroMintPriceToken_El = document.getElementById('heroMintPriceToken'), mintRelicBtn = document.getElementById('mintRelicBtn'), relicMintPriceUSD_El = document.getElementById('relicMintPriceUSD'), relicMintPriceToken_El = document.getElementById('relicMintPriceToken'), heroesContainer = document.getElementById('heroesContainer'), relicsContainer = document.getElementById('relicsContainer'), partyCompositionEl = document.getElementById('partyComposition'), createPartyBtn = document.getElementById('createPartyBtn'), partySelector = document.getElementById('partySelector'), dungeonsContainer = document.getElementById('dungeonsContainer'), queryPartyBtn = document.getElementById('queryPartyBtn'), queryHeroBtn = document.getElementById('queryHeroBtn'), queryRelicBtn = document.getElementById('queryRelicBtn'), partyQueryResultEl = document.getElementById('partyQueryResult'), heroQueryResultEl = document.getElementById('heroQueryResult'), relicQueryResultEl = document.getElementById('relicQueryResult'), rpcStatusContainer = document.getElementById('rpcStatusContainer'), partiesContainer = document.getElementById('partiesContainer');

    let selectedHeroes = new Set();
    let selectedRelics = new Set();

    const showToast = (text, type = 'info') => Toastify({ text, duration: 5000, gravity: "top", position: "right", style: { background: type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8', borderRadius: '10px' } }).showToast();
    
    // --- UI 更新函式 ---
    function updateRpcStatusUI(status) {
        if (rpcStatusContainer) {
            const statusColor = status.isHealthy ? 'text-green-400' : status.isHealthy === false ? 'text-red-400' : 'text-yellow-400';
            const statusText = status.isHealthy ? '正常' : status.isHealthy === false ? '異常' : '檢查中';
            rpcStatusContainer.innerHTML = `
                <div class="container mx-auto px-4 py-1 flex justify-between items-center text-xs">
                    <span>網路: <span class="font-bold ${CURRENT_ENV === 'mainnet' ? 'text-yellow-400' : 'text-green-400'}">${AppConfig.network.chainName}</span></span>
                    <span>當前節點: ${status.currentEndpoint}</span>
                    <span>狀態: <span class="${statusColor}">●</span> ${statusText}</span>
                </div>
            `;
        }
    }

    function updatePartyCompositionUI() {
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
    }
    
    // --- 核心連接 & 載入函式 ---
    const connectWallet = async () => {
        if (typeof window.ethereum === 'undefined') return showToast('請安裝 MetaMask！', 'error');
        try {
            if (await window.ethereum.request({ method: 'eth_chainId' }) !== AppConfig.network.chainId) {
                 await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: AppConfig.network.chainId }] });
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
            showToast(e.message.includes('user rejected') ? '您拒絕了連接請求' : '連接錢包失敗', 'error');
        }
    };
    
    const initialLoad = async () => {
        await Promise.all([ renderDungeons(), updateMintPrices() ]);
    };

    const loadAllData = async () => {
        if (!userAddress) return;
        const spinner = `<div class="col-span-full text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div></div>`;
        heroesContainer.innerHTML = spinner;
        relicsContainer.innerHTML = spinner;
        partiesContainer.innerHTML = spinner;
        await Promise.all([
            updateBalances(), updateMintPrices(),
            fetchAndRenderNfts('hero'), fetchAndRenderNfts('relic'),
            fetchAndRenderParties()
        ]);
    };
    
    // --- 數據獲取與渲染 (Fetch & Render) ---
    async function fetchAndRenderNfts(type) {
        const contractAddress = type === 'hero' ? HERO_ADDRESS : RELIC_ADDRESS;
        const abi = type === 'hero' ? HERO_ABI : RELIC_ABI;
        const container = type === 'hero' ? heroesContainer : relicsContainer;
        if (!userAddress) return;
        container.innerHTML = `<p class="col-span-full text-center">正在高效查詢您的 ${type === 'hero' ? '英雄' : '聖物'}...</p>`;
        
        await rpcManager.execute(async (currentProvider) => {
            const contract = new ethers.Contract(contractAddress, abi, currentProvider);
            const filter = contract.filters.Transfer(null, userAddress);
            const logs = await contract.queryFilter(filter, 'earliest', 'latest');
            const uniqueTokenIds = [...new Set(logs.map(log => log.args.tokenId.toString()))];
            
            let ownedNfts = [];
            for (const id of uniqueTokenIds) {
                try {
                    const owner = await contract.ownerOf(id);
                    if (owner.toLowerCase() === userAddress.toLowerCase()) {
                        const props = await (type === 'hero' ? contract.getHeroProperties(id) : contract.getRelicProperties(id));
                        const uri = await contract.tokenURI(id).catch(() => '');
                        const metadata = uri ? await fetch(uri.replace("ipfs://", "https://ipfs.io/ipfs/")).then(res => res.json()).catch(() => ({ name: `${type} #${id}`, image: '' })) : { name: `${type} #${id}`, image: '' };
                        ownedNfts.push({ id, ...props, ...metadata });
                    }
                } catch (e) { /* 忽略已轉移的 NFT */ }
            }
            renderNfts(ownedNfts, type);
        });
    }
    
    async function fetchAndRenderParties() {
        partySelector.innerHTML = '<option value="">正在加載您的隊伍...</option>';
        await rpcManager.execute(async (currentProvider) => {
            const readonlyPartyContract = new ethers.Contract(PARTY_ADDRESS, PARTY_ABI, currentProvider);
            const filter = readonlyPartyContract.filters.Transfer(null, userAddress);
            const logs = await readonlyPartyContract.queryFilter(filter, 'earliest', 'latest');
            const uniqueTokenIds = [...new Set(logs.map(log => log.args.tokenId.toString()))];

            let ownedParties = [];
            for (const id of uniqueTokenIds) {
                 try {
                    const owner = await readonlyPartyContract.ownerOf(id);
                    if (owner.toLowerCase() === userAddress.toLowerCase()) {
                        const composition = await readonlyPartyContract.getPartyComposition(id);
                        const uri = await readonlyPartyContract.tokenURI(id).catch(()=>'');
                        const metadata = uri ? await fetch(uri.replace("ipfs://", "https://ipfs.io/ipfs/")).then(res => res.json()).catch(() => ({ name: `隊伍 #${id}`, image: '' })) : { name: `隊伍 #${id}`, image: '' };
                        ownedParties.push({ 
                            id, 
                            totalPower: composition.totalPower.toString(),
                            ...metadata 
                        });
                    }
                } catch (e) { /* 忽略已轉移的 NFT */ }
            }
            
            partySelector.innerHTML = '<option value="">請選擇一個隊伍</option>';
            if (ownedParties.length === 0) {
                partySelector.innerHTML = '<option value="">您還沒有創建任何隊伍</option>';
            } else {
                 ownedParties.forEach(p => {
                    partySelector.innerHTML += `<option value="${p.id}">${p.name} (戰力: ${p.totalPower})</option>`;
                });
            }
            renderParties(ownedParties);
        });
    }

    function renderNfts(nfts, type) {
        const container = type === 'hero' ? heroesContainer : relicsContainer;
        if (!nfts || nfts.length === 0) {
            container.innerHTML = `<p class="col-span-full text-center text-gray-500">您還沒有任何${type === 'hero' ? '英雄' : '聖物'}。</p>`;
            return;
        }
        container.innerHTML = nfts.map(nft => `
            <div class="nft-card card-bg p-3 rounded-lg text-center cursor-pointer border-2 border-transparent transition-all hover:shadow-lg hover:border-indigo-400 overflow-hidden" data-id="${nft.id}" data-type="${type}">
                <img src="${(nft.image || '').replace('ipfs://', 'https://ipfs.io/ipfs/') || `https://placehold.co/200x200/FDF6E3/333333?text=${type}+%23${nft.id}`}" alt="${nft.name}" class="w-full h-auto rounded-md mb-2">
                <p class="font-bold text-sm">${nft.name || `${type} #${nft.id}`}</p>
                <p class="text-xs text-gray-500">稀有度: ${"★".repeat(nft.rarity)}${"☆".repeat(5-nft.rarity)}</p>
                <p class="text-lg font-bold mt-1 text-indigo-600">${type === 'hero' ? `${nft.power.toString()} MP` : `容量: ${nft.capacity}`}</p>
            </div>
        `).join('');
    }

    function renderParties(parties) {
        if (!parties || parties.length === 0) {
            partiesContainer.innerHTML = `<p class="col-span-full text-center text-gray-500">您還沒有任何隊伍。</p>`;
            return;
        }
        partiesContainer.innerHTML = parties.map(party => `
            <div class="card-bg p-3 rounded-lg text-center border-2 border-transparent overflow-hidden">
                <img src="${(party.image || '').replace('ipfs://', 'https://ipfs.io/ipfs/') || `https://placehold.co/200x200/FDF6E3/333333?text=Party+%23${party.id}`}" alt="${party.name}" class="w-full h-auto rounded-md mb-2">
                <p class="font-bold text-sm">${party.name || `隊伍 #${party.id}`}</p>
                <p class="text-lg font-bold mt-1 text-indigo-600">${party.totalPower} MP</p>
            </div>
        `).join('');
    }

    async function renderDungeons() {
        await rpcManager.execute(async (currentProvider) => {
            const readonlyDungeonContract = new ethers.Contract(DUNGEON_CORE_ADDRESS, DUNGEON_CORE_ABI, currentProvider);
            let content = '';
            const getDungeonName = (id) => ["", "新手礦洞", "哥布林洞穴", "食人魔山谷", "蜘蛛巢穴", "石化蜥蜴沼澤", "巫妖墓穴", "奇美拉之巢", "惡魔前哨站", "巨龍之巔", "混沌深淵"][id] || "未知地城";
            for (let i = 1; i <= 10; i++) {
                try {
                    const d = await readonlyDungeonContract.dungeons(i);
                    content += `
                        <div class="card-bg p-4 rounded-xl shadow-lg flex flex-col">
                            <h4 class="text-xl font-bold font-serif">${getDungeonName(i)}</h4>
                            <div class="flex-grow">
                                <p class="text-sm text-gray-600">要求戰力: ${d.requiredPower}</p>
                                <p class="text-lg mt-2">基礎獎勵: ~$${parseFloat(ethers.utils.formatEther(d.rewardAmountUSD)).toFixed(2)}</p>
                                <p class="text-sm">成功率: ${d.baseSuccessRate}%</p>
                            </div>
                            <button class="w-full mt-4 btn-primary py-2 rounded-lg expedition-btn" data-dungeon-id="${i}">派遣遠征</button>
                        </div>
                    `;
                } catch (e) {
                    console.error(`無法讀取地城 #${i}`, e);
                    continue;
                }
            }
            dungeonsContainer.innerHTML = content;
        });
    }
    
    async function updateMintPrices() {
        await rpcManager.execute(async (currentProvider) => {
            try {
                const readonlyHeroContract = new ethers.Contract(HERO_ADDRESS, HERO_ABI, currentProvider);
                const heroPriceUSD = await readonlyHeroContract.mintPriceUSD();
                const heroPriceToken = await readonlyHeroContract.getSoulShardAmountForUSD(heroPriceUSD);
                heroMintPriceUSD_El.textContent = ethers.utils.formatEther(heroPriceUSD);
                heroMintPriceToken_El.textContent = parseFloat(ethers.utils.formatEther(heroPriceToken)).toFixed(4);
            } catch (e) {
                heroMintPriceUSD_El.textContent = 'N/A';
                heroMintPriceToken_El.textContent = '讀取失敗';
            }
            try {
                const readonlyRelicContract = new ethers.Contract(RELIC_ADDRESS, RELIC_ABI, currentProvider);
                const relicPriceUSD = await readonlyRelicContract.mintPriceUSD();
                const relicPriceToken = await readonlyRelicContract.getSoulShardAmountForUSD(relicPriceUSD);
                relicMintPriceUSD_El.textContent = ethers.utils.formatEther(relicPriceUSD);
                relicMintPriceToken_El.textContent = parseFloat(ethers.utils.formatEther(relicPriceToken)).toFixed(4);
            } catch(e) {
                relicMintPriceUSD_El.textContent = 'N/A';
                relicMintPriceToken_El.textContent = '讀取失敗';
            }
        });
    }

    async function updateBalances() {
        if (!userAddress) return;
        await rpcManager.execute(async (currentProvider) => {
            const readonlyDungeonContract = new ethers.Contract(DUNGEON_CORE_ADDRESS, DUNGEON_CORE_ABI, currentProvider);
            const readonlyTokenContract = new ethers.Contract(SOUL_SHARD_TOKEN_ADDRESS, ERC20_ABI, currentProvider);
            const tokenBalance = await readonlyTokenContract.balanceOf(userAddress);
            tokenBalanceEl.textContent = parseFloat(ethers.utils.formatEther(tokenBalance)).toFixed(4);
            const playerInfo = await readonlyDungeonContract.playerInfo(userAddress);
            withdrawableBalanceEl.textContent = parseFloat(ethers.utils.formatEther(playerInfo.withdrawableBalance)).toFixed(4);
        });
    }

    // --- 事件處理 & 交易執行 ---
    function handleNftSelection(e) {
        const card = e.target.closest('.nft-card');
        if (!card) return;
        const { id, type } = card.dataset;
        const idNum = parseInt(id);
        const selectionSet = type === 'hero' ? selectedHeroes : selectedRelics;
        card.classList.toggle('selected');
        card.classList.toggle('ring-4');
        card.classList.toggle('ring-indigo-500');
        if (selectionSet.has(idNum)) {
            selectionSet.delete(idNum);
        } else {
            selectionSet.add(idNum);
        }
        updatePartyCompositionUI();
    }

    async function executeTx(callback, opName) {
        showToast(`${opName}請求已發送...`, 'info');
        try {
            const tx = await callback();
            showToast('交易已送出，等待區塊鏈確認...');
            const receipt = await tx.wait();
            showToast(`${opName}成功！`, 'success');
            await loadAllData();
            return receipt;
        } catch (e) {
            console.error(`${opName}失敗:`, e);
            showToast(e.reason || e.data?.message || e.message || `${opName}失敗`, 'error');
            return null;
        }
    }

    async function mint(type) {
        const spender = type === 'hero' ? HERO_ADDRESS : RELIC_ADDRESS;
        const action = () => type === 'hero' ? heroContract.requestNewHero() : relicContract.requestNewRelic();
        await approveAndExecute(SOUL_SHARD_TOKEN_ADDRESS, spender, action, "鑄造");
    }

    async function approveAndExecute(tokenAddr, spender, callback, opName) {
        if (!signer) return showToast('請先連接錢包!', 'error');
        showToast(`正在檢查 ${opName} 所需的代幣授權...`, 'info');
        try {
            const token = new ethers.Contract(tokenAddr, ERC20_ABI, signer);
            const requiredAllowance = ethers.utils.parseEther("10000000"); // 估算一個高額度
            const currentAllowance = await token.allowance(userAddress, spender);
            if (currentAllowance.lt(requiredAllowance)) {
                const success = await executeTx(() => token.approve(spender, ethers.constants.MaxUint256), "代幣授權");
                if(!success) {
                    showToast('授權失敗，操作已取消', 'error');
                    return;
                }
            }
            await executeTx(callback, opName);
        } catch (e) {
            console.error("授權或執行失敗:", e);
            showToast(e.reason || '操作失敗', 'error');
        }
    }
    
    async function createParty() {
        if (selectedRelics.size === 0) return showToast('請至少選擇一個聖物!', 'error');
        if (!signer) return showToast('請先連接錢包!', 'error');
        try {
            if (!(await heroContract.isApprovedForAll(userAddress, PARTY_ADDRESS))) {
                const success = await executeTx(() => heroContract.setApprovalForAll(PARTY_ADDRESS, true), "授權英雄");
                if (!success) return;
            }
            if (!(await relicContract.isApprovedForAll(userAddress, PARTY_ADDRESS))) {
                const success = await executeTx(() => relicContract.setApprovalForAll(PARTY_ADDRESS, true), "授權聖物");
                if (!success) return;
            }
            const success = await executeTx(() => partyContract.createParty(Array.from(selectedHeroes), Array.from(selectedRelics)), "創建隊伍");
            if (success) {
                selectedHeroes.clear();
                selectedRelics.clear();
                document.querySelectorAll('.nft-card.selected').forEach(el => el.classList.remove('selected', 'ring-4', 'ring-indigo-500'));
                updatePartyCompositionUI();
            }
        } catch(e) {
            console.error("創建隊伍失敗:", e);
            showToast(e.reason || '創建隊伍失敗', 'error');
        }
    }
    
    async function startExpedition(dungeonId) {
        const partyId = partySelector.value;
        if (!partyId) return showToast('請先選擇一個隊伍', 'error');
        await approveAndExecute(SOUL_SHARD_TOKEN_ADDRESS, DUNGEON_CORE_ADDRESS, async () => {
            const buyReceipt = await executeTx(() => dungeonCoreContract.buyProvisions(partyId, 1), "購買儲備");
            if(buyReceipt){
                showToast('儲備購買成功！正在派遣遠征...', 'success');
                return dungeonCoreContract.requestExpedition(partyId, dungeonId);
            }
            return Promise.reject("購買儲備失敗");
        }, "遠征");
    }
    
    async function withdrawAll() {
        if (!userAddress || !dungeonCoreContract) return showToast('請先連接錢包!', 'error');
        try {
            const playerInfo = await rpcManager.execute(p => (new ethers.Contract(DUNGEON_CORE_ADDRESS, DUNGEON_CORE_ABI, p)).playerInfo(userAddress));
            const balance = playerInfo.withdrawableBalance;
            if (balance.isZero()) {
                return showToast('您的金庫中沒有可提領的餘額。', 'info');
            }
            await executeTx(() => dungeonCoreContract.withdraw(balance), "全部提領");
        } catch (e) {
            console.error("提領失敗:", e);
            showToast(e.reason || '提領失敗', 'error');
        }
    }
    
    // --- 數據查詢 ---
    async function queryHero() {
        const id = document.getElementById('queryHeroId').value;
        if(!id) return document.getElementById('heroQueryResult').innerHTML = '請輸入英雄 ID';
        heroQueryResultEl.innerHTML = '查詢中...';
        try {
            const result = await rpcManager.execute(async (provider) => {
                const contract = new ethers.Contract(HERO_ADDRESS, HERO_ABI, provider);
                const props = await contract.getHeroProperties(id);
                const owner = await contract.ownerOf(id);
                return { props, owner };
            });
            heroQueryResultEl.innerHTML = `<p><b>擁有者:</b> <span class="font-mono text-xs">${result.owner}</span></p><p><b>稀有度:</b> ${"★".repeat(result.props.rarity)}${"☆".repeat(5-result.props.rarity)}</p><p><b>戰力:</b> ${result.props.power.toString()}</p>`;
        } catch (e) {
            heroQueryResultEl.innerHTML = `<p class="text-red-500">查詢失敗: 可能是 ID 不存在或發生錯誤。</p>`;
        }
    }

    async function queryRelic() {
        const id = document.getElementById('queryRelicId').value;
        if(!id) return document.getElementById('relicQueryResult').innerHTML = '請輸入聖物 ID';
        relicQueryResultEl.innerHTML = '查詢中...';
        try {
            const result = await rpcManager.execute(async (provider) => {
                const contract = new ethers.Contract(RELIC_ADDRESS, RELIC_ABI, provider);
                const props = await contract.getRelicProperties(id);
                const owner = await contract.ownerOf(id);
                return { props, owner };
            });
            relicQueryResultEl.innerHTML = `<p><b>擁有者:</b> <span class="font-mono text-xs">${result.owner}</span></p><p><b>稀有度:</b> ${"★".repeat(result.props.rarity)}${"☆".repeat(5-result.props.rarity)}</p><p><b>容量:</b> ${result.props.capacity}</p>`;
        } catch (e) {
            relicQueryResultEl.innerHTML = `<p class="text-red-500">查詢失敗: 可能是 ID 不存在或發生錯誤。</p>`;
        }
    }

    async function queryParty() {
        const id = document.getElementById('queryPartyId').value;
        if(!id) return document.getElementById('partyQueryResult').innerHTML = '請輸入隊伍 ID';
        partyQueryResultEl.innerHTML = '查詢中...';
        try {
            const result = await rpcManager.execute(async (provider) => {
                const contract = new ethers.Contract(PARTY_ADDRESS, PARTY_ABI, provider);
                const props = await contract.getPartyComposition(id);
                const owner = await contract.ownerOf(id);
                return { props, owner };
            });
            partyQueryResultEl.innerHTML = `
                <p><b>擁有者:</b> <span class="font-mono text-xs">${result.owner}</span></p>
                <p><b>總戰力:</b> ${result.props.totalPower.toString()}</p>
                <p><b>總容量:</b> ${result.props.totalCapacity.toString()}</p>
                <p><b>英雄列表 (ID):</b> ${props.heroIds.join(', ') || '無'}</p>
                <p><b>聖物列表 (ID):</b> ${props.relicIds.join(', ') || '無'}</p>
            `;
        } catch (e) {
            partyQueryResultEl.innerHTML = `<p class="text-red-500">查詢失敗: 可能是 ID 不存在或發生錯誤。</p>`;
        }
    }
    
    // --- 事件監聽 ---
    const listenForEvents = () => {
        if (!signer) return;
        heroContract.removeAllListeners(); relicContract.removeAllListeners(); partyContract.removeAllListeners(); dungeonCoreContract.removeAllListeners();
        
        heroContract.on("HeroMinted", (req, tokenId, rarity, power) => { showToast(`英雄 #${tokenId.toString()} (戰力: ${power}) 鑄造成功！`, 'success'); fetchAndRenderNfts('hero'); });
        relicContract.on("RelicMinted", (req, tokenId, rarity, capacity) => { showToast(`聖物 #${tokenId.toString()} (容量: ${capacity}) 鑄造成功！`, 'success'); fetchAndRenderNfts('relic'); });
        partyContract.on("PartyCreated", (partyId, owner) => { if (owner.toLowerCase() === userAddress.toLowerCase()) { showToast(`隊伍 #${partyId.toString()} 創建成功！`, 'success'); loadAllData(); }});
        dungeonCoreContract.on("ExpeditionFulfilled", (requestId, partyId, success, reward) => { showToast(`隊伍 #${partyId.toString()} 遠征完成！結果: ${success ? '成功' : '失敗'}。`, success ? 'success' : 'error'); if(success){ showToast(`獲得 ${parseFloat(ethers.utils.formatEther(reward)).toFixed(4)} $SoulShard，已存入您的金庫。`, 'info'); updateBalances(); }});
        dungeonCoreContract.on("TokensWithdrawn", (user) => { if(user.toLowerCase() === userAddress.toLowerCase()){ showToast(`提領成功！`, 'success'); updateBalances(); }});
    };

    const setupEventListeners = () => {
        connectWalletBtn.addEventListener('click', connectWallet);
        mintHeroBtn.addEventListener('click', () => mint('hero'));
        mintRelicBtn.addEventListener('click', () => mint('relic'));
        heroesContainer.addEventListener('click', handleNftSelection);
        relicsContainer.addEventListener('click', handleNftSelection);
        createPartyBtn.addEventListener('click', createParty);
        dungeonsContainer.addEventListener('click', e => {
            if (e.target.classList.contains('expedition-btn')) {
                startExpedition(e.target.dataset.dungeonId);
            }
        });
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
        
        setInterval(() => rpcManager.checkHealth(), 15000);
    };

    // --- 初始化 ---
    initialLoad();
    setupEventListeners();
    updatePartyCompositionUI();
    updateRpcStatusUI(rpcManager.status);
});
