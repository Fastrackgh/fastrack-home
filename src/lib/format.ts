/** "1st", "2nd", "3rd", "4th", "11th", "21st". */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  return `${n}${teen ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`;
}

/** A position, with "=" when another pupil shares it, as printed reports show: "2nd=". */
export const place = (n: number, tied?: boolean) => `${ordinal(n)}${tied ? '=' : ''}`;
