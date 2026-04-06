import mysql from "mysql2/promise";
import process from "node:process";
import { randomBytes, scryptSync } from "node:crypto";

function parseArgs(argv) {
  const args = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      continue;
    }

    args.set(value.slice(2), argv[index + 1]);
    index += 1;
  }

  return args;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const email = args.get("email");
  const name = args.get("name");
  const password = args.get("password");
  const officeId = args.get("officeId");

  if (!email || !name || !password) {
    throw new Error("Usage: npm run create-admin -- --email admin@example.com --name 관리자 --password StrongPass123! --officeId 1");
  }

  const { DB_HOST, DB_PORT = "3306", DB_NAME, DB_USER, DB_PASSWORD } = process.env;

  if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
    throw new Error("DB 환경 변수가 설정되어 있어야 합니다.");
  }

  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    charset: "utf8mb4",
  });

  try {
    const passwordHash = hashPassword(password);

    await connection.execute(
      `
        INSERT INTO admins (
          office_id,
          email,
          password_hash,
          name
        ) VALUES (?, ?, ?, ?)
      `,
      [officeId ? Number(officeId) : null, email, passwordHash, name],
    );

    console.log(`Admin created: ${email}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

