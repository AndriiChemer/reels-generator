type FieldProps = {
  defaultValue?: string;
  error?: string;
  hint?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
};

const inputClassName =
  "w-full rounded-md border border-[var(--border)] bg-white px-3 py-2.5 text-base outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-2 focus:ring-teal-100";

export function TextField({
  defaultValue,
  error,
  hint,
  label,
  name,
  placeholder,
  required,
}: FieldProps) {
  const fieldId = `field-${name}`;

  return (
    <label className="grid gap-1.5" htmlFor={fieldId}>
      <FieldLabel hint={hint} label={label} />
      <input
        aria-invalid={Boolean(error)}
        className={inputClassName}
        defaultValue={defaultValue}
        id={fieldId}
        name={name}
        placeholder={placeholder}
        required={required}
        type="text"
      />
      <FieldError error={error} />
    </label>
  );
}

export function TextAreaField({
  defaultValue,
  error,
  hint,
  label,
  name,
  placeholder,
  required,
  rows = 3,
}: FieldProps & { rows?: number }) {
  const fieldId = `field-${name}`;

  return (
    <label className="grid gap-1.5" htmlFor={fieldId}>
      <FieldLabel hint={hint} label={label} />
      <textarea
        aria-invalid={Boolean(error)}
        className={`${inputClassName} resize-y leading-6`}
        defaultValue={defaultValue}
        id={fieldId}
        name={name}
        placeholder={placeholder}
        required={required}
        rows={rows}
      />
      <FieldError error={error} />
    </label>
  );
}

export function SelectField({
  defaultValue,
  hint,
  label,
  name,
  options,
}: Pick<FieldProps, "defaultValue" | "hint" | "label" | "name"> & {
  options: Array<{ value: string; label: string }>;
}) {
  const fieldId = `field-${name}`;

  return (
    <label className="grid gap-1.5" htmlFor={fieldId}>
      <FieldLabel hint={hint} label={label} />
      <select className={inputClassName} defaultValue={defaultValue} id={fieldId} name={name}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FormStatus({
  message,
  status,
}: {
  message: string;
  status: "idle" | "success" | "error";
}) {
  if (!message) {
    return null;
  }

  return (
    <p
      aria-live="polite"
      className={
        status === "success"
          ? "text-sm font-medium text-[var(--accent-strong)]"
          : "text-sm font-medium text-red-700"
      }
    >
      {message}
    </p>
  );
}

function FieldLabel({ hint, label }: { hint?: string; label: string }) {
  return (
    <span className="text-sm font-medium text-[var(--foreground)]">
      {label}
      {hint ? (
        <span className="ml-2 font-normal text-[var(--muted)]">{hint}</span>
      ) : null}
    </span>
  );
}

function FieldError({ error }: { error?: string }) {
  return error ? <span className="text-sm text-red-700">{error}</span> : null;
}
