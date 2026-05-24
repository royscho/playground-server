import { query } from '../../infra/db/mysql';
import { User, UserRow } from './schemas';

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    isAdmin: row.is_admin === 1,
    createdAt: row.created_at,
  };
}

export async function findByEmail(
  email: string,
): Promise<(User & { passwordHash: string }) | null> {
  const rows = await query<UserRow>(
    'SELECT * FROM users WHERE email = ? LIMIT 1',
    [email],
  );
  if (!rows[0]) return null;
  return { ...rowToUser(rows[0]), passwordHash: rows[0].password_hash };
}

export async function findById(id: number): Promise<User | null> {
  const rows = await query<UserRow>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  name: string;
}): Promise<User> {
  await query(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
    [data.email, data.passwordHash, data.name],
  );
  const user = await findByEmail(data.email);
  if (!user) throw new Error('User creation failed');
  return user;
}
