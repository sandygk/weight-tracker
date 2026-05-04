interface Option<T extends string> {
  id: T;
  label: string;
  Icon?: React.ElementType;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export default function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 w-fit">
      {options.map(({ id, label, Icon }, i) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-colors ${
            i > 0 ? 'border-l border-gray-200 dark:border-gray-600' : ''
          } ${
            value === id
              ? 'bg-blue-500 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          {Icon && <Icon size={14} />}
          {label}
        </button>
      ))}
    </div>
  );
}
