"use server";

import { MongoClient }  from 'mongodb';
import { NextResponse } from 'next/server'

/** Just pushing new questions to DB for now */
export async function POST(req){
  if (req.method === "POST") {
    const client = new MongoClient(process.env.MONGODB_URI);

    try {
      await client.connect();
      const database =  client.db(process.env.MONGODB_NAME);
      const collection =  database.collection("Questions");
    } catch (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    } finally {
      await client.close();
    }
  } else {
    NextResponse.json({ message: "Method not allowed!" });
  }
}
