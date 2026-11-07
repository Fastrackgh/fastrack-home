// Checks that a production build refuses to start without the API address,
// and that development and other phases don't need it (docs/deployment.md).
// Run: pnpm test:settings
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} from 'next/constants.js';
import { checkSettings } from '../next.config.mjs';

let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const error = (phase, env) => {
  try {
    checkSettings(phase, env);
    return null;
  } catch (err) {
    return err.message;
  }
};

const missing = error(PHASE_PRODUCTION_BUILD, {});
check(
  'production build without NEXT_PUBLIC_API_URL fails',
  /NEXT_PUBLIC_API_URL is not set/.test(missing ?? ''),
  missing ?? 'no error',
);
check(
  'an empty value fails too',
  error(PHASE_PRODUCTION_BUILD, { NEXT_PUBLIC_API_URL: '' }) !== null,
);
check(
  'production build with it passes',
  error(PHASE_PRODUCTION_BUILD, { NEXT_PUBLIC_API_URL: 'https://api.example.com/api' }) === null,
);
check(
  'an address without a scheme fails',
  /not a full address/.test(
    error(PHASE_PRODUCTION_BUILD, { NEXT_PUBLIC_API_URL: 'api.example.com/api' }) ?? '',
  ),
);
check(
  'a bad NEXT_PUBLIC_SITE_URL fails',
  /NEXT_PUBLIC_SITE_URL/.test(
    error(PHASE_PRODUCTION_BUILD, {
      NEXT_PUBLIC_API_URL: 'https://api.example.com/api',
      NEXT_PUBLIC_SITE_URL: 'example.com',
    }) ?? '',
  ),
);
check('development needs no setting', error(PHASE_DEVELOPMENT_SERVER, {}) === null);
check(
  'next start needs no setting (it is in the build)',
  error(PHASE_PRODUCTION_SERVER, {}) === null,
);

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
