import { useForm, type UseFormProps, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';

/**
 * Project-wide form hook: react-hook-form + Zod, blur-mode by default.
 * Forms throughout the app should reach for this instead of raw useForm.
 */
export function useFormX<TSchema extends ZodType, TValues extends FieldValues = FieldValues>(
  schema: TSchema,
  options?: Omit<UseFormProps<TValues>, 'resolver'>,
) {
  return useForm<TValues>({
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    resolver: zodResolver(schema as unknown as never) as never,
    ...options,
  });
}
