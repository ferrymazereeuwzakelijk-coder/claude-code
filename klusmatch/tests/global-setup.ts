import { migrate } from '../scripts/migrate';

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgres://klusmatch:klusmatch@localhost:5432/klusmatch_test';
  await migrate(url, () => {});
}
