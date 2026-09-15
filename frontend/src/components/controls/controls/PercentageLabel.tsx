import { getHeatColor } from './heatColor';

type PercentageLabelProps = {
  won: number;
  lost: number;
  decimals?: number;
  heat?: boolean;
};

export const PercentageLabel = ({ won, lost, decimals = 0, heat = false }: PercentageLabelProps) => {
  if (!won && !lost) {
    return null;
  }

  let percentage = ((won / (lost + won)) * 100).toFixed(decimals);
  if (decimals && percentage.substr(percentage.indexOf('.')) === '.00') {
    percentage = percentage.substr(0, percentage.indexOf('.'));
  }

  const label = percentage.replace('.', ',') + '%';
  if (!heat) {
    return <div className="pull-right">{label}</div>;
  }

  const color = getHeatColor(won, lost);
  return (
    <div className="pull-right">
      <span style={color ? { backgroundColor: color.bg, color: color.fg, padding: '2px 6px', borderRadius: 3 } : undefined}>{label}</span>
    </div>
  );
};
