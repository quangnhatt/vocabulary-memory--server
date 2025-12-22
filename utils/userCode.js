const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateCode() {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export async function generateUniqueUserCode(db) {
  while (true) {
    const code = generateCode();
    const { rowCount } = await db.query(
      'SELECT 1 FROM users WHERE user_code = $1',
      [code]
    );
    if (rowCount === 0) {
      return code;
    }
  }
}