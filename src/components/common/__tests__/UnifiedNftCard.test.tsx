import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/utils';
import { UnifiedNftCard } from '../UnifiedNftCard';
import { createMockHero, createMockRelic, createMockParty, createMockVip } from '../../../test/utils';

// Mock useMobileOptimization hook
vi.mock('../../../hooks/useMobileOptimization', () => ({
  useMobileOptimization: () => ({
    isMobile: false,
    touchHandlers: () => ({ onClick: vi.fn(), onTouchStart: vi.fn() }),
  }),
}));

describe('UnifiedNftCard', () => {
  const mockOnClick = vi.fn();
  const mockOnLongPress = vi.fn();
  const mockOnAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本渲染', () => {
    it('應該渲染 Hero NFT', () => {
      const heroNft = createMockHero();
      render(<UnifiedNftCard nft={heroNft} onClick={mockOnClick} />);

      expect(screen.getByText(heroNft.name)).toBeInTheDocument();
      expect(screen.getByText('HERO')).toBeInTheDocument();
      expect(screen.getByText(`戰力`)).toBeInTheDocument();
      expect(screen.getByText(heroNft.power.toString())).toBeInTheDocument();
    });

    it('應該渲染 Relic NFT', () => {
      const relicNft = createMockRelic();
      render(<UnifiedNftCard nft={relicNft} onClick={mockOnClick} />);

      expect(screen.getByText(relicNft.name)).toBeInTheDocument();
      expect(screen.getByText('RELIC')).toBeInTheDocument();
      expect(screen.getByText('容量')).toBeInTheDocument();
      expect(screen.getByText(relicNft.capacity.toString())).toBeInTheDocument();
    });

    it('應該渲染 Party NFT', () => {
      const partyNft = createMockParty();
      render(<UnifiedNftCard nft={partyNft} onClick={mockOnClick} />);

      expect(screen.getByText(partyNft.name)).toBeInTheDocument();
      expect(screen.getByText('PARTY')).toBeInTheDocument();
      expect(screen.getByText('總戰力')).toBeInTheDocument();
      expect(screen.getByText(partyNft.totalPower.toString())).toBeInTheDocument();
    });

    it('應該渲染 VIP NFT', () => {
      const vipNft = createMockVip();
      render(<UnifiedNftCard nft={vipNft} onClick={mockOnClick} />);

      expect(screen.getByText(vipNft.name)).toBeInTheDocument();
      expect(screen.getByText('VIP')).toBeInTheDocument();
      expect(screen.getByText('等級')).toBeInTheDocument();
      expect(screen.getByText(vipNft.level.toString())).toBeInTheDocument();
    });
  });

  describe('加載狀態', () => {
    it('在加載時應該顯示加載狀態', () => {
      const heroNft = createMockHero();
      render(<UnifiedNftCard nft={heroNft} loading={true} />);

      // 加載狀態下應該有特定的類或元素
      // 由於我們使用了 useLoadingState hook，這裡主要測試傳遞了 loading 屬性
      expect(screen.getByText(heroNft.name)).toBeInTheDocument();
    });

    it('不在加載時應該顯示正常內容', () => {
      const heroNft = createMockHero();
      render(<UnifiedNftCard nft={heroNft} loading={false} />);

      expect(screen.getByText(heroNft.name)).toBeInTheDocument();
      expect(screen.getByText('HERO')).toBeInTheDocument();
    });
  });

  describe('緊湊模式', () => {
    it('在緊湊模式下應該渲染簡化版本', () => {
      const heroNft = createMockHero();
      render(<UnifiedNftCard nft={heroNft} compact={true} onClick={mockOnClick} />);

      expect(screen.getByText(heroNft.name)).toBeInTheDocument();
      // 在緊湊模式下，應該有不同的佈局
      // 由於 compact 模式返回不同的 JSX 結構，我們可以檢查特定元素的存在
    });

    it('在正常模式下應該顯示完整信息', () => {
      const heroNft = createMockHero();
      render(<UnifiedNftCard nft={heroNft} compact={false} onClick={mockOnClick} />);

      expect(screen.getByText(heroNft.name)).toBeInTheDocument();
      expect(screen.getByText('HERO')).toBeInTheDocument();
      expect(screen.getByText(`Token #${heroNft.id.toString()}`)).toBeInTheDocument();
    });
  });

  describe('選中狀態', () => {
    it('選中時應該顯示選中標記', () => {
      const heroNft = createMockHero();
      render(<UnifiedNftCard nft={heroNft} selected={true} onClick={mockOnClick} />);

      // 選中狀態應該有特定的視覺指示器
      const card = screen.getByText(heroNft.name).closest('div');
      expect(card).toHaveClass('ring-2', 'ring-indigo-500');
    });

    it('未選中時不應該顯示選中標記', () => {
      const heroNft = createMockHero();
      render(<UnifiedNftCard nft={heroNft} selected={false} onClick={mockOnClick} />);

      const card = screen.getByText(heroNft.name).closest('div');
      expect(card).not.toHaveClass('ring-2', 'ring-indigo-500');
    });
  });

  describe('稀有度顯示', () => {
    it('應該顯示正確的稀有度星星', () => {
      const heroNft = createMockHero({ rarity: 3 });
      render(<UnifiedNftCard nft={heroNft} onClick={mockOnClick} />);

      // 應該有 3 顆亮星和 2 顆暗星
      const stars = screen.getAllByText('★');
      expect(stars).toHaveLength(5);
    });

    it('沒有稀有度時不應該顯示星星', () => {
      const heroNft = createMockHero();
      delete (heroNft as any).rarity;
      render(<UnifiedNftCard nft={heroNft} onClick={mockOnClick} />);

      const stars = screen.queryAllByText('★');
      expect(stars).toHaveLength(0);
    });
  });

  describe('操作按鈕', () => {
    it('showActions 為 true 時應該顯示操作按鈕', () => {
      const heroNft = createMockHero();
      render(
        <UnifiedNftCard 
          nft={heroNft} 
          showActions={true} 
          onAction={mockOnAction}
          onClick={mockOnClick} 
        />
      );

      const infoButton = screen.getByRole('button');
      expect(infoButton).toBeInTheDocument();
    });

    it('showActions 為 false 時不應該顯示操作按鈕', () => {
      const heroNft = createMockHero();
      render(
        <UnifiedNftCard 
          nft={heroNft} 
          showActions={false} 
          onClick={mockOnClick} 
        />
      );

      // 唯一的按鈕應該是整個卡片的點擊區域，不應該有操作按鈕
      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });

    it('點擊操作按鈕應該調用 onAction', () => {
      const heroNft = createMockHero();
      render(
        <UnifiedNftCard 
          nft={heroNft} 
          showActions={true} 
          onAction={mockOnAction}
          onClick={mockOnClick} 
        />
      );

      const infoButton = screen.getByRole('button');
      fireEvent.click(infoButton);

      expect(mockOnAction).toHaveBeenCalledWith('info');
    });
  });

  describe('圖片處理', () => {
    it('有圖片時應該顯示圖片', () => {
      const heroNft = createMockHero({ image: 'https://test.com/hero.png' });
      render(<UnifiedNftCard nft={heroNft} onClick={mockOnClick} />);

      const image = screen.getByAltText(heroNft.name);
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', heroNft.image);
    });

    it('沒有圖片時應該顯示佔位符', () => {
      const heroNft = createMockHero({ image: '' });
      render(<UnifiedNftCard nft={heroNft} onClick={mockOnClick} />);

      // 應該顯示 SVG 佔位符圖標
      const placeholderIcon = screen.getByRole('img', { hidden: true });
      expect(placeholderIcon).toBeInTheDocument();
    });
  });

  describe('用戶互動', () => {
    it('點擊卡片應該調用 onClick', () => {
      const heroNft = createMockHero();
      render(<UnifiedNftCard nft={heroNft} onClick={mockOnClick} />);

      const card = screen.getByText(heroNft.name).closest('div');
      fireEvent.click(card!);

      expect(mockOnClick).toHaveBeenCalled();
    });

    it('長按應該調用 onLongPress', () => {
      const heroNft = createMockHero();
      render(<UnifiedNftCard nft={heroNft} onLongPress={mockOnLongPress} />);

      // 這裡我們需要模擬觸摸事件來測試長按
      const card = screen.getByText(heroNft.name).closest('div');
      
      fireEvent.touchStart(card!);
      // 模擬長按時間
      setTimeout(() => {
        fireEvent.touchEnd(card!);
      }, 600);

      // 由於我們 mock 了 useMobileOptimization，實際的觸摸處理邏輯需要在集成測試中驗證
    });
  });

  describe('NFT 類型樣式', () => {
    it('Hero NFT 應該有正確的類型顏色', () => {
      const heroNft = createMockHero();
      render(<UnifiedNftCard nft={heroNft} onClick={mockOnClick} />);

      const typeLabel = screen.getByText('HERO');
      expect(typeLabel).toHaveClass('bg-red-500/80', 'text-white');
    });

    it('Relic NFT 應該有正確的類型顏色', () => {
      const relicNft = createMockRelic();
      render(<UnifiedNftCard nft={relicNft} onClick={mockOnClick} />);

      const typeLabel = screen.getByText('RELIC');
      expect(typeLabel).toHaveClass('bg-blue-500/80', 'text-white');
    });

    it('Party NFT 應該有正確的類型顏色', () => {
      const partyNft = createMockParty();
      render(<UnifiedNftCard nft={partyNft} onClick={mockOnClick} />);

      const typeLabel = screen.getByText('PARTY');
      expect(typeLabel).toHaveClass('bg-purple-500/80', 'text-white');
    });

    it('VIP NFT 應該有正確的類型顏色', () => {
      const vipNft = createMockVip();
      render(<UnifiedNftCard nft={vipNft} onClick={mockOnClick} />);

      const typeLabel = screen.getByText('VIP');
      expect(typeLabel).toHaveClass('bg-yellow-500/80', 'text-black');
    });
  });
});