document.addEventListener('DOMContentLoaded', () => {
    // --- Ethers.js 和合約相關變數 ---
    let provider, signer, userAddress;
    let soulShardTokenContract, assetsContract, stakingPoolContract;

    // !!重要!!: 在您完成部署後，必須用真實數據替換這裡的內容
    const soulShardTokenAddress = "YOUR_SOULSHARD_TOKEN_ADDRESS";
    const assetsContractAddress = "YOUR_ASSETS_CONTRACT_ADDRESS";
    const stakingPoolAddress = "YOUR_STAKING_POOL_ADDRESS";

    // ABI
    const soulShardTokenABI = [];
    const assetsContractABI = [];
    const stakingPoolABI = [];

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
    const approveNftsBtn = document.getElementById('approveNftsBtn');
    const mintHeroBtn = document.getElementById('mintHeroBtn');
    const mintRelicBtn = document.getElementById('mintRelicBtn');
    const dungeonsContainer = document.getElementById('dungeonsContainer');
    const stakingSection = document.getElementById('staking-section');
    const unstakedView = document.getElementById('unstaked-view');
    const stakedView = document.getElementById('staked-view');
    const stakedInfoPanel = document.getElementById('staked-info-panel');
    const heroesContainer = document.getElementById('heroesContainer');
    const relicsContainer = document.getElementById('relicsContainer');
    const dashboardStatus = document.getElementById('dashboard-status-panel');
    const heroMintPriceText = document.getElementById('hero-mint-price-text');
    const relicMintPriceText = document.getElementById('relic-mint-price-text');

    // --- 通知函式 ---
    const showToast = (text, type = 'info') => {
        let backgroundColor;
        switch (type) {
            case 'success':
                backgroundColor = 'linear-gradient(to right, #00b09b, #96c93d)';
                break;
            case 'error':
                backgroundColor = 'linear-gradient(to right, #ff5f6d, #ffc371)';
                break;
            default: // info
                backgroundColor = 'linear-gradient(to right, #4facfe, #00f2fe)';
                break;
        }
        Toastify({
            text: text,
            duration: 5000,
            close: true,
            gravity: "top",
            position: "right",
            stopOnFocus: true,
            style: {
                background: backgroundColor,
                "border-radius": "10px",
            },
        }).showToast();
    };

    // --- 網路與錢包 ---
    const checkAndSwitchNetwork = async () => {
        if (!window.ethereum) return false;
        try {
            const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (currentChainId !== targetNetwork.chainId) {
                showToast(`偵測到網路不符，正在嘗試切換至 ${targetNetwork.chainName}...`, 'info');
                try {
                    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetNetwork.chainId }] });
                } catch (switchError) {
                    if (switchError.code === 4902) {
                        await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [targetNetwork] });
                    } else { throw switchError; }
                }
            }
            return true;
        } catch (error) {
            console.error("網路切換失敗:", error);
            showToast(`網路切換失敗，請手動切換至 ${targetNetwork.chainName}。`, 'error');
            return false;
        }
    };

    const connectWallet = async () => {
        if (typeof window.ethereum === 'undefined') { showToast('請安裝 MetaMask！', 'error'); return; }
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
            showToast('錢包連接成功！', 'success');

            await Promise.all([
                updateTokenBalance(),
                fetchUserAssets(),
                updateStakingStatus(),
                updateMintPricesUI()
            ]);
            
            window.ethereum.on('accountsChanged', () => window.location.reload());
            window.ethereum.on('chainChanged', () => window.location.reload());
        } catch (error) {
            console.error("連接錢包失敗:", error);
            showToast("連接失敗，請檢查主控台。可能合約地址或 ABI 不正確。", 'error');
        }
    };

    // --- UI 更新函式 ---
    const updateMintPricesUI = async () => {
        if (!assetsContract) return;
        try {
            const heroPrice = await assetsContract.heroMintPrice();
            const relicPrice = await assetsContract.relicMintPrice();
            
            heroMintPriceText.innerHTML = `花費 ${ethers.utils.formatEther(heroPrice)} $SoulShard，<br/>你可能招募到傳說中的英雄，或是初出茅廬的新手。`;
            relicMintPriceText.innerHTML = `花費 ${ethers.utils.formatEther(relicPrice)} $SoulShard，<br/>它將決定你隊伍的規模。`;
        } catch (e) {
            console.error("讀取鑄造價格失敗:", e);
            heroMintPriceText.textContent = "無法讀取價格";
            relicMintPriceText.textContent = "無法讀取價格";
        }
    };

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
            dashboardStatus.innerHTML = `<p class="text-red-500">無法讀取餘額，請確認代幣合約地址與 ABI 是否正確。</p>`;
        }
    };

    const updateStakingStatus = async () => {
        if (!stakingPoolContract || !userAddress) return;
        try {
            const [stakerInfo, pending] = await stakingPoolContract.getStakerInfo(userAddress);
            if (stakerInfo.totalPower.toNumber() > 0) {
                unstakedView.classList.add('hidden');
                stakedView.classList.remove('hidden');
                
                const pendingRewards = parseFloat(ethers.utils.formatEther(pending)).toFixed(4);
                const fatiguePercentage = (stakerInfo.currentFatigue.toNumber() / 100).toFixed(2);

                stakedInfoPanel.innerHTML = `
                    <h3 class="text-2xl font-bold mb-4">遠征狀態</h3>
                    <p class="text-lg">隊伍總戰力: <span class="font-bold text-yellow-400">${stakerInfo.totalPower.toString()}</span></p>
                    <p class="text-lg mt-2">目前疲勞度: <span class="font-bold text-red-400">${fatiguePercentage} / 100.00</span></p>
                    <p class="text-lg mt-2">待領取獎勵: <span class="font-bold text-green-400">${pendingRewards} $SoulShard</span></p>
                    <div class="flex flex-col md:flex-row justify-center gap-4 mt-6">
                        <button id="claimRewardsBtn" class="btn-primary flex-1">領取獎勵</button>
                        <button id="restHeroesBtn" class="bg-green-600 text-white flex-1 py-2 rounded-lg hover:bg-green-700">恢復疲勞</button>
                        <button id="withdrawPartyBtn" class="bg-red-600 text-white flex-1 py-2 rounded-lg hover:bg-red-700">撤回隊伍</button>
                    </div>
                `;
            } else {
                unstakedView.classList.remove('hidden');
                stakedView.classList.add('hidden');
            }
        } catch (e) {
            console.error("無法獲取質押狀態:", e);
        }
    };
    
    // --- 核心互動函式 ---
    const approveTokens = async (spenderAddress, amount) => {
        if (!soulShardTokenContract) return false;
        showToast('正在請求代幣授權...', 'info');
        try {
            const tx = await soulShardTokenContract.approve(spenderAddress, amount);
            await tx.wait();
            showToast('授權成功！', 'success');
            return true;
        } catch (error) {
            console.error("代幣授權失敗:", error);
            showToast('代幣授權失敗！詳情見主控台。', 'error');
            return false;
        }
    };
    
    const approveAllNfts = async () => {
        if (!assetsContract) { showToast('請先連接錢包', 'error'); return; }
        showToast("正在請求 NFT 授權...請在錢包中確認。", 'info');
        try {
            const tx = await assetsContract.setApprovalForAll(stakingPoolAddress, true);
            await tx.wait();
            showToast("NFT 授權成功！您現在可以開始遠征了。", 'success');
        } catch (error) {
            console.error("NFT 授權失敗:", error);
            showToast("NFT 授權失敗，詳情見主控台。", 'error');
        }
    };

    const mintHero = async () => {
        if (!assetsContract) { showToast('請先連接錢包', 'error'); return; }
        showToast('準備招募英雄...', 'info');
        try {
            const price = await assetsContract.heroMintPrice();
            const success = await approveTokens(assetsContractAddress, price);
            if (!success) return;
            const tx = await assetsContract.mintHero();
            showToast('英雄招募交易已送出...請等待區塊鏈確認。', 'info');
            await tx.wait();
            showToast('招募成功！您的新英雄已加入隊伍。', 'success');
            await Promise.all([updateTokenBalance(), fetchUserAssets()]);
        } catch (error) {
            console.error("招募失敗:", error);
            showToast('招募失敗，詳情見主控台。', 'error');
        }
    };
    
    const mintRelic = async () => {
        if (!assetsContract) { showToast('請先連接錢包', 'error'); return; }
        showToast('準備鑄造聖物...', 'info');
        try {
            const price = await assetsContract.relicMintPrice();
            const success = await approveTokens(assetsContractAddress, price);
            if (!success) return;
            const tx = await assetsContract.mintRelic();
            showToast("聖物鑄造交易已送出...請等待區塊鏈確認。", 'info');
            await tx.wait();
            showToast("鑄造成功！您的新聖物已加入收藏。", 'success');
            await Promise.all([updateTokenBalance(), fetchUserAssets()]);
        } catch (error) {
            console.error("鑄造聖物失敗:", error);
            showToast("鑄造聖物失敗，詳情見主控台。", 'error');
        }
    };

    const stakeParty = async () => {
        if (!stakingPoolContract) { showToast('請先連接錢包', 'error'); return; }
        if (!currentParty.relic || currentParty.heroes.length === 0) {
            showToast("請先在「我的隊伍」頁面組建一個包含英雄和聖物的完整隊伍。", 'error');
            return;
        }
        showToast("隊伍正在前往地下城...請等待區塊鏈確認。", 'info');
        try {
            const heroesToStake = currentParty.heroes.map(h => ({ tokenId: h.tokenId, power: h.power }));
            const tx = await stakingPoolContract.stake(currentParty.relic.tokenId, currentParty.relic.capacity, heroesToStake);
            await tx.wait();
            showToast("隊伍已成功進入地下城！開始賺取獎勵。", 'success');
            disbandParty();
            await Promise.all([fetchUserAssets(), updateStakingStatus()]);
        } catch (error) {
            console.error("開始遠征失敗:", error);
            if (error.data?.message?.includes("is not approved")) {
                 showToast("遠征失敗！原因：您尚未授權 NFT。請先點擊授權按鈕。", 'error');
            } else {
                 showToast("遠征失敗，詳情見主控台。", 'error');
            }
        }
    };

    const claimAllRewards = async () => {
        if (!stakingPoolContract) { showToast('請先連接錢包', 'error'); return; }
        showToast("正在領取獎勵...請等待交易確認。", 'info');
        try {
            const tx = await stakingPoolContract.claimRewards();
            await tx.wait();
            showToast("獎勵已成功領取！", 'success');
            await Promise.all([updateTokenBalance(), updateStakingStatus()]);
        } catch (error) {
            console.error("領取獎勵失敗:", error);
            showToast("領取獎勵失敗，詳情見主控台。", 'error');
        }
    };
    
    const withdrawParty = async () => {
        if (!stakingPoolContract) { 
            showToast('請先連接錢包', 'error'); 
            return; 
        }
        
        const result = await Swal.fire({
            title: '撤回隊伍',
            text: "您確定要撤回您的隊伍嗎？所有未領取的獎勵將會一併發放。",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '確認撤回',
            cancelButtonText: '取消',
        });

        if (result.isConfirmed) {
            showToast("正在撤回隊伍...請等待交易確認。", 'info');
            try {
                const tx = await stakingPoolContract.withdraw();
                await tx.wait();
                showToast("隊伍已成功撤回！", 'success');
                Swal.fire({
                    title: '成功!',
                    text: '您的隊伍已安全返回。',
                    icon: 'success',
                });
                await Promise.all([updateTokenBalance(), fetchUserAssets(), updateStakingStatus()]);
            } catch (error) {
                console.error("撤回隊伍失敗:", error);
                showToast("撤回隊伍失敗，詳情見主控台。", 'error');
                Swal.fire({
                    title: '錯誤!',
                    text: '撤回隊伍時發生錯誤，請查看主控台了解詳情。',
                    icon: 'error',
                });
            }
        } else {
            showToast('操作已取消', 'info');
        }
    };

    const restAllStakedHeroes = async () => {
        if (!stakingPoolContract) { showToast('請先連接錢包', 'error'); return; }
        
        try {
            const cost = await stakingPoolContract.getRestCost(userAddress);
            if (cost.isZero()) {
                showToast("您的隊伍精力充沛，無需休息！", 'success');
                return;
            }
            showToast("正在為隊伍恢復疲勞...", 'info');
            const success = await approveTokens(stakingPoolAddress, cost);
            if (!success) return;

            const tx = await stakingPoolContract.restHeroes();
            await tx.wait();
            showToast("隊伍已完全恢復！", 'success');
            await Promise.all([updateTokenBalance(), updateStakingStatus()]);
        } catch (error) {
            console.error("恢復疲勞失敗:", error);
            showToast("恢復疲勞失敗，詳情見主控台。", 'error');
        }
    };

    // --- 資料讀取與渲染 ---
    const fetchUserAssets = async () => {
        if (!assetsContract || !userAddress) return;
        heroesContainer.innerHTML = '<p class="col-span-full text-center text-gray-500">正在讀取英雄...</p>';
        relicsContainer.innerHTML = '<p class="col-span-full text-center text-gray-500">正在讀取聖物...</p>';
        try {
            const heroTokenIds = [1, 2, 3, 4, 5];
            const relicTokenIds = [11, 12, 13, 14, 15];
            const allTokenIds = [...heroTokenIds, ...relicTokenIds];
            const userAddresses = Array(allTokenIds.length).fill(userAddress);
            
            const balances = await assetsContract.balanceOfBatch(userAddresses, allTokenIds);
            
            let fetchedHeroes = [];
            let fetchedRelics = [];
            
            const metadataPromises = [];

            for (let i = 0; i < allTokenIds.length; i++) {
                if (balances[i].toNumber() > 0) {
                    const tokenId = allTokenIds[i];
                    metadataPromises.push(
                        assetsContract.uri(tokenId).then(uri => fetch(uri.replace("ipfs://", "https://ipfs.io/ipfs/")).then(res => res.json()).then(metadata => ({
                            tokenId,
                            balance: balances[i].toNumber(),
                            metadata
                        })))
                    );
                }
            }
            
            const results = await Promise.all(metadataPromises);

            for (const result of results) {
                const { tokenId, balance, metadata } = result;
                const powerAttr = metadata.attributes.find(attr => attr.trait_type === "Power");
                const capacityAttr = metadata.attributes.find(attr => attr.trait_type === "Capacity");
                
                const power = powerAttr ? parseInt(powerAttr.value) : 0;
                const capacity = capacityAttr ? parseInt(capacityAttr.value) : 0;
                const rarity = heroTokenIds.includes(tokenId) ? tokenId : tokenId - 10;

                for (let j = 0; j < balance; j++) {
                    const uniqueId = `${tokenId}-${j}`; 
                    if (heroTokenIds.includes(tokenId)) {
                        fetchedHeroes.push({ id: uniqueId, tokenId, rarity, power });
                    } else if (relicTokenIds.includes(tokenId)) {
                        fetchedRelics.push({ id: uniqueId, tokenId, rarity, capacity });
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
            showToast('讀取鏈上資產失敗，請檢查 API 或合約。', 'error');
            heroesContainer.innerHTML = '<p class="col-span-full text-center text-red-400">讀取資產失敗。</p>';
            relicsContainer.innerHTML = '<p class="col-span-full text-center text-red-400">讀取資產失敗。</p>';
        }
    };

    // --- 輔助函式 ---
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
            </div>`).join('') : '<p class="col-span-full text-center text-gray-500">您還沒有任何英雄。</p>';
    }
    
    function renderRelics() {
        relicsContainer.innerHTML = userRelics.length > 0 ? userRelics.map(relic => `
            <div class="card-bg p-3 rounded-lg text-center cursor-pointer hover:scale-105 transition-transform" data-id="${relic.id}" data-type="relic">
                 <p class="font-bold text-sm">聖物 (ID: ${relic.tokenId})</p>
                ${renderStars(relic.rarity)}
                <p class="text-sm mt-1">容量: ${relic.capacity}</p>
            </div>`).join('') : '<p class="col-span-full text-center text-gray-500">您還沒有任何聖物。</p>';
    }

    function updateDungeons() {
        dungeonsContainer.innerHTML = dungeonsData.map(dungeon => {
            const canEnter = currentParty.totalPower >= dungeon.requiredPower;
            return `
            <div class="card-bg p-4 rounded-xl ${!canEnter ? 'disabled-card' : ''}">
                <h4 class="text-xl font-bold font-serif">${dungeon.name}</h4>
                <p class="text-sm text-gray-300">要求戰力: ${dungeon.requiredPower}</p>
                <p class="text-lg mt-2 text-[#C0A573]">獎勵: ${dungeon.reward} $SoulShard</p>
                <button class="w-full mt-4 btn-primary py-2 rounded-lg stake-btn ${!canEnter ? 'cursor-not-allowed opacity-50' : ''}" ${!canEnter ? 'disabled' : ''}>開始遠征</button>
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
            let heroList = currentParty.heroes.map(h => `<p class="text-sm">英雄 #${h.id.split('-')[0]} (${h.power} MP)</p>`).join('');
            if (currentParty.heroes.length === 0) heroList = `<p class="text-sm text-gray-400">(尚無英雄)</p>`;
            container.innerHTML = `
                <div>
                    <p class="font-bold text-lg">聖物 #${currentParty.relic.id.split('-')[0]} (容量: ${currentParty.relic.capacity})</p>
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
                showToast(`隊伍已滿！此聖物最多只能帶領 ${currentParty.relic.capacity} 位英雄。`, 'error');
                return;
            }
        } else if (type === 'hero' && !currentParty.relic) {
             showToast('請先選擇一個聖物來組建隊伍！', 'error');
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
    
    function createChart(ctx, label, data) {
        new Chart(ctx, { type: 'doughnut', data: { labels: data.labels, datasets: [{ label: label, data: data.chances, backgroundColor: data.colors, borderColor: '#FDF6E3', borderWidth: 2, hoverOffset: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#2D2A4A', font: { size: 14 } } } } } });
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
        updateMintPricesUI();

        connectWalletBtn.addEventListener('click', connectWallet);
        approveNftsBtn.addEventListener('click', approveAllNfts);
        mintHeroBtn.addEventListener('click', mintHero);
        mintRelicBtn.addEventListener('click', mintRelic);
        dungeonsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('stake-btn')) stakeParty();
        });
        stakingSection.addEventListener('click', (e) => {
            if (e.target.id === 'claimRewardsBtn') claimAllRewards();
            if (e.target.id === 'restHeroesBtn') restAllStakedHeroes();
            if (e.target.id === 'withdrawPartyBtn') withdrawParty();
        });
        document.getElementById('barracks')?.addEventListener('click', handleAssetClick);
    }

    init();
});
