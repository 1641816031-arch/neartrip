import React from 'react';

interface WaterBottleProps {
  percent: number;      // 0-100
  color: string;        // 填充颜色
  label: string;        // 显示文字
  size?: number;        // 默认 40
}

const WaterBottle: React.FC<WaterBottleProps> = ({ percent, color, label, size = 40 }) => {
  const width = size;
  const height = size * 1.6;
  const neckWidth = width * 0.4;
  const neckHeight = height * 0.15;
  const bodyHeight = height * 0.85;
  const bodyWidth = width;
  const cornerRadius = width * 0.15;
  
  // 水位高度（从底部往上）
  const fillHeight = (bodyHeight - cornerRadius * 2) * (percent / 100);
  const fillY = bodyHeight - cornerRadius - fillHeight;
  
  // 瓶身路径（圆角矩形）
  const bodyPath = `
    M ${(bodyWidth - neckWidth) / 2} ${neckHeight}
    L ${(bodyWidth - neckWidth) / 2} 0
    L ${(bodyWidth + neckWidth) / 2} 0
    L ${(bodyWidth + neckWidth) / 2} ${neckHeight}
    L ${bodyWidth - cornerRadius} ${neckHeight}
    Q ${bodyWidth} ${neckHeight} ${bodyWidth} ${neckHeight + cornerRadius}
    L ${bodyWidth} ${bodyHeight - cornerRadius}
    Q ${bodyWidth} ${bodyHeight} ${bodyWidth - cornerRadius} ${bodyHeight}
    L ${cornerRadius} ${bodyHeight}
    Q 0 ${bodyHeight} 0 ${bodyHeight - cornerRadius}
    L 0 ${neckHeight + cornerRadius}
    Q 0 ${neckHeight} ${cornerRadius} ${neckHeight}
    Z
  `;

  // 裁剪路径用于水位
  const clipPathId = `bottle-clip-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <clipPath id={clipPathId}>
            <path d={bodyPath} />
          </clipPath>
        </defs>
        
        {/* 瓶身背景 */}
        <path 
          d={bodyPath} 
          fill="var(--c-border-light)" 
          stroke="var(--c-border)" 
          strokeWidth="1"
        />
        
        {/* 水位填充 */}
        {percent > 0 && (
          <rect
            x="0"
            y={fillY + neckHeight}
            width={bodyWidth}
            height={fillHeight + cornerRadius}
            fill={color}
            clipPath={`url(#${clipPathId})`}
            opacity={0.9}
          />
        )}
        
        {/* 瓶身边框高亮 */}
        <path 
          d={bodyPath} 
          fill="none" 
          stroke="var(--c-border)" 
          strokeWidth="1.5"
          opacity={0.5}
        />
      </svg>
      
      <span 
        className="text-[10px] font-medium leading-tight text-center"
        style={{ color: percent === 0 ? 'var(--c-text-muted)' : color, maxWidth: width * 1.5 }}
      >
        {label}
      </span>
    </div>
  );
};

export default WaterBottle;