/**
 * Props for any input where someone types an email address. Phones otherwise
 * capitalise the first letter or "correct" the address (QA-201). The backend
 * lower-cases and trims emails, so the client sends what was typed.
 */
export const emailInputProps = {
  type: 'email',
  inputMode: 'email',
  autoCapitalize: 'none',
  autoCorrect: 'off',
  spellCheck: false,
} as const;
