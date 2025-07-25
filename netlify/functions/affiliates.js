import { getStore } from '@netlify/blobs';
import { neon } from '@netlify/neon';
import { parse } from 'parse-multipart-data';
import { v4 as uuidv4 } from 'uuid';

export const handler = async (event) => {
  const method = event.httpMethod;
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  // ensure table
  await sql`CREATE TABLE IF NOT EXISTS affiliates (id SERIAL PRIMARY KEY, title TEXT, image_url TEXT)`;

  if (method === 'POST') {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return { statusCode: 400, body: 'Content-Type must be multipart/form-data' };
    }
    const boundary = contentType.split('boundary=')[1];
    const bodyBuffer = Buffer.from(event.body, 'base64');
    const parts = parse(bodyBuffer, boundary);
    const titlePart = parts.find((p) => p.name === 'title');
    const filePart = parts.find((p) => p.filename);
    const title = titlePart ? titlePart.data.toString() : '';
    let imageUrl = null;
    if (filePart) {
      const fileBuffer = filePart.data;
      const ext = filePart.filename.split('.').pop();
      const uploads = getStore('affiliates-images');
      const key = `${uuidv4()}.${ext}`;
      await uploads.set(key, fileBuffer, {
        metadata: { filename: filePart.filename }
      });
      imageUrl = await uploads.get(key).then((res) => res.url);
    }
    const inserted = await sql`INSERT INTO affiliates (title, image_url) VALUES (${title}, ${imageUrl}) RETURNING *`;
    return {
      statusCode: 200,
      body: JSON.stringify(inserted[0])
    };
  }

  if (method === 'GET') {
    const rows = await sql`SELECT * FROM affiliates ORDER BY id DESC`;
    return { statusCode: 200, body: JSON.stringify(rows) };
  }

  if (method === 'PUT') {
    const body = JSON.parse(event.body);
    const { id, title, imageUrl } = body;
    if (imageUrl) {
      await sql`UPDATE affiliates SET title=${title}, image_url=${imageUrl} WHERE id=${id}`;
    } else {
      await sql`UPDATE affiliates SET title=${title} WHERE id=${id}`;
    }
    return { statusCode: 200, body: JSON.stringify({ message: 'updated' }) };
  }

  if (method === 'DELETE') {
    const body = JSON.parse(event.body);
    const { id } = body;
    await sql`DELETE FROM affiliates WHERE id=${id}`;
    return { statusCode: 200, body: JSON.stringify({ message: 'deleted' }) };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
