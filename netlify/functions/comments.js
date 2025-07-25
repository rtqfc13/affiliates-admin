import { neon } from '@netlify/neon';

export const handler = async (event) => {
  const method = event.httpMethod;
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  // ensure table exists
  await sql`CREATE TABLE IF NOT EXISTS comments (id SERIAL PRIMARY KEY, affiliate_id INTEGER, content TEXT, created_at TIMESTAMP DEFAULT NOW())`;
  if (method === 'POST') {
    const { affiliate_id, content } = JSON.parse(event.body);
    const inserted = await sql`INSERT INTO comments (affiliate_id, content) VALUES (${affiliate_id}, ${content}) RETURNING *`;
    return { statusCode: 200, body: JSON.stringify(inserted[0]) };
  }
  if (method === 'GET') {
    const params = event.queryStringParameters || {};
    const affiliateId = params.affiliate_id || params.affiliateId || params.id;
    let rows;
    if (affiliateId) {
      rows = await sql`SELECT * FROM comments WHERE affiliate_id=${affiliateId} ORDER BY id ASC`;
    } else {
      rows = await sql`SELECT * FROM comments ORDER BY id ASC`;
    }
    return { statusCode: 200, body: JSON.stringify(rows) };
  }
  if (method === 'PUT') {
    const { id, content } = JSON.parse(event.body);
    await sql`UPDATE comments SET content=${content} WHERE id=${id}`;
    return { statusCode: 200, body: JSON.stringify({ message: 'updated' }) };
  }
  if (method === 'DELETE') {
    const { id } = JSON.parse(event.body);
    await sql`DELETE FROM comments WHERE id=${id}`;
    return { statusCode: 200, body: JSON.stringify({ message: 'deleted' }) };
  }
  return { statusCode: 405, body: 'Method Not Allowed' };
};
