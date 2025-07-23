import { MongoClient } from 'mongodb';

export const connectToDb = async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const database = client.db(process.env.MONGODB_NAME);

  return { database, client };
}
