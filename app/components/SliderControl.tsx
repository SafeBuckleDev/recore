interface SliderControlProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
}

export default function SliderControl({
  id,
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: SliderControlProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-zinc-700">
          {label}
        </label>
        <span className="font-mono text-sm text-zinc-900">{displayValue}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-zinc-900"
      />
    </div>
  );
}
