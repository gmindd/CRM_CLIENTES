#!/usr/bin/env node
/**
 * Gera o hash bcrypt da password de acesso ao CRM.
 *
 *   npm run hash-password -- "a-minha-password"
 *
 * Copie o resultado para APP_PASSWORD_HASH no ficheiro .env.
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import readline from "node:readline/promises";

const argumento = process.argv[2];

let password = argumento;
if (!password) {
  const io = readline.createInterface({ input: process.stdin, output: process.stdout });
  password = await io.question("Password: ");
  io.close();
}

if (!password || password.length < 8) {
  console.error("\nA password deve ter pelo menos 8 caracteres.");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);

console.log("\nCole estas linhas no seu .env:\n");
console.log(`APP_PASSWORD_HASH='${hash}'`);
console.log(`SESSION_SECRET='${randomBytes(48).toString("base64")}'`);
console.log();
