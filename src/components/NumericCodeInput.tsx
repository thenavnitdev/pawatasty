import { useRef, useEffect } from 'react';

interface NumericCodeInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function NumericCodeInput({ value, onChange, disabled = false, autoFocus = false }: NumericCodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, inputValue: string) => {
    if (!/^\d*$/.test(inputValue)) {
      return;
    }

    if (inputValue.length > 1) {
      inputValue = inputValue[0];
    }

    const newValue = [...value];
    newValue[index] = inputValue;
    onChange(newValue);

    if (inputValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '');

    if (pastedData.length === 6) {
      const newValue = pastedData.split('');
      onChange(newValue);
      inputRefs.current[5]?.focus();
    }
  };

  return (
    <div className="flex items-center justify-center gap-3">
      {value.slice(0, 3).map((digit, index) => (
        <input
          key={index}
          ref={el => inputRefs.current[index] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={e => handleChange(index, e.target.value)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-10 h-12 text-center text-2xl font-semibold bg-transparent border-0 border-b-2 border-gray-300 focus:border-orange-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ caretColor: 'transparent' }}
        />
      ))}

      <span className="text-2xl font-bold text-gray-400 px-2">–</span>

      {value.slice(3, 6).map((digit, index) => (
        <input
          key={index + 3}
          ref={el => inputRefs.current[index + 3] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={e => handleChange(index + 3, e.target.value)}
          onKeyDown={e => handleKeyDown(index + 3, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-10 h-12 text-center text-2xl font-semibold bg-transparent border-0 border-b-2 border-gray-300 focus:border-orange-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ caretColor: 'transparent' }}
        />
      ))}
    </div>
  );
}
