// 快速檢查祭壇合約餘額和 owner
// 在瀏覽器 console 執行此代碼

async function checkAltarStatus() {
  const altarAddress = '0x167F42bcC21a5ab5319b787F8C2e045f9Aeaa4dD';
  
  // 1. 檢查 BNB 餘額
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const balance = await provider.getBalance(altarAddress);
  console.log('祭壇 BNB 餘額:', ethers.utils.formatEther(balance), 'BNB');
  
  // 2. 檢查合約 owner
  const altarAbi = [
    'function owner() view returns (address)'
  ];
  const altarContract = new ethers.Contract(altarAddress, altarAbi, provider);
  const owner = await altarContract.owner();
  console.log('祭壇合約 Owner:', owner);
  
  // 3. 檢查當前錢包
  const signer = provider.getSigner();
  const currentAddress = await signer.getAddress();
  console.log('當前錢包地址:', currentAddress);
  console.log('是否為 Owner:', owner.toLowerCase() === currentAddress.toLowerCase());
  
  return {
    balance: ethers.utils.formatEther(balance),
    owner,
    currentAddress,
    isOwner: owner.toLowerCase() === currentAddress.toLowerCase()
  };
}

// 執行檢查
checkAltarStatus().then(console.log).catch(console.error);