import React from 'react';

/**
 * @fileoverview
 * 這是一個集中的圖示庫，將所有在應用程式中使用的 SVG 圖示都定義為 React 元件。
 * 這樣做可以方便地在任何地方重用它們，並確保視覺風格的一致性。
 */

type IconProps = React.SVGProps<SVGSVGElement>;

export const Icons = {
  Hero: (props: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
  Relic: (props: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m3.29 3.29 9.42 9.42a2 2 0 0 1 0 2.83L6.17 22A2 2 0 0 1 3.34 19.17l9.42-9.42"></path><path d="m14.12 14.12 2.83 2.83a2 2 0 0 0 2.83 0l2.83-2.83a2 2 0 0 0 0-2.83l-2.83-2.83a2 2 0 0 0-2.83 0l-2.83 2.83"></path><path d="m3.29 19.17 2.83-2.83"></path><path d="m19.17 3.29-2.83 2.83"></path></svg>,
  Party: (props: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Vip: (props: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>,
  Mint: (props: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M12 18v-6"></path><path d="m9 15 3-3 3 3"></path></svg>,
  Altar: (props: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 13.4-4.5 4.5"></path><path d="m12 13.4 4.5 4.5"></path><path d="m12 13.4 4.5-4.5"></path><path d="m12 13.4-4.5-4.5"></path><path d="m21 12-2.35 2.35"></path><path d="m3 12 2.35 2.35"></path><path d="m12 3 2.35 2.35"></path><path d="m12 21-2.35-2.35"></path><circle cx="12" cy="12" r="9"></circle></svg>,
  Assets: (props: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="18" height="18" x="3" y="3" rx="2"></rect><rect width="8" height="8" x="7" y="7" rx="2"></rect><path d="M3 14h7"></path><path d="M14 3v7"></path><path d="M14 14h7"></path><path d="M10 21v-7"></path></svg>,
  Dungeon: (props: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"></path><path d="M15.5 15.5 12 12"></path><path d="M12 2v4"></path><path d="M12 18v4"></path><path d="M22 12h-4"></path><path d="M6 12H2"></path></svg>,
  ExternalLink: (props: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>,
  ArrowRight: (props: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>,
  // 【新增】將 HistoryIcon 補充回來
  History: (props: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>,
};
