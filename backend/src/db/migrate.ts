import { readFile } from 'node:fs/promises';
import { db } from './client.js';
import { hashPassword } from '../lib/security.js';

const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
await db.query(sql);
const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password=process.env.ADMIN_PASSWORD;
if(email&&password){
  const existing=await db.query<{id:string}>('SELECT id FROM users WHERE email=$1',[email]);
  if(existing.rowCount) { const values=process.env.ADMIN_RESET_PASSWORD==='true'?[await hashPassword(password),existing.rows[0].id]:[existing.rows[0].id]; await db.query(process.env.ADMIN_RESET_PASSWORD==='true'?"UPDATE users SET role='admin',is_active=true,password_hash=$1 WHERE id=$2":"UPDATE users SET role='admin',is_active=true WHERE id=$1",values); }
  else await db.query("INSERT INTO users (email,password_hash,full_name,role) VALUES ($1,$2,'PICSOME Admin','admin')",[email,await hashPassword(password)]);
}
await db.end();
console.log('Database schema applied.');