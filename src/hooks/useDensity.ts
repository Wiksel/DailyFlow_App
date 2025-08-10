import { useUI } from '../contexts/UIContext';

export const useDensity = () => {
  const { density } = useUI();
  const isCompact = density === 'compact';
  const scale = isCompact ? 0.9 : 1;
  return { isCompact, scale };
};


