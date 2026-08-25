'use client';

import { InfoIcon } from '@/components/shared/icons';
import {
  ProfileFormApi,
  calculateAge,
} from '@/components/auth/hooks/useProfileForm';

const INPUT_CLASS =
  'w-full py-2 px-3 rounded-lg font-mono text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white transition-colors disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 [color-scheme:dark]';

const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Sedentary (Little to no exercise)' },
  { value: 1.375, label: 'Lightly Active (1-3 days/week)' },
  { value: 1.55, label: 'Moderately Active (3-5 days/week)' },
  { value: 1.725, label: 'Very Active (6-7 days/week)' },
];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
      {children}
    </h3>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-mono text-neutral-400 mb-1 flex justify-between">
        <span>{label}</span>
        {hint && <span className="text-neutral-500">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

/** Numeric input that maps an empty string to '' rather than 0. */
function NumberField({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: React.ReactNode;
  value: number | '';
  onChange: (value: number | '') => void;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="number"
        step="0.1"
        value={value}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(e.target.value === '' ? '' : Number(e.target.value))
        }
        className={INPUT_CLASS}
      />
    </Field>
  );
}

export function PersonalDetailsSection({
  form,
  children,
}: {
  form: ProfileFormApi;
  children?: React.ReactNode;
}) {
  const { profile, update } = form;

  return (
    <div className="space-y-3">
      <SectionHeading>Personal Details</SectionHeading>

      {children}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <Field label="First Name">
          <input
            type="text"
            value={profile.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Last Name">
          <input
            type="text"
            value={profile.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>
      </div>
    </div>
  );
}

export function PhysicalMetricsSection({ form }: { form: ProfileFormApi }) {
  const { profile, update, unitSystem, changeUnitSystem } = form;
  const isMetric = unitSystem === 'metric';

  return (
    <div className="space-y-3 pt-2 border-t border-neutral-800">
      <SectionHeading>Physical Metrics</SectionHeading>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NumberField
          label={`Weight (${isMetric ? 'kg' : 'lbs'})`}
          value={profile.weight}
          onChange={(value) => update('weight', value)}
        />
        <NumberField
          label={`Height (${isMetric ? 'cm' : 'in'})`}
          value={profile.height}
          onChange={(value) => update('height', value)}
        />
        <NumberField
          label="Body Fat %"
          hint="Optional"
          placeholder="e.g. 15"
          value={profile.bodyFat}
          onChange={(value) => update('bodyFat', value)}
        />
        <Field
          label="Birth Date"
          hint={
            profile.birthDate ? `Age: ${calculateAge(profile.birthDate)}` : null
          }
        >
          <input
            type="date"
            value={profile.birthDate}
            onChange={(e) => update('birthDate', e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Sex">
          <select
            value={profile.gender}
            onChange={(e) =>
              update('gender', e.target.value as 'male' | 'female')
            }
            className={INPUT_CLASS}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </Field>
      </div>

      <div className="pt-2">
        <Field label="Measurement System">
          <select
            value={unitSystem}
            onChange={(e) =>
              changeUnitSystem(e.target.value as 'metric' | 'imperial')
            }
            className={INPUT_CLASS}
          >
            <option value="metric">Metric (kg, cm)</option>
            <option value="imperial">Imperial (lbs, in)</option>
          </select>
        </Field>
      </div>
    </div>
  );
}

export function ActivityGoalsSection({ form }: { form: ProfileFormApi }) {
  const { profile, update } = form;
  const showBulkWarning =
    profile.activityLevel === 1.2 && profile.goalType === 'bulk';

  return (
    <div className="space-y-3 pt-2 border-t border-neutral-800 pb-2">
      <SectionHeading>Goals &amp; Activity</SectionHeading>

      <Field label="Activity Level">
        <select
          value={profile.activityLevel}
          onChange={(e) => update('activityLevel', Number(e.target.value))}
          className={INPUT_CLASS}
        >
          {ACTIVITY_LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </Field>

      {showBulkWarning && (
        <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/50 rounded-lg flex items-start gap-2 text-amber-400 text-xs font-mono animate-in fade-in">
          <InfoIcon className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            <strong>Tip:</strong> Your current goal is{' '}
            <strong>Muscle Gain</strong>. A sedentary activity level may lead to
            excess fat gain instead of muscle.
          </p>
        </div>
      )}
    </div>
  );
}
