# 5. 技術實現 (Technology)

* **區塊鏈**: 幣安智能鏈 (Binance Smart Chain, BSC) - 提供高效、低成本的交易環境。
* **智能合約**: Solidity ^0.8.19，合約遵循 OpenZeppelin 標準庫，確保安全性與標準化。
* **隨機數 (VRF)**: Chainlink VRF v2.5 - 所有隨機數生成（如 NFT 屬性、遠征成功率）均在鏈上進行，並可被公開驗證，杜絕人為操控，實現絕對公平。
* **前端**: HTML5, Tailwind CSS, Vanilla JavaScript。
* **Web3 連接**: Ethers.js - 穩定可靠的區塊鏈交互庫。
* **數據索引 (推薦)**: TheGraph - 為了提升 DApp 讀取鏈上數據的效率和穩定性，我們推薦使用 TheGraph 對事件進行索引。
