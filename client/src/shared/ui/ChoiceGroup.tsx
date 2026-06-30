type ChoiceGroupProps = {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
};

export function ChoiceGroup({ label, options, value, onChange, multiple = true }: ChoiceGroupProps) {
  function toggle(option: string) {
    if (!multiple) {
      onChange(value.includes(option) ? [] : [option]);
      return;
    }

    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  }

  return (
    <fieldset className="choice-group">
      <legend>{label}</legend>
      <div className="choice-list">
        {options.map((option) => (
          <label className="choice" key={option}>
            <input
              type={multiple ? "checkbox" : "radio"}
              checked={value.includes(option)}
              onChange={() => toggle(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
